import { IsString, IsDateString } from 'class-validator';

export class FetchMessagesDto {
  @IsString()
  tgChannelId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}