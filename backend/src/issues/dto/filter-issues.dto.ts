import { IsOptional, IsEnum, IsMongoId, IsString, IsArray, IsNumber, Min, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { IssueType, IssuePriority, IssueStatus } from '@common/enums';

export class FilterIssuesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  projectId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  sprintId?: string;

  @ApiProperty({ enum: IssueStatus, required: false })
  @IsOptional()
  @IsEnum(IssueStatus)
  status?: IssueStatus;

  @ApiProperty({ enum: IssueType, required: false })
  @IsOptional()
  @IsEnum(IssueType)
  type?: IssueType;

  @ApiProperty({ enum: IssuePriority, required: false })
  @IsOptional()
  @IsEnum(IssuePriority)
  priority?: IssuePriority;

  @ApiProperty({ required: false, type: [String], description: 'Filter by assignee user IDs (supports multiple)' })
  @IsOptional()
  @Transform(({ value }) => {
    // Handle single value or array from query params
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value;
    return value;
  })
  @IsArray()
  @IsMongoId({ each: true })
  assignees?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  reporter?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, description: 'Filter by single category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ required: false, type: [String], description: 'Filter by multiple categories' })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value;
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @ApiProperty({ required: false, description: 'Filter by archived status. Defaults to false (excludes archived).' })
  @IsOptional()
  @IsString()
  isArchived?: string | boolean;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
