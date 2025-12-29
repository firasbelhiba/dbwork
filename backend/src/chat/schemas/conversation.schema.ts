import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document & {
  createdAt: Date;
  updatedAt: Date;
};

export enum ConversationType {
  DIRECT = 'direct',
  PROJECT = 'project',
}

export interface ReadReceipt {
  userId: Types.ObjectId;
  lastReadAt: Date;
  unreadCount: number;
}

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: String, enum: Object.values(ConversationType), required: true })
  type: ConversationType;

  @Prop({ type: String, default: null })
  name: string; // Project name for group chats, null for DMs

  @Prop({ type: Types.ObjectId, ref: 'Project', default: null })
  projectId: Types.ObjectId; // Only for PROJECT type

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], required: true })
  participants: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Message', default: null })
  lastMessage: Types.ObjectId;

  @Prop({ type: Date, default: null })
  lastMessageAt: Date;

  @Prop({
    type: [{
      userId: { type: Types.ObjectId, ref: 'User' },
      lastReadAt: { type: Date, default: Date.now },
      unreadCount: { type: Number, default: 0 },
    }],
    default: [],
  })
  readReceipts: ReadReceipt[];

  @Prop({ default: false })
  isArchived: boolean;

  @Prop({ type: Date, default: null })
  archivedAt: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Indexes for efficient queries
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ projectId: 1 }, { unique: true, sparse: true });
ConversationSchema.index({ type: 1 });
ConversationSchema.index({ lastMessageAt: -1 });
ConversationSchema.index({ 'readReceipts.userId': 1 });
// Compound index for finding DM between two users
ConversationSchema.index({ type: 1, participants: 1 });
