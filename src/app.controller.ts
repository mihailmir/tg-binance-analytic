import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { CreateSignalDto } from './dto/createSignal.dto';
import { CreateTemplateDto } from './dto/createTemplate.dto';
import { TgSignal } from './schemas/tg.messages.schema';
import { ParsTemplate } from './schemas/tg.template.schema';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  ping(): string {
    return this.appService.getHello();
  }

  @Post('/signal')
  createSignal(@Body() createSignalDto: CreateSignalDto): Promise<TgSignal> {
    return this.appService.createSignal(createSignalDto);
  }

  @Post('/template')
  createTemplate(
    @Body() createTemplateDto: CreateTemplateDto,
  ): Promise<ParsTemplate> {
    return this.appService.createParsTemplate(createTemplateDto);
  }
}
