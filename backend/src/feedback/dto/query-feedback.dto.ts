import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { FeedbackType, FeedbackStatus } from '../enums/feedback.enum';

export class QueryFeedbackDto {
  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiProperty({ enum: FeedbackType, required: false })
  @IsOptional()
  @IsEnum(FeedbackType)
  type?: FeedbackType;

  @ApiProperty({ enum: FeedbackStatus, required: false })
  @IsOptional()
  @IsEnum(FeedbackStatus)
  status?: FeedbackStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    required: false,
    enum: ['recent', 'oldest', 'most_upvoted'],
    default: 'recent',
  })
  @IsOptional()
  @IsString()
  sortBy?: 'recent' | 'oldest' | 'most_upvoted';

  @ApiProperty({ required: false, description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  userId?: string;
}
