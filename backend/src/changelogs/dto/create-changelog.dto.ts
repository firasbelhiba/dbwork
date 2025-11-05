import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  IsOptional,
  MinLength,
  MaxLength,
  IsDateString,
} from 'class-validator';

export class CreateChangelogDto {
  @ApiProperty({
    example: 'v1.2.0',
    description: 'Version number (e.g., v1.2.0, v2.0.1)',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  version: string;

  @ApiProperty({
    example: 'Major Feature Release',
    description: 'Release title',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    example: 'This release includes significant improvements to the dashboard and new reporting features.',
    description: 'Detailed release description',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @ApiProperty({
    example: '2025-11-05T00:00:00.000Z',
    description: 'Release date',
  })
  @IsDateString()
  releaseDate: string;

  @ApiProperty({
    example: ['New dashboard widgets', 'Advanced user management'],
    description: 'List of new features',
  })
  @IsArray()
  @IsString({ each: true })
  features: string[];

  @ApiProperty({
    example: ['Better performance', 'Improved UI responsiveness'],
    description: 'List of improvements',
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  improvements?: string[];

  @ApiProperty({
    example: ['Fixed login bug', 'Resolved issue with notifications'],
    description: 'List of bug fixes',
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  bugFixes?: string[];
}
