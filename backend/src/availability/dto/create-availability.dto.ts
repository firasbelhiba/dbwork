import { IsString, IsOptional, IsEnum, IsMongoId, IsBoolean, IsDateString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AvailabilityStatus } from '../schemas/availability.schema';

export class CreateAvailabilityDto {
  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiProperty({ enum: AvailabilityStatus })
  @IsEnum(AvailabilityStatus)
  status: AvailabilityStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isAllDay?: boolean;

  @ApiProperty({ required: false, description: 'Start time in HH:mm format' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'Start time must be in HH:mm format' })
  startTime?: string;

  @ApiProperty({ required: false, description: 'End time in HH:mm format' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, { message: 'End time must be in HH:mm format' })
  endTime?: string;
}
