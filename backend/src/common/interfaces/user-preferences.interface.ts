export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  emailNotifications: EmailNotificationPreferences;
  language: string;
}

export interface EmailNotificationPreferences {
  issueAssigned: boolean;
  issueUpdated: boolean;
  issueCommented: boolean;
  mentions: boolean;
  sprintUpdates: boolean;
}
