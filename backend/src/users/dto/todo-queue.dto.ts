import { IsArray, IsMongoId, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTodoQueueDto {
  @ApiProperty({
    description: 'Ordered array of issue IDs for the todo queue',
    type: [String],
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012']
  })
  @IsArray()
  @IsMongoId({ each: true })
  issueIds: string[];
}

export class AddToQueueDto {
  @ApiProperty({
    description: 'Position in the queue (0-indexed). If not provided, adds to end.',
    required: false,
    example: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  position?: number;
}
