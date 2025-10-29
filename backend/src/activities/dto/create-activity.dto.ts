import { IsString, IsNotEmpty, IsEnum, IsOptional, IsObject } from 'class-validator';
import { ActionType, EntityType } from '../schemas/activity.schema';

export class CreateActivityDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEnum(ActionType)
  @IsNotEmpty()
  action: ActionType;

  @IsEnum(EntityType)
  @IsNotEmpty()
  entityType: EntityType;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  entityName: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
