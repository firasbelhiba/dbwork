import { IsString, IsNotEmpty, IsDateString, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class CreateDemoEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsBoolean()
  @IsOptional()
  createGoogleMeet?: boolean;

  @IsBoolean()
  @IsOptional()
  inviteAllMembers?: boolean;

  @IsArray()
  @IsOptional()
  attendees?: string[]; // Additional email addresses
}

export class UpdateDemoEventDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsArray()
  @IsOptional()
  attendees?: string[];
}
