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

export class CreateAffectationDto {
  @ApiProperty({ description: 'User ID to assign', example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  userId: string;

  @ApiProperty({ description: 'Project ID to assign to', example: '507f1f77bcf86cd799439012' })
  @IsMongoId()
  projectId: string;

  @ApiProperty({ description: 'Start date of assignment', example: '2025-01-01' })
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiProperty({ description: 'End date of assignment', example: '2025-03-31' })
  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @ApiProperty({ description: 'Role/Function', example: 'DEVELOPPEUR' })
  @IsString()
  role: string;

  @ApiProperty({ description: 'Allocation percentage (0-100)', example: 100, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  allocationPercentage?: number;

  @ApiProperty({ description: 'Estimated hours for this assignment', example: 160, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedHours?: number;

  @ApiProperty({ description: 'Notes/Comments', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Status', enum: AffectationStatus, required: false })
  @IsOptional()
  @IsEnum(AffectationStatus)
  status?: AffectationStatus;

  @ApiProperty({ description: 'Is this billable time?', default: true, required: false })
  @IsOptional()
  @IsBoolean()
  isBillable?: boolean;
}
