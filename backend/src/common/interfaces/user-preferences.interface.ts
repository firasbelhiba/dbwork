export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  emailNotifications: EmailNotificationPreferences;
  notificationPreferences: NotificationPreferences;
  language: string;
}

export interface EmailNotificationPreferences {
  issueAssigned: boolean;
  issueUpdated: boolean;
  issueCommented: boolean;
  mentions: boolean;
  sprintUpdates: boolean;
}

export interface NotificationPreferences {
  // Issue notifications
  issue_assigned: boolean;
  issue_updated: boolean;
  issue_commented: boolean;
  issue_status_changed: boolean;
  issue_priority_changed: boolean;
  issue_due_date_changed: boolean;

  // Comment notifications
  comment_on_issue: boolean;
  comment_mention: boolean;
  comment_reply: boolean;

  // General mentions
  mention: boolean;

  // Sprint notifications
  sprint_started: boolean;
  sprint_completed: boolean;
  sprint_issue_added: boolean;
  sprint_starting_soon: boolean;
  sprint_ending_soon: boolean;

  // Project notifications
  project_invitation: boolean;
  project_member_added: boolean;
  project_member_removed: boolean;
  project_role_changed: boolean;
  project_archived: boolean;
  project_deleted: boolean;

  // Feedback notifications
  feedback_upvoted: boolean;
  feedback_status_changed: boolean;
  feedback_commented: boolean;

  // Changelog notifications
  new_changelog: boolean;
}
