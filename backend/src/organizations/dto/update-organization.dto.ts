import { IsString, IsOptional, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrganizationDto {
  @ApiProperty({ example: 'Dar Blockchain', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Leading blockchain development company', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
