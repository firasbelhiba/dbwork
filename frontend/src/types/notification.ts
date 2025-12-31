import { User } from './user';

export enum NotificationType {
  // Issue notifications
  ISSUE_ASSIGNED = 'issue_assigned',
  ISSUE_UPDATED = 'issue_updated',
  ISSUE_COMMENTED = 'issue_commented',
  ISSUE_STATUS_CHANGED = 'issue_status_changed',
  ISSUE_PRIORITY_CHANGED = 'issue_priority_changed',
  ISSUE_DUE_DATE_CHANGED = 'issue_due_date_changed',
  // Comment notifications
  COMMENT_ON_ISSUE = 'comment_on_issue',
  COMMENT_MENTION = 'comment_mention',
  COMMENT_REPLY = 'comment_reply',
  // Mention
  MENTION = 'mention',
  // Sprint notifications
  SPRINT_STARTED = 'sprint_started',
  SPRINT_COMPLETED = 'sprint_completed',
  SPRINT_ISSUE_ADDED = 'sprint_issue_added',
  SPRINT_STARTING_SOON = 'sprint_starting_soon',
  SPRINT_ENDING_SOON = 'sprint_ending_soon',
  // Project notifications
  PROJECT_INVITATION = 'project_invitation',
  PROJECT_MEMBER_ADDED = 'project_member_added',
  PROJECT_MEMBER_REMOVED = 'project_member_removed',
  PROJECT_ROLE_CHANGED = 'project_role_changed',
  PROJECT_ARCHIVED = 'project_archived',
  PROJECT_DELETED = 'project_deleted',
  // Feedback notifications
  FEEDBACK_UPVOTED = 'feedback_upvoted',
  FEEDBACK_STATUS_CHANGED = 'feedback_status_changed',
  FEEDBACK_COMMENTED = 'feedback_commented',
  // Changelog
  NEW_CHANGELOG = 'new_changelog',
  // Chat notifications
  CHAT_MESSAGE = 'chat_message',
  CHAT_MENTION = 'chat_mention',
}

// Helper to group related notification types
export const NOTIFICATION_TYPE_GROUPS = {
  assignments: [NotificationType.ISSUE_ASSIGNED],
  updates: [
    NotificationType.ISSUE_UPDATED,
    NotificationType.ISSUE_STATUS_CHANGED,
    NotificationType.ISSUE_PRIORITY_CHANGED,
    NotificationType.ISSUE_DUE_DATE_CHANGED,
  ],
  comments: [
    NotificationType.ISSUE_COMMENTED,
    NotificationType.COMMENT_ON_ISSUE,
    NotificationType.COMMENT_REPLY,
  ],
  mentions: [
    NotificationType.MENTION,
    NotificationType.COMMENT_MENTION,
    NotificationType.CHAT_MENTION,
  ],
  sprints: [
    NotificationType.SPRINT_STARTED,
    NotificationType.SPRINT_COMPLETED,
    NotificationType.SPRINT_ISSUE_ADDED,
    NotificationType.SPRINT_STARTING_SOON,
    NotificationType.SPRINT_ENDING_SOON,
  ],
  invitations: [
    NotificationType.PROJECT_INVITATION,
    NotificationType.PROJECT_MEMBER_ADDED,
    NotificationType.PROJECT_ROLE_CHANGED,
  ],
};

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
