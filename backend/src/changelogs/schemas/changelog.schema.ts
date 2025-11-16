import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChangelogDocument = Changelog & Document;

@Schema({ timestamps: true })
export class Changelog {
  @Prop({ required: true, trim: true, unique: true })
  version: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  releaseDate: Date;

  @Prop({ type: [String], default: [] })
  features: string[];

  @Prop({ type: [String], default: [] })
  improvements: string[];

  @Prop({ type: [String], default: [] })
  bugFixes: string[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ default: false })
  isPublished: boolean;

  @Prop({ default: null })
  publishedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const ChangelogSchema = SchemaFactory.createForClass(Changelog);

// Indexes for better query performance
ChangelogSchema.index({ releaseDate: -1 });
ChangelogSchema.index({ version: 1 }, { unique: true });
ChangelogSchema.index({ createdAt: -1 });
