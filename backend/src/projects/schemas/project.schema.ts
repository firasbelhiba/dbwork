import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ProjectMember } from '@common/interfaces';

export type ProjectDocument = Project & Document & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true })
export class Project {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  key: string;

  @Prop({ trim: true })
  description: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  lead: Types.ObjectId;

  @Prop({ type: [{
    userId: { type: Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now }
  }], default: [] })
  members: ProjectMember[];

  @Prop({ type: Object, default: {
    defaultIssueType: 'task',
    enableTimeTracking: true,
    allowAttachments: true,
    maxAttachmentSize: 10485760, // 10MB
  }})
  settings: {
    defaultIssueType: string;
    enableTimeTracking: boolean;
    allowAttachments: boolean;
    maxAttachmentSize: number;
  };

  @Prop({ default: false })
  isArchived: boolean;

  @Prop({ default: null })
  archivedAt: Date;
}

export const ProjectSchema = SchemaFactory.createForClass(Project);

// Indexes for better query performance
ProjectSchema.index({ key: 1 }, { unique: true });
ProjectSchema.index({ lead: 1 });
ProjectSchema.index({ 'members.userId': 1 });
ProjectSchema.index({ isArchived: 1 });
ProjectSchema.index({ createdAt: -1 });
