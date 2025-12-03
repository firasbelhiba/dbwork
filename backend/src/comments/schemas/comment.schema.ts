import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommentDocument = Comment & Document;

export interface CommentImage {
  url: string;
  cloudinaryId: string;
  fileName?: string;
}

@Schema({ timestamps: true })
export class Comment {
  @Prop({ type: Types.ObjectId, ref: 'Issue', required: true })
  issueId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [{ url: String, cloudinaryId: String, fileName: String }], default: [] })
  images: CommentImage[];

  @Prop({ type: [String], default: [] })
  mentions: string[];

  @Prop({ type: Types.ObjectId, ref: 'Comment', default: null })
  parentCommentId: Types.ObjectId;

  @Prop({ type: [{ userId: { type: Types.ObjectId, ref: 'User' }, reaction: String }], default: [] })
  reactions: Array<{ userId: Types.ObjectId; reaction: string }>;

  @Prop({ default: false })
  isEdited: boolean;

  @Prop()
  editedAt: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

// Indexes for better query performance
CommentSchema.index({ issueId: 1, createdAt: -1 });
CommentSchema.index({ userId: 1 });
CommentSchema.index({ parentCommentId: 1 });
