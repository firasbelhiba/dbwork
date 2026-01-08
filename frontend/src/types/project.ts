import { User, UserRole } from './user';

export enum ProjectRole {
  PROJECT_MANAGER = 'project_manager',
  TECH_LEAD = 'tech_lead',
  FRONTEND = 'frontend',
  BACKEND = 'backend',
  FULLSTACK = 'fullstack',
  DESIGNER = 'designer',
  QA = 'qa',
  DEVOPS = 'devops',
  MEMBER = 'member',
}

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
  organizationId?: string;
  isArchived: boolean;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMember {
  userId: string | User;
  projectRole?: ProjectRole;
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
  endDate?: Date | string | null;
  location: string;
  createdBy: User | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  // Google Calendar integration
  googleEventId?: string | null;
  googleMeetLink?: string | null;
  googleMeetId?: string | null;
  attendees?: string[];
}

export interface CreateDemoEventDto {
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  location?: string;
  createGoogleMeet?: boolean;
  inviteAllMembers?: boolean;
  attendees?: string[];
}
