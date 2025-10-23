import { User } from './user';
import { Issue } from './issue';

export interface Comment {
  _id: string;
  issueId: string | Issue;
  userId: string | User;
  content: string;
  mentions: string[];
  parentCommentId: string | Comment | null;
  reactions: CommentReaction[];
  isEdited: boolean;
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentReaction {
  userId: string | User;
  reaction: string;
}
