import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { FetchMessagesDto } from './dto/fetchMessagesDto.dto';
import { CreateTemplateDto } from './dto/createTemplate.dto';
import { GenerateReportDto } from './dto/generateReport.dto';

import { ParsTemplate } from './schemas/tg.template.schema';
import { CreateChannelDto } from './dto/createChannel.dto';
import { TgChannel } from './schemas/tg.channel.schema';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  ping(): string {
    return this.appService.getHello();
  }

  @Post('/fetchMessages')
  fetchMessages(@Body() fetchMessagesDto: FetchMessagesDto) {
    return this.appService.fetchAndSaveMessages(fetchMessagesDto);
  }

  @Post('/channel')
  createChannel(
    @Body() createChannelDto: CreateChannelDto,
  ): Promise<TgChannel> {
    return this.appService.createChannel(createChannelDto);
  }

  @Post('/template')
  createTemplate(
    @Body() createTemplateDto: CreateTemplateDto,
  ): Promise<ParsTemplate> {
    return this.appService.createParsTemplate(createTemplateDto);
  }

  @Post('/generateReport')
  generateReport(
    @Body() generateReportDto: GenerateReportDto,
  ) {
    return this.appService.generateReport(generateReportDto);
  }
}
