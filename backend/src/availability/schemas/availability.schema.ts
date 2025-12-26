import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AvailabilityDocument = Availability & Document;

export enum AvailabilityStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  OUT_OF_OFFICE = 'out_of_office',
  VACATION = 'vacation',
  SICK = 'sick',
  MEETING = 'meeting',
}

@Schema({ timestamps: true })
export class Availability {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  date: Date;

  @Prop({
    type: String,
    enum: Object.values(AvailabilityStatus),
    default: AvailabilityStatus.AVAILABLE,
  })
  status: AvailabilityStatus;

  @Prop({ trim: true })
  note: string;

  @Prop({ default: false })
  isAllDay: boolean;

  @Prop()
  startTime: string; // HH:mm format

  @Prop()
  endTime: string; // HH:mm format

  createdAt?: Date;
  updatedAt?: Date;
}

export const AvailabilitySchema = SchemaFactory.createForClass(Availability);

// Indexes for better query performance
AvailabilitySchema.index({ userId: 1, date: 1 });
AvailabilitySchema.index({ date: 1 });
AvailabilitySchema.index({ userId: 1, date: 1, isAllDay: 1 });
