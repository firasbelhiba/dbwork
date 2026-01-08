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

  @Prop({ default: null })
  logo: string;

  @Prop({ default: null })
  logoCloudinaryId: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  lead: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: false })
  organizationId?: Types.ObjectId;

  @Prop({ type: [{
    userId: { type: Types.ObjectId, ref: 'User' },
    projectRoles: { type: [String], default: ['member'] },
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

  @Prop({ type: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    color: { type: String, required: true },
    order: { type: Number, required: true },
    isDefault: { type: Boolean, default: false }
  }], default: [
    { id: 'todo', name: 'To Do', color: 'bg-gray-100', order: 0, isDefault: true },
    { id: 'in_progress', name: 'In Progress', color: 'bg-blue-100', order: 1, isDefault: true },
    { id: 'in_review', name: 'In Review', color: 'bg-purple-100', order: 2, isDefault: true },
    { id: 'done', name: 'Done', color: 'bg-green-100', order: 3, isDefault: true },
  ]})
  customStatuses: {
    id: string;
    name: string;
    color: string;
    order: number;
    isDefault: boolean;
  }[];

  @Prop({ type: [{
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    date: { type: Date, required: true },
    endDate: { type: Date, default: null }, // Optional end date/time
    location: { type: String, default: '' },
    createdBy: { type: Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    // Google Calendar integration
    googleEventId: { type: String, default: null },
    googleMeetLink: { type: String, default: null },
    googleMeetId: { type: String, default: null },
    attendees: { type: [String], default: [] }, // Email addresses of attendees
  }], default: [] })
  demoEvents: {
    id: string;
    title: string;
    description: string;
    date: Date;
    endDate: Date | null;
    location: string;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    googleEventId: string | null;
    googleMeetLink: string | null;
    googleMeetId: string | null;
    attendees: string[];
  }[];

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
ProjectSchema.index({ organizationId: 1 });
