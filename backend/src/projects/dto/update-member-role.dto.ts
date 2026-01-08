import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProjectRole } from '@common/enums';

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ProjectRole })
  @IsEnum(ProjectRole)
  projectRole: ProjectRole;
}
