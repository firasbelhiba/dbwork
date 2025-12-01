import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IssueType, IssuePriority, IssueStatus } from '@common/enums';
import { TimeTracking, TimeLog } from '@common/interfaces';

export type IssueDocument = Issue & Document;

@Schema({ timestamps: true })
export class Issue {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  projectId: Types.ObjectId;

  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  key: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: String, default: '' })
  description: string;

  @Prop({
    type: String,
    enum: Object.values(IssueType),
    default: IssueType.TASK
  })
  type: IssueType;

  @Prop({
    type: String,
    enum: Object.values(IssuePriority),
    default: IssuePriority.MEDIUM
  })
  priority: IssuePriority;

  @Prop({
    type: String,
    default: IssueStatus.TODO
  })
  status: string; // Can be IssueStatus enum or custom status ID

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  assignees: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reporter: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  labels: string[];

  @Prop({ type: Object, default: {} })
  customFields: Record<string, any>;

  @Prop({ type: Object, default: {
    estimatedHours: null,
    loggedHours: 0,
    timeLogs: []
  }})
  timeTracking: TimeTracking;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Attachment' }], default: [] })
  attachments: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Sprint', default: null })
  sprintId: Types.ObjectId;

  @Prop({ default: null })
  dueDate: Date;

  @Prop({ type: Number, default: 0 })
  storyPoints: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  watchers: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Issue' }], default: [] })
  blockedBy: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Issue' }], default: [] })
  blocks: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Issue', default: null })
  parentIssue: Types.ObjectId;

  @Prop({ type: Number, default: 0 })
  order: number;

  @Prop({ default: false })
  isArchived: boolean;

  @Prop({ default: null })
  archivedAt: Date;

  @Prop({ default: null })
  completedAt: Date;

  // Timestamps (automatically added by MongoDB with { timestamps: true })
  createdAt?: Date;
  updatedAt?: Date;
}

export const IssueSchema = SchemaFactory.createForClass(Issue);

// Indexes for better query performance
IssueSchema.index({ key: 1 }, { unique: true });
IssueSchema.index({ projectId: 1, status: 1 });
IssueSchema.index({ projectId: 1, sprintId: 1 });
IssueSchema.index({ assignees: 1 });
IssueSchema.index({ reporter: 1 });
IssueSchema.index({ status: 1 });
IssueSchema.index({ priority: 1 });
IssueSchema.index({ type: 1 });
IssueSchema.index({ labels: 1 });
IssueSchema.index({ dueDate: 1 });
IssueSchema.index({ createdAt: -1 });
IssueSchema.index({ updatedAt: -1 });
IssueSchema.index({ parentIssue: 1 });
IssueSchema.index({ isArchived: 1 });
IssueSchema.index({ completedAt: -1 });

// Text index for search
IssueSchema.index({ title: 'text', description: 'text', key: 'text' });
