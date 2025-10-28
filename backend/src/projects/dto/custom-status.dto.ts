import { IsString, IsNotEmpty, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class CreateCustomStatusDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  color: string;
}

export class UpdateCustomStatusDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @IsOptional()
  order?: number;
}

export class ReorderCustomStatusesDto {
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  statusIds: string[];
}
