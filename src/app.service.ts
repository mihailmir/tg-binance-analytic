import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { TgSignal } from './schemas/tg.messages.schema';
import { ParsTemplate } from './schemas/tg.template.schema';
import { BinanceMarketData } from './schemas/binance.data.schema';

import { Model } from 'mongoose';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(TgSignal.name) private tgSignalModel: Model<TgSignal>,
    @InjectModel(ParsTemplate.name) private ParsTemplateModel: Model<ParsTemplate>,
    @InjectModel(BinanceMarketData.name) private BinanceMarketData: Model<BinanceMarketData>,

  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async createSignal(createSignalDto: any): Promise<TgSignal> {
    const createdSignal = new this.tgSignalModel(createSignalDto);
    return createdSignal.save();
  }

  async createParsTemplate(createParsTemplateDto: any): Promise<ParsTemplate> {
    const createdParsTeamplate = new this.ParsTemplateModel(
      createParsTemplateDto,
    );
    return createdParsTeamplate.save();
  }

  async findBinanceMarketData(tgChannelId: string, ): Promise<BinanceMarketData[]> {
    return this.BinanceMarketData.find().exec();
  }
}
