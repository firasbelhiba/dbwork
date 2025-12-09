import { IsString, IsOptional, IsEnum, IsMongoId, IsArray, IsObject, IsDate, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IssueType, IssuePriority, IssueStatus } from '@common/enums';

export class CreateIssueDto {
  @ApiProperty()
  @IsMongoId()
  projectId: string;

  @ApiProperty({ example: 'Implement user authentication' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'We need to implement JWT-based authentication...', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: IssueType, example: IssueType.TASK })
  @IsEnum(IssueType)
  type: IssueType;

  @ApiProperty({ enum: IssuePriority, example: IssuePriority.MEDIUM })
  @IsEnum(IssuePriority)
  priority: IssuePriority;

  @ApiProperty({ enum: IssueStatus, example: IssueStatus.TODO, required: false })
  @IsOptional()
  @IsEnum(IssueStatus)
  status?: IssueStatus;

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

  @ApiProperty({ required: false, example: 'frontend' })
  @IsOptional()
  @IsString()
  category?: string;

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
  startDate?: Date;

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
  estimatedHours?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  parentIssue?: string;
}
