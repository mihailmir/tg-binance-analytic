import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ParsTemplate } from './schemas/tg.template.schema';

import { Model } from 'mongoose';
import { TelegramService } from './telegram/telegram.service';
import { CreateChannelDto } from './dto/createChannel.dto';
import { TgChannel } from './schemas/tg.channel.schema';
import { FetchMessagesDto } from './dto/fetchMessagesDto.dto';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(ParsTemplate.name)
    private parsTemplateModel: Model<ParsTemplate>,
    private telegramService: TelegramService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async fetchAndSaveMessages(fetchMessagesDto: FetchMessagesDto) {
    this.telegramService.fetchAndSaveMessages(fetchMessagesDto);
    return { status: 'OK' };
  }

  async createChannel(createChannelDto: CreateChannelDto): Promise<TgChannel> {
    return this.telegramService.createChannel(createChannelDto);
  }

  async createParsTemplate(createParsTemplateDto: any): Promise<ParsTemplate> {
    const createdParsTeamplate = new this.parsTemplateModel(
      createParsTemplateDto,
    );
    return createdParsTeamplate.save();
  }
}
