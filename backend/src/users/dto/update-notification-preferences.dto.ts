import { IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateNotificationPreferencesDto {
  // Issue notifications
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  issue_assigned?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  issue_updated?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  issue_commented?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  issue_status_changed?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  issue_priority_changed?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  issue_due_date_changed?: boolean;

  // Comment notifications
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  comment_on_issue?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  comment_mention?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  comment_reply?: boolean;

  // General mentions
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  mention?: boolean;

  // Sprint notifications
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  sprint_started?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  sprint_completed?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  sprint_issue_added?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  sprint_starting_soon?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  sprint_ending_soon?: boolean;

  // Project notifications
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  project_invitation?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  project_member_added?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  project_member_removed?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  project_role_changed?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  project_archived?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  project_deleted?: boolean;

  // Feedback notifications
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  feedback_upvoted?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  feedback_status_changed?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  feedback_commented?: boolean;

  // Changelog notifications
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  new_changelog?: boolean;
}
