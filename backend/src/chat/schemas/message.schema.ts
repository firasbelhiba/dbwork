import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document & {
  createdAt: Date;
  updatedAt: Date;
};

export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  IMAGE = 'image',
  SYSTEM = 'system', // For "user joined", "user left", etc.
}

export interface MessageAttachment {
  url: string;
  cloudinaryId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  thumbnail?: string;
}

export interface MessageReaction {
  userId: Types.ObjectId;
  reaction: string;
}

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  conversationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(MessageType), default: MessageType.TEXT })
  type: MessageType;

  @Prop({ required: true })
  content: string;

  @Prop({
    type: [{
      url: String,
      cloudinaryId: String,
      fileName: String,
      fileSize: Number,
      mimeType: String,
      thumbnail: String,
    }],
    default: [],
  })
  attachments: MessageAttachment[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  mentions: Types.ObjectId[]; // User IDs mentioned with @

  @Prop({ type: Types.ObjectId, ref: 'Message', default: null })
  replyTo: Types.ObjectId; // For threaded replies

  @Prop({
    type: [{
      userId: { type: Types.ObjectId, ref: 'User' },
      reaction: String,
    }],
    default: [],
  })
  reactions: MessageReaction[];

  @Prop({ default: false })
  isEdited: boolean;

  @Prop({ type: Date, default: null })
  editedAt: Date;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Indexes for efficient queries
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1 });
MessageSchema.index({ mentions: 1 });
MessageSchema.index({ createdAt: -1 });
// Compound index for cursor-based pagination
MessageSchema.index({ conversationId: 1, _id: -1 });
