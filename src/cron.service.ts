import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { BinanceService } from './binance/binance.service';
import { BinanceMarketData } from './schemas/binance.data.schema';
import { CryptoCurrency } from './schemas/crypto.currency.schema';

import { Model } from 'mongoose';
import { CronJob } from 'cron';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  constructor(
    @InjectModel(BinanceMarketData.name)
    @InjectModel(CryptoCurrency.name)
    private cryptoCurrency: Model<CryptoCurrency>,
    private readonly schedulerRegistry: SchedulerRegistry,
    private binanceService: BinanceService,
  ) {}

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async handleMonthlyBinanceImport() {
    const currentDate = new Date();
    const currencies = await this.cryptoCurrency.find({ isActive: true }); // Example symbols, should be retrieved from DB

    // Schedule cron jobs for each symbol
    currencies.forEach((currency, index) => {
      const startTime = new Date(
        currentDate.getTime() + (index + 1) * 60 * 1000,
      ); // 1 minute apart from current time, plus 1 minute apart from each other
      this.scheduleCronJob(currency, startTime);
    });
  }

  scheduleCronJob(currency: CryptoCurrency, startTime: Date) {
    const currentDate = new Date();
    const previousMonthStartDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1,
    );
    const previousMonthEndDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );
    const job = new CronJob(startTime, async () => {
      try {
        const currentDate = new Date();
        await this.binanceService.fetchAndInsertAllCandles({
          currency,
          startDate: previousMonthStartDate.toISOString(),
          endDate: previousMonthEndDate.toISOString(),
        });

        this.logger.log(
          `Cron job for symbol ${currency.symbol} executed at ${currentDate.toISOString()}`,
        );
      } catch (error) {
        this.logger.error(
          `Error executing cron job for symbol ${currency.symbol}:`,
          error,
        );
      }
    });
    const jobName = `cron_${currency.symbol}_${startTime.getTime()}`;
    this.schedulerRegistry.addCronJob(jobName, job);
    job.start();
  }
}
