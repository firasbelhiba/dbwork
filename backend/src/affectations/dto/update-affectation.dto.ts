import {
  IsString,
  IsMongoId,
  IsDate,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AffectationStatus } from '../schemas/affectation.schema';

export class UpdateAffectationDto {
  @ApiProperty({ description: 'User ID to assign', required: false })
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @ApiProperty({ description: 'Project ID to assign to', required: false })
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiProperty({ description: 'Start date of assignment', required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiProperty({ description: 'End date of assignment', required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @ApiProperty({ description: 'Role/Function', required: false })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ description: 'Allocation percentage (0-100)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  allocationPercentage?: number;

  @ApiProperty({ description: 'Estimated hours for this assignment', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @ApiProperty({ description: 'Actual hours worked (usually auto-calculated)', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actualHours?: number;

  @ApiProperty({ description: 'Notes/Comments', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Status', enum: AffectationStatus, required: false })
  @IsOptional()
  @IsEnum(AffectationStatus)
  status?: AffectationStatus;

  @ApiProperty({ description: 'Is this billable time?', required: false })
  @IsOptional()
  @IsBoolean()
  isBillable?: boolean;
}
