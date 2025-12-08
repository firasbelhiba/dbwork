import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateAuditDto {
  @IsString()
  title: string;

  @IsString()
  auditType: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  auditDate?: string;
}
