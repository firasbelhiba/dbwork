import { IsString, IsOptional, IsEnum, IsMongoId, IsArray, IsObject, IsDate, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IssueType, IssuePriority, IssueStatus } from '@common/enums';

export class UpdateIssueDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: IssueType, required: false })
  @IsOptional()
  @IsEnum(IssueType)
  type?: IssueType;

  @ApiProperty({ enum: IssuePriority, required: false })
  @IsOptional()
  @IsEnum(IssuePriority)
  priority?: IssuePriority;

  @ApiProperty({ required: false, description: 'Status can be either a predefined status or a custom status ID' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false, type: [String], description: 'Array of user IDs to assign to this issue' })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  assignees?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  sprintId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  storyPoints?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
