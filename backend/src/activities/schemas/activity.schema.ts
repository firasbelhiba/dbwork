import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ActivityDocument = Activity & Document;

export enum ActionType {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  COMMENTED = 'commented',
  ADDED_MEMBER = 'added_member',
  REMOVED_MEMBER = 'removed_member',
  STARTED = 'started',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
  RESTORED = 'restored',
  ASSIGNED = 'assigned',
  STATUS_CHANGED = 'status_changed',
  PRIORITY_CHANGED = 'priority_changed',
}

export enum EntityType {
  ISSUE = 'issue',
  PROJECT = 'project',
  SPRINT = 'sprint',
  COMMENT = 'comment',
  USER = 'user',
}

@Schema({ timestamps: true })
export class Activity {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ActionType })
  action: ActionType;

  @Prop({ required: true, enum: EntityType })
  entityType: EntityType;

  @Prop({ required: true })
  entityId: string;

  @Prop({ required: true })
  entityName: string;

  @Prop({ type: Types.ObjectId, ref: 'Project' })
  projectId?: Types.ObjectId;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const ActivitySchema = SchemaFactory.createForClass(Activity);

// Create indexes for better query performance
ActivitySchema.index({ createdAt: -1 });
ActivitySchema.index({ userId: 1, createdAt: -1 });
ActivitySchema.index({ entityType: 1, createdAt: -1 });
ActivitySchema.index({ projectId: 1, createdAt: -1 });
ActivitySchema.index({ action: 1, createdAt: -1 });
