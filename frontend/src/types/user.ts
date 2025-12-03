export enum UserRole {
  ADMIN = 'admin',
  PROJECT_MANAGER = 'project_manager',
  DEVELOPER = 'developer',
  VIEWER = 'viewer',
}

export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  avatar: string | null;
  role: UserRole;
  preferences: UserPreferences;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  gmailEmail?: string | null;
}

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
