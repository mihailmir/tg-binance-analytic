import { IsString, IsEnum, IsDateString } from 'class-validator';

export class GenerateReportDto {
  @IsString()
  tgChannelId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}