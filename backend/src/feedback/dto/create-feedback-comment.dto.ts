import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFeedbackCommentDto {
  @ApiProperty({
    description: 'Comment content',
    minLength: 1,
    maxLength: 1000,
    example: 'I have the same issue on Chrome browser.',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1, { message: 'Comment must be at least 1 character long' })
  @MaxLength(1000, { message: 'Comment cannot exceed 1000 characters' })
  content: string;
}
