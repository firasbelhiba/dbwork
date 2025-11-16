import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AchievementDocument = Achievement & Document;

export enum AchievementCategory {
  TASK_COMPLETION = 'task_completion',
  BUG_FIXES = 'bug_fixes',
  COLLABORATION = 'collaboration',
  QUALITY = 'quality',
  STREAK = 'streak',
  SPEED = 'speed',
  MILESTONES = 'milestones',
  FEEDBACK = 'feedback',
}

export enum AchievementRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

export interface AchievementCriteria {
  type: string;
  count?: number;
  timeframe?: string; // '1day', '7days', etc.
  condition?: any; // Additional conditions
}

@Schema({ timestamps: true })
export class Achievement {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({
    type: String,
    enum: Object.values(AchievementCategory),
    required: true,
  })
  category: AchievementCategory;

  @Prop({ required: true })
  icon: string;

  @Prop({
    type: String,
    enum: Object.values(AchievementRarity),
    default: AchievementRarity.COMMON,
  })
  rarity: AchievementRarity;

  @Prop({ type: Object, required: true })
  criteria: AchievementCriteria;

  @Prop({ default: 0 })
  points: number;

  createdAt: Date;
  updatedAt: Date;
}

export const AchievementSchema = SchemaFactory.createForClass(Achievement);

// Indexes
AchievementSchema.index({ key: 1 });
AchievementSchema.index({ category: 1 });
