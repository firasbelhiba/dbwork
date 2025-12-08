import { User } from './user';
import { Project } from './project';
import { Sprint } from './sprint';

export enum IssueType {
  BUG = 'bug',
  TASK = 'task',
  STORY = 'story',
  EPIC = 'epic',
}

export enum IssuePriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum IssueStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  IN_REVIEW = 'in_review',
  TESTING = 'testing',
  DONE = 'done',
}

export interface Issue {
  _id: string;
  projectId: string | Project;
  key: string;
  title: string;
  description: string;
  type: IssueType;
  priority: IssuePriority;
  status: IssueStatus;
  assignees: (User | string)[];
  reporter: User | string;
  labels: string[];
  category?: string | null;
  customFields: Record<string, any>;
  timeTracking: TimeTracking;
  attachments: string[];
  sprintId: string | Sprint | null;
  dueDate: Date | null;
  storyPoints: number;
  watchers: (User | string)[];
  blockedBy: (Issue | string)[];
  blocks: (Issue | string)[];
  parentIssue: Issue | string | null;
  subIssueCount?: number;
  completedSubIssues?: number;
  subIssueProgress?: number;
  order: number;
  isArchived?: boolean;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeTracking {
  estimatedHours?: number;
  loggedHours: number;
  timeLogs: TimeLog[];
  timeEntries: TimeEntry[];
  activeTimeEntry?: ActiveTimeEntry | null;
  totalTimeSpent: number;
}

export interface TimeLog {
  userId: string;
  hours: number;
  description?: string;
  date: Date;
}

export interface TimeEntry {
  id: string;
  userId: string;
  startTime: string;
  endTime: string;
  duration: number;
  source: 'automatic' | 'manual';
  description?: string;
  pausedDuration?: number;
  createdAt: string;
}

export interface ActiveTimeEntry {
  id: string;
  userId: string;
  startTime: string;
  lastActivityAt: string;
  isPaused: boolean;
  pausedAt?: string;
  accumulatedPausedTime: number;
  autoPausedEndOfDay?: boolean; // True when auto-paused at end of work day
  isExtraHours?: boolean; // True when timer resumed after end-of-day auto-pause
  extraHoursStartedAt?: string; // When extra hours tracking started
}
