import { IsMongoId, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@common/enums';

export class AddMemberDto {
  @ApiProperty({ description: 'User ID to add as member' })
  @IsMongoId()
  userId: string;

  @ApiProperty({ enum: UserRole, example: UserRole.DEVELOPER, required: false })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: UserRole, example: UserRole.PROJECT_MANAGER })
  @IsEnum(UserRole)
  role: UserRole;
}
