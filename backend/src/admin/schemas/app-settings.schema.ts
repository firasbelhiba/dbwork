import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AppSettingsDocument = AppSettings & Document;

@Schema({ timestamps: true })
export class AppSettings {
  @Prop({ type: String, default: 'app_settings', unique: true })
  key: string;

  // Timer Auto-Stop Settings
  @Prop({ type: Number, default: 17 }) // 5 PM (17:00)
  timerAutoStopHour: number;

  @Prop({ type: Number, default: 30 }) // 30 minutes
  timerAutoStopMinute: number;

  @Prop({ type: Boolean, default: true })
  timerAutoStopEnabled: boolean;

  @Prop({ type: String, default: 'Africa/Tunis' })
  timerAutoStopTimezone: string;

  // Only run on weekdays (Monday-Friday)
  @Prop({ type: Boolean, default: true })
  timerAutoStopWeekdaysOnly: boolean;
}

export const AppSettingsSchema = SchemaFactory.createForClass(AppSettings);
