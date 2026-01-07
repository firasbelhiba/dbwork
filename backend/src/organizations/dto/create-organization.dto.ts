import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Dar Blockchain' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'DAR', description: 'Unique key for the organization (will be uppercased)' })
  @IsString()
  key: string;

  @ApiProperty({ example: 'Leading blockchain development company', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}
