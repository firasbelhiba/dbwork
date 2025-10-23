import { Project } from './project';
import { Issue } from './issue';

export enum SprintStatus {
  PLANNED = 'planned',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

export interface Sprint {
  _id: string;
  projectId: string | Project;
  name: string;
  goal: string;
  startDate: Date;
  endDate: Date;
  status: SprintStatus;
  issues: (Issue | string)[];
  completedPoints: number;
  totalPoints: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
