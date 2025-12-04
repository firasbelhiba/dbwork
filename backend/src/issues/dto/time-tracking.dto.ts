import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StartTimerDto {
  // No additional fields needed - userId comes from auth
}

export class StopTimerDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class AddManualTimeDto {
  @ApiProperty({ description: 'Duration in seconds' })
  @IsNumber()
  @Min(1)
  duration: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateTimeEntryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
