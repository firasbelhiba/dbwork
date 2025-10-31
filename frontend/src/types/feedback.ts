import { User } from './user';

export enum FeedbackType {
  BUG = 'bug',
  FEATURE_REQUEST = 'feature_request',
  IMPROVEMENT = 'improvement',
  OTHER = 'other',
}

export enum FeedbackStatus {
  OPEN = 'open',
  RESOLVED = 'resolved',
}

export interface Feedback {
  _id: string;
  userId: User;
  type: FeedbackType;
  title: string;
  description: string;
  status: FeedbackStatus;
  upvotes: number;
  upvotedBy: string[];
  pageUrl?: string;
  browserInfo?: string;
  resolvedAt?: string;
  resolvedBy?: User;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedbackDto {
  type: FeedbackType;
  title: string;
  description: string;
  pageUrl?: string;
  browserInfo?: string;
}

export interface UpdateFeedbackDto {
  type?: FeedbackType;
  title?: string;
  description?: string;
  pageUrl?: string;
  browserInfo?: string;
}

export interface FeedbackQueryParams {
  page?: number;
  limit?: number;
  type?: FeedbackType;
  status?: FeedbackStatus;
  search?: string;
  sortBy?: 'recent' | 'oldest' | 'most_upvoted';
  userId?: string;
}
