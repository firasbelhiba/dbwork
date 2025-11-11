import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateFeedbackCommentDto {
  @ApiProperty({
    description: 'Comment content',
    minLength: 1,
    maxLength: 1000,
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1, { message: 'Comment must be at least 1 character long' })
  @MaxLength(1000, { message: 'Comment cannot exceed 1000 characters' })
  content: string;
}
