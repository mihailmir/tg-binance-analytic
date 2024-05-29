import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { StringSession } from 'telegram/sessions';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TgChannel } from '../schemas/tg.channel.schema';
import { TgSignal } from '../schemas/tg.messages.schema';

import { Api, TelegramClient } from 'telegram';
import { CreateChannelDto } from 'src/dto/createChannel.dto';
import { FetchMessagesDto } from 'src/dto/fetchMessagesDto.dto';

const { TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_SESSION } = process.env;

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private apiId = Number(TELEGRAM_API_ID);
  private apiHash = TELEGRAM_API_HASH;
  private stringSession = new StringSession(TELEGRAM_SESSION);
  private client: TelegramClient;
  constructor(
    @InjectModel(TgChannel.name)
    private tgChannel: Model<TgChannel>,
    @InjectModel(TgSignal.name)
    private tgSignal: Model<TgSignal>,
  ) {
    this.init();
  }

  async init() {
    this.client = new TelegramClient(
      this.stringSession,
      this.apiId,
      this.apiHash,
      {
        connectionRetries: 5,
      },
    );

    const connected = await this.client.connect();
    const me = await this.client.getMe();

    this.logger.log(`Connect: ${connected}`);
    this.logger.log(`Connect: ${me.username}`);
    this.logger.log('Telegram client initialized and connected.');
  }

  async fetchMessages(
    fetchMessagesDto: FetchMessagesDto,
    telegramChannel: TgChannel,
    batchSize: number = 100,
    excludeReplies: boolean = true,
  ) {
    const { startDate, endDate, tgChannelId } = fetchMessagesDto;
    let allMessages = [];
    let offsetId: number;

    const startTimestamp = new Date(startDate).getTime() / 1000;
    const endTimestamp = new Date(endDate).getTime() / 1000;

    if (!telegramChannel) {
      throw new Error(`Channel with ID ${tgChannelId} not found`);
    }
    try {
      while (true) {
        const messages: any = await this.client.invoke(
          new Api.messages.Search({
            peer: telegramChannel.originalId,
            q: telegramChannel.searchKeyword,
            filter: new Api.InputMessagesFilterEmpty(),
            minDate: startTimestamp,
            maxDate: endTimestamp,
            offsetId: offsetId,
            limit: batchSize,
          }),
        );
        if (messages.messages.length === 0) {
          break; // No more messages to fetch
        }

        if (excludeReplies) {
          messages.messages = messages.messages.filter(
            (m: any) => m.replyTo === null,
          );
        }
        allMessages = allMessages.concat(messages.messages);

        const lastMessageId =
          messages.messages[messages.messages.length - 1].id;
        offsetId = lastMessageId;

        await new Promise((resolve) => setTimeout(resolve, 0.3 * 1000)); // TODO: Refactor this sleep to improve performance ??
      }

      return allMessages;
    } catch (error) {
      this.logger.error('Error fetching messages', error);
      throw new Error('Failed to fetch messages');
    }
  }

  async upsertMessages(messages, tgChannelId: string) {
    // TODO: Refactor this function to improve performance. Probably exists a better solution for avoid duplicates
    const tgChannelObjectId = new Types.ObjectId(tgChannelId);
    const bulkMessages = messages.map((m) => ({
      updateOne: {
        filter: {
          tgChannelId: tgChannelObjectId,
          postTimestamp: m.date,
          message: m.message,
        },
        update: {
          $set: {
            tgChannelId: tgChannelObjectId,
            message: m.message,
            postTimestamp: m.date,
          },
        },
        upsert: true,
      },
    }));
    try {
      const result = await this.tgSignal.bulkWrite(bulkMessages);
      this.logger.log(
        `Bulk upsert operation complete for ${tgChannelObjectId}`,
      );
    } catch (error) {
      this.logger.error(`Error during bulk upsert operation: ${error}`);
    }
  }

  async fetchAndSaveMessages(
    fetchMessagesDto: FetchMessagesDto,
    batchSize: number = 100,
    excludeReplies: boolean = true,
  ) {
    // TODO: move to cron background ??
    const telegramChannel = await this.tgChannel.findById(
      fetchMessagesDto.tgChannelId,
    );
    const messages = await this.fetchMessages(
      fetchMessagesDto,
      telegramChannel,
      batchSize,
      excludeReplies,
    );
    await this.upsertMessages(messages, fetchMessagesDto.tgChannelId);
  }

  async getChannelName(channelId: string) {
    try {
      const channelInfo = await this.client.getEntity(channelId);
      // @ts-ignore
      const channelName = channelInfo.title;
      return channelName;
    } catch (error) {
      console.error('Error fetching channel name:', error);
      return null;
    }
  }

  async createChannel(channelDto: CreateChannelDto) {
    let name = '';
    if (!channelDto.name) {
      name = await this.getChannelName(channelDto.originalId);
    }
    return this.tgChannel.create({
      name: channelDto.name || name,
      originalId: channelDto.originalId,
      searchKeyword: channelDto.searchKeyword,
    });
  }
}
