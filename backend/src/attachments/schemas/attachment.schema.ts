import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AttachmentDocument = Attachment & Document;

@Schema({ timestamps: true })
export class Attachment {
  @Prop({ type: Types.ObjectId, ref: 'Issue', required: true })
  issueId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  cloudinaryId: string;

  @Prop({ default: null })
  thumbnail: string;
}

export const AttachmentSchema = SchemaFactory.createForClass(Attachment);

// Indexes for better query performance
AttachmentSchema.index({ issueId: 1, createdAt: -1 });
AttachmentSchema.index({ userId: 1 });
AttachmentSchema.index({ mimeType: 1 });
