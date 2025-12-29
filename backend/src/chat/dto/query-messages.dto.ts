import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryMessagesDto {
  @ApiProperty({ description: 'Number of messages to return', required: false, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @ApiProperty({ description: 'Message ID cursor - get messages before this ID', required: false })
  @IsOptional()
  @IsString()
  before?: string;

  @ApiProperty({ description: 'Message ID cursor - get messages after this ID', required: false })
  @IsOptional()
  @IsString()
  after?: string;
}
