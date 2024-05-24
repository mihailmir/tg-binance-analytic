import { IsString } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  tgChannelId: string;

  @IsString()
  template: string;
}