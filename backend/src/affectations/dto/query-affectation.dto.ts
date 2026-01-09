import {
  IsString,
  IsMongoId,
  IsDate,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AffectationStatus } from '../schemas/affectation.schema';

export class QueryAffectationDto {
  @ApiProperty({ description: 'Filter by user ID', required: false })
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @ApiProperty({ description: 'Filter by project ID', required: false })
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiProperty({ description: 'Filter by start date (from)', required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDateFrom?: Date;

  @ApiProperty({ description: 'Filter by start date (to)', required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDateTo?: Date;

  @ApiProperty({ description: 'Filter by end date (from)', required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDateFrom?: Date;

  @ApiProperty({ description: 'Filter by end date (to)', required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDateTo?: Date;

  @ApiProperty({ description: 'Filter by status', enum: AffectationStatus, required: false })
  @IsOptional()
  @IsEnum(AffectationStatus)
  status?: AffectationStatus;

  @ApiProperty({ description: 'Filter by role', required: false })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ description: 'Filter billable only', required: false })
  @IsOptional()
  isBillable?: string; // Will be converted to boolean
}

export class ChargeabilityReportDto {
  @ApiProperty({ description: 'User ID for chargeability report', required: false })
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @ApiProperty({ description: 'Start date for report period' })
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiProperty({ description: 'End date for report period' })
  @Type(() => Date)
  @IsDate()
  endDate: Date;
}
