import { IsString, IsEnum } from 'class-validator';
import { TemplateType } from '../schemas/tg.template.schema';

export class CreateTemplateDto {
  @IsString()
  tgChannelId: string;

  @IsString()
  template: string;

  @IsEnum(TemplateType)
  type: TemplateType;
}