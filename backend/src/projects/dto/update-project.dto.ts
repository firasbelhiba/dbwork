import { IsString, IsOptional, IsMongoId, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProjectDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @ApiProperty({ required: false, description: 'Organization ID to assign project to' })
  @IsOptional()
  @IsMongoId()
  organizationId?: string;
}
