import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserAchievementDocument = UserAchievement & Document;

export interface AchievementProgress {
  current: number;
  target: number;
}

@Schema({ timestamps: true })
export class UserAchievement {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Achievement', required: true })
  achievementId: Types.ObjectId;

  @Prop({ default: false })
  unlocked: boolean;

  @Prop({ default: null })
  unlockedAt: Date;

  @Prop({ type: Object, default: { current: 0, target: 0 } })
  progress: AchievementProgress;

  @Prop({ default: false })
  viewed: boolean; // For modal - true after user sees the unlock modal

  createdAt: Date;
  updatedAt: Date;
}

export const UserAchievementSchema =
  SchemaFactory.createForClass(UserAchievement);

// Indexes
UserAchievementSchema.index({ userId: 1, achievementId: 1 }, { unique: true });
UserAchievementSchema.index({ userId: 1, unlocked: 1 });
UserAchievementSchema.index({ userId: 1, viewed: 1 });
