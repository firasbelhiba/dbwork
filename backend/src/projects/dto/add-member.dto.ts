import { IsMongoId, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProjectRole } from '@common/enums';

export class AddMemberDto {
  @ApiProperty()
  @IsMongoId()
  userId: string;

  @ApiProperty({ required: false, type: [String], enum: ProjectRole, default: [ProjectRole.MEMBER] })
  @IsOptional()
  @IsArray()
  @IsEnum(ProjectRole, { each: true })
  projectRoles?: ProjectRole[];
}
