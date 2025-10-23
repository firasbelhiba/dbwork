import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SprintStatus } from '@common/enums';

export type SprintDocument = Sprint & Document;

@Schema({ timestamps: true })
export class Sprint {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  projectId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  goal: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  endDate: Date;

  @Prop({
    type: String,
    enum: Object.values(SprintStatus),
    default: SprintStatus.PLANNED
  })
  status: SprintStatus;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Issue' }], default: [] })
  issues: Types.ObjectId[];

  @Prop({ type: Number, default: 0 })
  completedPoints: number;

  @Prop({ type: Number, default: 0 })
  totalPoints: number;

  @Prop()
  completedAt: Date;
}

export const SprintSchema = SchemaFactory.createForClass(Sprint);

// Indexes for better query performance
SprintSchema.index({ projectId: 1, status: 1 });
SprintSchema.index({ projectId: 1, startDate: -1 });
SprintSchema.index({ status: 1 });
SprintSchema.index({ startDate: 1, endDate: 1 });
