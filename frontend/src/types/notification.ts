import { User } from './user';

export enum NotificationType {
  ISSUE_ASSIGNED = 'issue_assigned',
  ISSUE_UPDATED = 'issue_updated',
  ISSUE_COMMENTED = 'issue_commented',
  MENTION = 'mention',
  SPRINT_STARTED = 'sprint_started',
  SPRINT_COMPLETED = 'sprint_completed',
  PROJECT_INVITATION = 'project_invitation',
}

export interface Notification {
  _id: string;
  userId: string | User;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  link: string;
  metadata: Record<string, any>;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
