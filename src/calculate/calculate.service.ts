import 'dotenv/config';
import { BinanceMarketData } from '../schemas/binance.data.schema';
import { CryptoCurrency } from '../schemas/crypto.currency.schema';
import { TgSignal, SignalType } from '../schemas/tg.messages.schema';

import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable, Logger } from '@nestjs/common';
import { AchievedTake, Trade, TradeStatus } from '../schemas/trades.schema';
import { GenerateReportDto } from 'src/dto/generateReport.dto';

@Injectable()
export class CalculateService {
  private readonly logger = new Logger(CalculateService.name);
  constructor(
    @InjectModel(TgSignal.name)
    private tgSignal: Model<TgSignal>,
    @InjectModel(CryptoCurrency.name)
    private cryptoCurrency: Model<CryptoCurrency>,
    @InjectModel(BinanceMarketData.name)
    private binanceMarketData: Model<BinanceMarketData>,
    @InjectModel(Trade.name)
    private trade: Model<Trade>,
  ) {}

  async updateOrCreateTrade(tradesData: Trade[]): Promise<void> {
    const operations = tradesData.map((trade) => ({
      updateOne: {
        filter: { signalId: trade.signalId },
        update: trade,
        upsert: true,
      },
    }));
    await this.trade.bulkWrite(operations);
  }

  async runCalculation(generateReportDto: GenerateReportDto) {
    const { startDate, endDate, tgChannelId } = generateReportDto;
    const startTimestamp = new Date(startDate).getTime();
    const endTimestamp = new Date(endDate).getTime();

    const tradesToSave = [];

    const signals = await this.tgSignal.find({
      tgChannelId: new Types.ObjectId(tgChannelId),
      pair: { $exists: true },
      postTimestamp: {
        $gte: startTimestamp,
        $lt: endTimestamp,
      },
    });

    for (const signal of signals) {
      const currency = await this.cryptoCurrency.findOne({
        symbol: signal.pair,
      });
      if (!currency) continue;

      const candles = await this.binanceMarketData.find({
        openTime: {
          $gte: signal.postTimestamp,
          $lt: endTimestamp,
        },
        currencyId: currency._id,
      });
      const trade = await this.calculateProfitability(signal, candles);
      tradesToSave.push(trade);
    }
    await this.updateOrCreateTrade(tradesToSave);
  }

  async calculateProfitability(
    signal: TgSignal,
    candles: BinanceMarketData[],
  ): Promise<Trade> {
    const {
      _id,
      tgChannelId,
      entryTargets,
      profitTargets: takeProfits,
      stop: stopLoss,
      type,
      postTimestamp,
    } = signal;

    const trade = new Trade();
    trade.signalId = new Types.ObjectId(_id);
    trade.tgChannelId = tgChannelId;
    trade.status = TradeStatus.LIMIT;

    const getAverage = (numbers: number[]) =>
      numbers.reduce((acc, number) => acc + number, 0) / numbers.length;

    const entryPrice = getAverage(entryTargets); // avarage entry price
    let percentageClosed = 1.0 / takeProfits.length; // percentage the same acrooss all takes
    let totalProfitPercentage = 0;
    let remainingPosition = 1.0; // 100% of position
    let hitStopLoss = false;
    let achievedTakeProfits = new Array(takeProfits.length).fill(false);
    let adjustedStopLoss = stopLoss;

    for (let candle of candles) {
      const { _id, openTime, high, low } = candle;
      if (
        (type == SignalType.LONG && entryPrice >= high) ||
        (type == SignalType.SHORT && entryPrice <= low)
      ) {
        trade.status = TradeStatus.OPEN;
      }
      if (type === SignalType.LONG) {
        if (low <= adjustedStopLoss) {
          hitStopLoss = true;
          break;
        }

        for (let i = 0; i < takeProfits.length; i++) {
          if (!achievedTakeProfits[i] && high >= takeProfits[i]) {
            let profitPercentage =
              ((takeProfits[i] - entryPrice) / entryPrice) *
              100 *
              percentageClosed;
            totalProfitPercentage += profitPercentage;
            remainingPosition -= percentageClosed;
            achievedTakeProfits[i] = true;
            const newAchievedTake = new AchievedTake();
            newAchievedTake.candleId = _id;
            newAchievedTake.profitPercentage = profitPercentage;
            newAchievedTake.take = takeProfits[i];
            newAchievedTake.time = candle.openTime;
            newAchievedTake.percentageClosed = percentageClosed;

            if (!trade.achievedTakes) {
              trade.achievedTakes = [];
            }

            trade.achievedTakes.push(newAchievedTake);

            this.logger.log(
              `Take profit target ${i + 1} - ${takeProfits[i]} achieved on candle ID: ${_id} LONG, Post date ${new Date(postTimestamp)}, candle date ${new Date(openTime)} `,
            );

            if (i === 0) {
              adjustedStopLoss = entryPrice;
            }
          }
        }
      } else if (type === SignalType.SHORT) {
        if (high >= adjustedStopLoss) {
          hitStopLoss = true;
          break;
        }

        for (let i = 0; i < takeProfits.length; i++) {
          if (!achievedTakeProfits[i] && low <= takeProfits[i]) {
            let profitPercentage =
              ((entryPrice - takeProfits[i]) / entryPrice) *
              100 *
              percentageClosed;
            totalProfitPercentage += profitPercentage;
            remainingPosition -= percentageClosed;
            achievedTakeProfits[i] = true;

            const newAchievedTake = new AchievedTake();
            newAchievedTake.candleId = _id;
            newAchievedTake.profitPercentage = profitPercentage;
            newAchievedTake.take = takeProfits[i];
            newAchievedTake.time = candle.openTime;

            if (!trade.achievedTakes) {
              trade.achievedTakes = [];
            }

            trade.achievedTakes.push(newAchievedTake);

            this.logger.log(
              `Take profit target ${i + 1} - ${takeProfits[i]} achieved on candle ID: ${_id} SHORT, Post date ${new Date(postTimestamp)}, candle date ${new Date(openTime)} `,
            );

            if (i === 0) {
              adjustedStopLoss = entryPrice;
            }
          }
        }
      }
      if (achievedTakeProfits.every((val) => val)) {
        trade.status = TradeStatus.TAKE;
        break;
      }
    }

    if (hitStopLoss) {
      let stopLossPercentage: number;
      let isBreakeven = entryPrice === adjustedStopLoss;
      if (type === SignalType.LONG) {
        stopLossPercentage =
          ((adjustedStopLoss - entryPrice) / entryPrice) * 100;
      } else if (type === SignalType.SHORT) {
        stopLossPercentage =
          ((entryPrice - adjustedStopLoss) / entryPrice) * 100;
      }

      if (trade.status === TradeStatus.LIMIT) {
        trade.status = TradeStatus.STOP_BEFORE_ENTRY;
      } else if (isBreakeven) {
        trade.status = TradeStatus.BREAKEVEN;
      } else {
        trade.status = TradeStatus.STOP;
      }

      this.logger.log(
        `Stop loss target ${stopLoss} achieved on candle ID: ${new Date(postTimestamp)}} `,
      );
      if (entryPrice === adjustedStopLoss) {
        totalProfitPercentage = 0;
      } else {
        totalProfitPercentage += stopLossPercentage * remainingPosition;
      }
    }
    trade.adjustedStop = adjustedStopLoss || signal.stop;
    trade.totalProfitPercentage = totalProfitPercentage;
    return trade;
  }
}
