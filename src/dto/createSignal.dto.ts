import { IsString } from 'class-validator';

export class CreateSignalDto {
  @IsString()
  tgChannelId: string;

  @IsString()
  message: string;
}