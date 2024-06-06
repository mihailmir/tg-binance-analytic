import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getModelToken } from '@nestjs/mongoose';
import { ParsTemplate } from './schemas/tg.template.schema';
import { Model, Types } from 'mongoose';
import { TelegramService } from './telegram/telegram.service';
import { CalculateService } from './calculate/calculate.service';
import { TgChannel } from './schemas/tg.channel.schema';
import { TgSignal } from './schemas/tg.messages.schema';
import { CryptoCurrency } from './schemas/crypto.currency.schema';
import { BinanceMarketData } from './schemas/binance.data.schema';
import { Trade } from './schemas/trades.schema';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        TelegramService,
        CalculateService,
        {
          provide: getModelToken(ParsTemplate.name),
          useValue: Model,
        },
        {
          provide: getModelToken(TgChannel.name),
          useValue: Model,
        },
        {
          provide: getModelToken(TgSignal.name),
          useValue: Model,
        },
        {
          provide: getModelToken(CryptoCurrency.name),
          useValue: Model,
        },
        {
          provide: getModelToken(BinanceMarketData.name),
          useValue: Model,
        },
        {
          provide: getModelToken(Trade.name),
          useValue: Model,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.ping()).toBe('Hello World!');
    });
  });
});
