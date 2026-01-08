import { IsEnum, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProjectRole } from '@common/enums';

export class UpdateMemberRolesDto {
  @ApiProperty({ type: [String], enum: ProjectRole })
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(ProjectRole, { each: true })
  projectRoles: ProjectRole[];
}
