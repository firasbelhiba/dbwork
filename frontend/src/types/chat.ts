import { User } from './user';

export enum ConversationType {
  DIRECT = 'direct',
  PROJECT = 'project',
}

export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  IMAGE = 'image',
  SYSTEM = 'system',
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
  userId: string;
  reaction: string;
}

export interface ReadReceipt {
  userId: string;
  lastReadAt: string;
  unreadCount: number;
}

export interface ChatMessage {
  _id: string;
  conversationId: string;
  senderId: User | string;
  type: MessageType;
  content: string;
  attachments: MessageAttachment[];
  mentions: User[] | string[];
  replyTo?: ChatMessage | string;
  reactions: MessageReaction[];
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  _id: string;
  type: ConversationType;
  name?: string;
  projectId?: string;
  participants: User[];
  lastMessage?: ChatMessage;
  lastMessageAt?: string;
  readReceipts: ReadReceipt[];
  isArchived: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMessageDto {
  content: string;
  type?: MessageType;
  replyTo?: string;
  mentions?: string[];
}

export interface UpdateMessageDto {
  content: string;
}

export interface QueryMessagesDto {
  limit?: number;
  before?: string;
  after?: string;
}

export interface MessagesResponse {
  messages: ChatMessage[];
  hasMore: boolean;
}

export interface TypingUser {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}
