import { IsOptional, IsEnum, IsMongoId, IsString, IsArray, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  assignee?: string;

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
