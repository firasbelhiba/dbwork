import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole } from '@common/enums';

export type OrganizationDocument = Organization & Document;

@Schema({ _id: false })
export class OrganizationMember {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: UserRole, default: UserRole.DEVELOPER })
  role: UserRole;

  @Prop({ type: Date, default: Date.now })
  addedAt: Date;
}

export const OrganizationMemberSchema = SchemaFactory.createForClass(OrganizationMember);

@Schema({ timestamps: true })
export class Organization {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  key: string;

  @Prop({ trim: true })
  description?: string;

  @Prop()
  logo?: string;

  @Prop()
  logoCloudinaryId?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  creator: Types.ObjectId;

  @Prop({ type: [OrganizationMemberSchema], default: [] })
  members: OrganizationMember[];

  @Prop({ type: Object, default: {} })
  settings: Record<string, any>;

  @Prop({ default: false })
  isArchived: boolean;

  @Prop()
  archivedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);

// Indexes
OrganizationSchema.index({ key: 1 }, { unique: true });
OrganizationSchema.index({ creator: 1 });
OrganizationSchema.index({ 'members.userId': 1 });
OrganizationSchema.index({ isArchived: 1 });
OrganizationSchema.index({ name: 'text', description: 'text' });
