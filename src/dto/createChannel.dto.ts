import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateChannelDto {
  @IsString()
  @IsNotEmpty()
  originalId: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  searchKeyword?: string;
}