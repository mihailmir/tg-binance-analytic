import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { TgSignal, TgSignalSchema } from './schemas/tg.messages.schema';
import { ParsTemplate, ParsTemplateSchema } from './schemas/tg.template.schema';
import {
  BinanceMarketData,
  BinanceMarketDataSchema,
} from './schemas/binance.data.schema';
import {
  CryptoCurrency,
  CryptoCurrencySchema,
} from './schemas/crypto.currency.schema';
import { TasksService } from './cron.service';
import { BinanceService } from './binance/binance.service';
import { ParseService } from './parse/parse.service';
import { ScheduleModule } from '@nestjs/schedule';

import 'dotenv/config';
import { TgChannelSchema, TgChannel } from './schemas/tg.channel.schema';
import { TelegramService } from './telegram/telegram.service';
import { CalculateService } from './calculate/calculate.service';
import { TradeSchema, Trade } from './schemas/trades.schema';

const { MONGO_URL } = process.env;
@Module({
  imports: [
    MongooseModule.forRoot(MONGO_URL),
    MongooseModule.forFeature([
      { name: TgSignal.name, schema: TgSignalSchema },
      { name: ParsTemplate.name, schema: ParsTemplateSchema },
      { name: BinanceMarketData.name, schema: BinanceMarketDataSchema },
      { name: CryptoCurrency.name, schema: CryptoCurrencySchema },
      { name: TgChannel.name, schema: TgChannelSchema },
      { name: Trade.name, schema: TradeSchema },

    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    TasksService,
    BinanceService,
    ParseService,
    TelegramService,
    CalculateService
  ],
})
export class AppModule {}
