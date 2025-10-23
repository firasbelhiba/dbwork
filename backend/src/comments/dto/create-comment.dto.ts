import { IsString, IsOptional, IsMongoId, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ example: 'This looks good! @john.doe can you review?' })
  @IsString()
  content: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentions?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  parentCommentId?: string;
}
