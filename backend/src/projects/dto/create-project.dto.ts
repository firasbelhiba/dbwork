import { IsString, IsOptional, IsMongoId, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'Dar Blockchain Platform' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'DAR' })
  @IsString()
  key: string;

  @ApiProperty({ example: 'Main blockchain platform project', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  lead?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  settings?: any;

  @ApiProperty({ required: false, description: 'Organization ID to assign project to' })
  @IsOptional()
  @IsMongoId()
  organizationId?: string;
}
