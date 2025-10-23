import { IsString, IsOptional, IsMongoId, IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateSprintDto {
  @ApiProperty()
  @IsMongoId()
  projectId: string;

  @ApiProperty({ example: 'Sprint 1' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Complete user authentication module', required: false })
  @IsOptional()
  @IsString()
  goal?: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  endDate: Date;
}
