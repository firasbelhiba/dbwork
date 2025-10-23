import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddTimeLogDto {
  @ApiProperty({ example: 2.5 })
  @IsNumber()
  @Min(0.1)
  hours: number;

  @ApiProperty({ example: 'Implemented authentication logic', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
