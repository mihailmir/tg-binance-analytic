import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Binance, { CandleChartInterval_LT } from 'binance-api-node';
import { BinanceMarketData } from 'src/schemas/binance.data.schema';

interface FetchCandlesParams {
  currency: any;
  startDate: string;
  endDate: string;
  interval?: CandleChartInterval_LT;
  limit?: number;
}

@Injectable()
export class BinanceService {
  private readonly logger = new Logger(BinanceService.name);

  constructor(
    @InjectModel(BinanceMarketData.name)
    private binanceMarketData: Model<BinanceMarketData>,
  ) {}

  private async *fetchCandlesGenerator({
    currency,
    startDate,
    endDate,
    interval = '1m',
    limit = 1000,
  }: FetchCandlesParams) {
    let startTime = new Date(startDate).getTime();
    const endTime = new Date(endDate).getTime();
    const client = Binance();

    try {
      while (startTime < endTime) {
        const candles = await client.futuresCandles({
          symbol: currency.symbol,
          interval: interval,
          limit: limit,
          startTime: startTime,
          endTime: endTime,
        });

        if (candles.length === 0) {
          break;
        }

        yield candles;

        // Set startTime to the last candle's open time + 1 to avoid duplicate entries
        startTime = candles[candles.length - 1]['openTime'] + 1;
      }
    } catch (error) {
      this.logger.error('Error fetching candles:', error);
      throw error;
    }
  }

  fetchAndInsertAllCandles = async ({
    currency,
    startDate,
    endDate,
    interval = '1m',
    limit = 1000,
  }: FetchCandlesParams) => {
    const candleGenerator = this.fetchCandlesGenerator({
      currency,
      startDate,
      endDate,
      interval,
      limit,
    });

    for await (const candles of candleGenerator) {
      const dataToInsert = candles.map((candle) => ({
        ...candle,
        currencyId: currency._id,
      })) as unknown as BinanceMarketData[];

      await this.updateOrCreateCandle(dataToInsert);
    }
  };

  updateOrCreateCandle = async (candles: BinanceMarketData[]) => {
    const chunk = candles.map((c) => ({
      updateOne: {
        filter: {
          openTime: c.openTime,
          currencyId: new Types.ObjectId(c.currencyId),
        },
        update: c,
        upsert: true,
      },
    }));

    try {
      await this.binanceMarketData.bulkWrite(chunk);
      this.logger.log(`Inserted batch of ${candles.length} candles`);
    } catch (error) {
      this.logger.error(`Error: ${error}`);
    }
  };
}
