import 'dotenv/config';
import { BinanceMarketData } from '../schemas/binance.data.schema';
import { CryptoCurrency } from '../schemas/crypto.currency.schema';
import { TgSignal, SignalType } from '../schemas/tg.messages.schema';

import { Model, Types, Cursor } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable, Logger } from '@nestjs/common';
import {
  AchievedEntry,
  AchievedStop,
  AchievedTake,
  Trade,
  TradeStatus,
} from '../schemas/trades.schema';
import { GenerateReportDto } from 'src/dto/generateReport.dto';

@Injectable()
export class CalculateService {
  private readonly logger = new Logger(CalculateService.name);
  private isBreakevenMode = false;

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

    const signals = this.tgSignal
      .find({
        tgChannelId: new Types.ObjectId(tgChannelId),
        pair: { $exists: true },
        postTimestamp: {
          $gte: startTimestamp,
          $lt: endTimestamp,
        },
      })
      .cursor() as unknown as Cursor<TgSignal>;

    for await (const signal of signals) {
      const currency = await this.cryptoCurrency.findOne({
        symbol: signal.pair,
      });
      if (!currency) continue;
      const reverseSignal = await this.findReverseSignal(signal, endTimestamp);
      const candles = this.binanceMarketData
        .find({
          openTime: {
            $gte: signal.postTimestamp,
            $lt: reverseSignal ? reverseSignal.postTimestamp : endTimestamp,
          },
          currencyId: currency._id,
        })
        .cursor() as unknown as Cursor<BinanceMarketData>;

      const trade = await this.calculateProfitability(
        signal,
        candles,
        currency,
        reverseSignal,
      );
      tradesToSave.push(trade);
    }
    await this.updateOrCreateTrade(tradesToSave);
  }

  calculateProfitPercentage = (
    entry: number,
    take: number,
    percentageClosed: number,
    type: SignalType,
    isLong: boolean,
  ): number => {
    if (isLong) {
      return ((take - entry) / entry) * 100 * percentageClosed;
    }
    return ((entry - take) / entry) * 100 * percentageClosed;
  };

  calculateRiskReward = (
    trade: Trade,
    stopLoss: number,
    isLong: boolean,
  ): number => {
    const sign = isLong ? 1 : -1;
    const achivedAvarageEntryPrice = this.getAverage(
      trade.achievedEntry.map((e: AchievedEntry) => e.entry),
    );
    const rr =
      ((sign * trade.totalProfitPercentage) /
        (achivedAvarageEntryPrice - stopLoss)) *
      achivedAvarageEntryPrice;
    return rr;
  };

  getAverage = (numbers: number[]) => {
    return numbers.reduce((acc, number) => acc + number, 0) / numbers.length;
  };

  findReverseSignal = async (
    signal: TgSignal,
    endTimestamp: number,
  ): Promise<TgSignal> => {
    const oppositeType =
      signal.type === SignalType.LONG ? SignalType.SHORT : SignalType.LONG;

    const reverseSignal = await this.tgSignal
      .findOne({
        tgChannelId: signal.tgChannelId,
        pair: signal.pair,
        type: oppositeType,
        postTimestamp: { $gt: signal.postTimestamp },
      })
      .sort({ postTimestamp: 1 })
      .exec();

    if (reverseSignal) {
      signal.reverseSignalId = reverseSignal._id;
      signal.reverseSignalDateTimestamp = reverseSignal.postTimestamp;
      await reverseSignal.save();
    }

    return reverseSignal;
  };

  processEntryPrices = (
    entryTargets: number[],
    achievedEntries: boolean[],
    trade: Trade,
    candle: BinanceMarketData,
    type: SignalType,
  ) => {
    const { _id, high, low, openTime } = candle;
    for (let i = 0; i < entryTargets.length; i++) {
      const entry = entryTargets[i];

      let conditionMet = false;
      if (type === SignalType.LONG) {
        conditionMet = entry >= high;
      } else if (type === SignalType.SHORT) {
        conditionMet = entry <= low;
      }

      if (conditionMet && !achievedEntries[i]) {
        console.log(entry, low, entry <= low);
        const newAchievedEntry = {
          candleId: _id,
          entry: entry,
          time: openTime,
        };

        if (!trade.achievedEntry) {
          trade.achievedEntry = [];
        }
        trade.achievedEntry.push(newAchievedEntry);
        trade.status = TradeStatus.OPEN;

        achievedEntries[i] = true;
      }
    }
  };

  async calculateProfitability(
    signal: TgSignal,
    candles: Cursor<BinanceMarketData>,
    currency: CryptoCurrency,
    reverseSignal: TgSignal,
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

    const isLong = type === SignalType.LONG;

    const trade = new Trade();
    trade.signalId = new Types.ObjectId(_id);
    trade.tgChannelId = tgChannelId;
    trade.status = TradeStatus.LIMIT;
    trade.currencyId = currency._id;

    let percentageClosed = 1.0 / takeProfits.length; // percentage the same acrooss all takes
    let entryPercentage = 1.0 / entryTargets.length; // percentage the same acrooss all takes

    let totalProfitPercentage = 0;
    let remainingPosition = 1.0; // 100% of position
    let hitStopLoss = false;
    let achievedTakeProfits: boolean[] = new Array(takeProfits.length).fill(
      false,
    );
    let achievedEntries: boolean[] = new Array(entryTargets.length).fill(false);

    let adjustedStopLoss = stopLoss;
    let lastCandleOpenTime = null;

    let isBreakeven = false;

    const everyTakesAchived = () => achievedTakeProfits.every((val) => val);
    const everyTakesNotAchived = () => achievedTakeProfits.every((val) => !val);

    for await (const candle of candles) {
      const { _id, openTime, high, low } = candle;
      lastCandleOpenTime = openTime;
      trade.startPrice = isLong ? high : low;

      if (everyTakesNotAchived()) {
        this.processEntryPrices(
          entryTargets,
          achievedEntries,
          trade,
          candle,
          type,
        );
      }

      if (isLong) {
        if (low <= adjustedStopLoss) {
          hitStopLoss = true;
          break;
        }

        for (let i = 0; i < takeProfits.length; i++) {
          if (!achievedTakeProfits[i] && high >= takeProfits[i]) {
            const entries = entryTargets.filter((_, index) => {
              return achievedEntries[index];
            });
            const avarageAchevedEntries = this.getAverage(entries);
            let profitPercentage =
              (this.calculateProfitPercentage(
                avarageAchevedEntries,
                takeProfits[i],
                percentageClosed,
                type,
                isLong,
              ) *
                entries.length) /
              entryTargets.length;

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

            if (this.isBreakevenMode && i === 0) {
              adjustedStopLoss = takeProfits[i];
              isBreakeven = true;
            }
          }
        }
      } else {
        if (high >= adjustedStopLoss) {
          hitStopLoss = true;
          break;
        }

        for (let i = 0; i < takeProfits.length; i++) {
          if (!achievedTakeProfits[i] && low <= takeProfits[i]) {
            const entries = entryTargets.filter((_, index) => {
              return achievedEntries[index];
            });
            const avarageAchevedEntries = this.getAverage(entries);
            let profitPercentage =
              (this.calculateProfitPercentage(
                avarageAchevedEntries,
                takeProfits[i],
                percentageClosed,
                type,
                isLong,
              ) *
                entries.length) /
              entryTargets.length;

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

            if (this.isBreakevenMode && i === 0) {
              adjustedStopLoss = takeProfits[i];
              isBreakeven = true;
            }
          }
        }
      }
      if (everyTakesAchived()) {
        trade.status = TradeStatus.TAKE;
        trade.closeDate = Date.now();
        break;
      }
    }

    if (hitStopLoss) {
      const newAchievedStop = new AchievedStop();

      newAchievedStop.candleId = _id;
      newAchievedStop.adjustedStop = adjustedStopLoss;
      newAchievedStop.stop = stopLoss;
      newAchievedStop.time = lastCandleOpenTime;

      trade.achievedStop = newAchievedStop;

      let stopLossPercentage: number = 0;

      if (isLong) {
        for (let i = 0; i < entryTargets.length; i++) {
          if (achievedEntries[i]) {
            const entryPrice = entryTargets[i];
            stopLossPercentage +=
              ((adjustedStopLoss - entryPrice) / entryPrice) *
              100 *
              entryPercentage;
          }
        }
      } else {
        for (let i = 0; i < entryTargets.length; i++) {
          if (achievedEntries[i]) {
            const entryPrice = entryTargets[i];
            stopLossPercentage +=
              ((entryPrice - adjustedStopLoss) / entryPrice) *
              100 *
              entryPercentage;
          }
        }
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

      totalProfitPercentage += stopLossPercentage * remainingPosition;
      trade.closeDate = Date.now();
    }

    if (
      reverseSignal &&
      // @ts-ignore
      (trade.status === TradeStatus.OPEN || trade.status === TradeStatus.LIMIT)
    ) {
      trade.status = TradeStatus.REVERSE;
    }
    trade.totalProfitPercentage = totalProfitPercentage;
    trade.riskReward = this.calculateRiskReward(trade, stopLoss, isLong);

    return trade;
  }
}
