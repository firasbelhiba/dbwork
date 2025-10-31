import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { FeedbackType } from '../enums/feedback.enum';

export class CreateFeedbackDto {
  @ApiProperty({
    enum: FeedbackType,
    example: FeedbackType.BUG,
    description: 'Type of feedback',
  })
  @IsEnum(FeedbackType)
  type: FeedbackType;

  @ApiProperty({
    example: 'Dashboard not loading properly',
    description: 'Title of the feedback',
    minLength: 5,
    maxLength: 200,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    example: 'When I click on the dashboard link, the page shows a blank screen.',
    description: 'Detailed description of the feedback',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @ApiProperty({
    example: 'https://app.example.com/dashboard',
    description: 'URL where the issue occurred',
    required: false,
  })
  @IsOptional()
  @IsString()
  pageUrl?: string;

  @ApiProperty({
    example: 'Chrome 120.0.0.0 on Windows 11',
    description: 'Browser and OS information',
    required: false,
  })
  @IsOptional()
  @IsString()
  browserInfo?: string;
}
