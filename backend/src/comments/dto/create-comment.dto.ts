import { IsString, IsOptional, IsMongoId, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CommentImageDto {
  @ApiProperty({ example: 'https://res.cloudinary.com/...' })
  @IsString()
  url: string;

  @ApiProperty({ example: 'comment-images/abc123' })
  @IsString()
  cloudinaryId: string;

  @ApiProperty({ example: 'screenshot.png', required: false })
  @IsOptional()
  @IsString()
  fileName?: string;
}

export class CreateCommentDto {
  @ApiProperty({ example: 'This looks good! @john.doe can you review?' })
  @IsString()
  content: string;

  @ApiProperty({ required: false, type: [CommentImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommentImageDto)
  images?: CommentImageDto[];

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
