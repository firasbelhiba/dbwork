import { User, UserRole } from './user';

export interface Project {
  _id: string;
  name: string;
  key: string;
  description: string;
  logo?: string;
  lead: User | string;
  members: ProjectMember[];
  settings: ProjectSettings;
  customStatuses: CustomStatus[];
  demoEvents: DemoEvent[];
  isArchived: boolean;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMember {
  userId: string | User;
  addedAt: Date;
}

export interface ProjectSettings {
  defaultIssueType: string;
  enableTimeTracking: boolean;
  allowAttachments: boolean;
  maxAttachmentSize: number;
}

export interface CustomStatus {
  id: string;
  name: string;
  color: string;
  order: number;
  isDefault: boolean;
}

export interface DemoEvent {
  id: string;
  title: string;
  description: string;
  date: Date | string;
  location: string;
  createdBy: User | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
