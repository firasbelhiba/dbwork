import { IsMongoId, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProjectRole } from '@common/enums';

export class AddMemberDto {
  @ApiProperty()
  @IsMongoId()
  userId: string;

  @ApiProperty({ required: false, enum: ProjectRole, default: ProjectRole.MEMBER })
  @IsOptional()
  @IsEnum(ProjectRole)
  projectRole?: ProjectRole;
}
