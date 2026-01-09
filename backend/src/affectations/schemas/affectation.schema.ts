import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AffectationDocument = Affectation & Document & {
  createdAt: Date;
  updatedAt: Date;
};

export enum AffectationStatus {
  PLANNED = 'planned',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

export const AFFECTATION_ROLES = [
  'CTO',
  'TECH LEAD',
  'CHEF DE PROJET',
  'DEVELOPPEUR',
  'DESIGNER',
  'INGENIEUR INFORMATIQUE',
  'MARKETING LEAD',
  'SOCIAL MEDIA MANAGER',
  'RESPONSABLE MARKETING',
  'RESPONSABLE PARTENARIAT',
  'QA',
  'DEVOPS',
  'FULLSTACK',
  'FRONTEND',
  'BACKEND',
  'PROJECT MANAGER',
  'PROGRAM MANAGER',
] as const;

@Schema({ timestamps: true })
export class Affectation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  projectId: Types.ObjectId;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({ required: true })
  role: string;

  @Prop({ default: 100, min: 0, max: 100 })
  allocationPercentage: number;

  @Prop({ default: 0 })
  estimatedHours: number;

  @Prop({ default: 0 })
  actualHours: number;

  @Prop({ default: '' })
  notes: string;

  @Prop({
    type: String,
    enum: Object.values(AffectationStatus),
    default: AffectationStatus.PLANNED
  })
  status: AffectationStatus;

  @Prop({ default: true })
  isBillable: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;
}

export const AffectationSchema = SchemaFactory.createForClass(Affectation);

// Indexes for common queries
AffectationSchema.index({ userId: 1 });
AffectationSchema.index({ projectId: 1 });
AffectationSchema.index({ startDate: 1 });
AffectationSchema.index({ endDate: 1 });
AffectationSchema.index({ status: 1 });
AffectationSchema.index({ userId: 1, projectId: 1, startDate: 1 });
AffectationSchema.index({ projectId: 1, startDate: 1, endDate: 1 });
