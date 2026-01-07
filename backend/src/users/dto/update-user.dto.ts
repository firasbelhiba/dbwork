import { IsString, IsEnum, IsOptional, IsObject, IsBoolean, IsEmail, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@common/enums';
import { UserPreferences } from '@common/interfaces';

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ enum: UserRole, required: false })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  preferences?: UserPreferences;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  gmailEmail?: string;

  @ApiProperty({ required: false, description: 'Organization ID to assign the user to' })
  @IsOptional()
  @IsMongoId()
  organizationId?: string;
}
