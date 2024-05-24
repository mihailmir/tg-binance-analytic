import 'dotenv/config';
import Binance, { CandleChartInterval_LT } from 'binance-api-node';
import { Logger } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { CryptoCurrency } from '../schemas/crypto.currency.schema';
import { BinanceMarketData } from '../schemas/binance.data.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

interface FetchCandlesParams {
  currency: CryptoCurrency;
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

  fetchAllCandles = async ({
    currency,
    startDate,
    endDate,
    interval = '1m',
    limit = 1000,
  }: FetchCandlesParams) => {
    let allCandles = [];
    const client = Binance();
    let startTime = new Date(startDate).getTime(); // Convert startDate to timestamp
    const endTime = new Date(endDate).getTime(); // Convert endDate to timestamp

    try {
      while (true) {
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

        allCandles = allCandles.concat(candles);

        // Set startTime to the last candle's open time + 1 to avoid duplicate entries
        startTime = candles[candles.length - 1]['openTime'] + 1;

        // Break the loop if the last candle is beyond the endTime or if we get less than the maximum limit, meaning we've fetched all available data
        if (startTime >= endTime || candles.length < limit) {
          break;
        }
      }

      return allCandles;
    } catch (error) {
      this.logger.error('Error fetching candles:', error);
      throw error;
    }
  };

  fetchAndInsertAllCandles = async ({
    currency,
    startDate,
    endDate,
    interval = '1m',
    limit = 1000,
  }: FetchCandlesParams) => {
    const candles = await this.fetchAllCandles({
      currency,
      startDate,
      endDate,
      interval,
      limit,
    });
    const dataToInsert = candles.map((candle) => ({
      ...candle,
      currencyId: currency._id,
    }));
    await this.binanceMarketData.insertMany(dataToInsert);
  };
}

// (async () => {
//   try {
//       const startDate = '2024-03-01T00:00:00Z'; // Start date for fetching data
//       const endDate = '2024-03-31T23:59:59Z'; // End date for fetching data
//       const candles = await fetchAllCandles('BTCUSDT', startDate, endDate);
//   } catch (error) {
//       console.error('Error:', error);
//   }
// })();
