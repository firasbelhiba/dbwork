import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AppSettingsDocument = AppSettings & Document;

// Project Role definition for custom roles
export interface ProjectRoleDefinition {
  id: string;
  name: string;
  label: string;
  color: string;
  isDefault: boolean;
  order: number;
}

// Default project roles
export const DEFAULT_PROJECT_ROLES: ProjectRoleDefinition[] = [
  { id: 'project_manager', name: 'project_manager', label: 'Project Manager', color: '#f59e0b', isDefault: true, order: 0 },
  { id: 'tech_lead', name: 'tech_lead', label: 'Tech Lead', color: '#ef4444', isDefault: true, order: 1 },
  { id: 'frontend', name: 'frontend', label: 'Frontend', color: '#3b82f6', isDefault: true, order: 2 },
  { id: 'backend', name: 'backend', label: 'Backend', color: '#22c55e', isDefault: true, order: 3 },
  { id: 'fullstack', name: 'fullstack', label: 'Fullstack', color: '#8b5cf6', isDefault: true, order: 4 },
  { id: 'designer', name: 'designer', label: 'Designer', color: '#ec4899', isDefault: true, order: 5 },
  { id: 'qa', name: 'qa', label: 'QA', color: '#6b7280', isDefault: true, order: 6 },
  { id: 'devops', name: 'devops', label: 'DevOps', color: '#14b8a6', isDefault: true, order: 7 },
  { id: 'member', name: 'member', label: 'Member', color: '#9ca3af', isDefault: true, order: 8 },
];

@Schema({ timestamps: true })
export class AppSettings {
  @Prop({ type: String, default: 'app_settings', unique: true })
  key: string;

  // Timer Auto-Stop Settings
  @Prop({ type: Number, default: 17 }) // 5 PM (17:00)
  timerAutoStopHour: number;

  @Prop({ type: Number, default: 30 }) // 30 minutes
  timerAutoStopMinute: number;

  @Prop({ type: Boolean, default: true })
  timerAutoStopEnabled: boolean;

  @Prop({ type: String, default: 'Africa/Tunis' })
  timerAutoStopTimezone: string;

  // Only run on weekdays (Monday-Friday)
  @Prop({ type: Boolean, default: true })
  timerAutoStopWeekdaysOnly: boolean;

  // Custom Project Roles
  @Prop({ type: [Object], default: DEFAULT_PROJECT_ROLES })
  projectRoles: ProjectRoleDefinition[];
}

export const AppSettingsSchema = SchemaFactory.createForClass(AppSettings);
