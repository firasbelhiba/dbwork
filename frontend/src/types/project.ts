import { User, UserRole } from './user';

export interface Project {
  _id: string;
  name: string;
  key: string;
  description: string;
  lead: User | string;
  members: ProjectMember[];
  settings: ProjectSettings;
  isArchived: boolean;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMember {
  userId: string | User;
  role: UserRole;
  addedAt: Date;
}

export interface ProjectSettings {
  defaultIssueType: string;
  enableTimeTracking: boolean;
  allowAttachments: boolean;
  maxAttachmentSize: number;
}
