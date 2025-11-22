import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { FeedbackType, FeedbackStatus } from '../enums/feedback.enum';

export type FeedbackDocument = Feedback & Document;

@Schema({ timestamps: true })
export class Feedback {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(FeedbackType),
    required: true,
  })
  type: FeedbackType;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({
    type: String,
    enum: Object.values(FeedbackStatus),
    default: FeedbackStatus.OPEN,
  })
  status: FeedbackStatus;

  @Prop({ default: null })
  pageUrl: string;

  @Prop({ default: null })
  browserInfo: string;

  @Prop({ default: 0 })
  upvotes: number;

  @Prop({ type: [Types.ObjectId], ref: 'User', default: [] })
  upvotedBy: Types.ObjectId[];

  @Prop({ default: null })
  resolvedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  resolvedBy: Types.ObjectId;

  @Prop({ default: null })
  closedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  closedBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export const FeedbackSchema = SchemaFactory.createForClass(Feedback);

// Indexes for better query performance
FeedbackSchema.index({ createdAt: -1 });
FeedbackSchema.index({ upvotes: -1 });
FeedbackSchema.index({ status: 1 });
FeedbackSchema.index({ type: 1 });
FeedbackSchema.index({ userId: 1 });
