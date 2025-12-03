import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FeedbackCommentDocument = FeedbackComment & Document;

export interface FeedbackCommentImage {
  url: string;
  cloudinaryId: string;
  fileName?: string;
}

@Schema({ timestamps: true })
export class FeedbackComment {
  @Prop({ type: Types.ObjectId, ref: 'Feedback', required: true })
  feedbackId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  content: string;

  @Prop({ type: [{ url: String, cloudinaryId: String, fileName: String }], default: [] })
  images: FeedbackCommentImage[];

  @Prop({ default: false })
  isEdited: boolean;

  @Prop()
  editedAt: Date;
}

export const FeedbackCommentSchema = SchemaFactory.createForClass(FeedbackComment);

// Indexes for better query performance
FeedbackCommentSchema.index({ feedbackId: 1, createdAt: -1 });
FeedbackCommentSchema.index({ userId: 1 });
