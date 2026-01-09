import { User } from './user';
import { Project } from './project';

export type AffectationStatus = 'planned' | 'active' | 'completed';

export interface Affectation {
  _id: string;
  userId: User;
  projectId: Project;
  startDate: string;
  endDate: string;
  role: string;
  allocationPercentage: number;
  estimatedHours: number;
  actualHours: number;
  notes: string;
  status: AffectationStatus;
  isBillable: boolean;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export const AFFECTATION_ROLES = [
  'CTO',
  'TECH LEAD',
  'CHEF DE PROJET',
  'DEVELOPPEUR',
  'DESIGNER',
  'INGENIEUR INFORMATIQUE',
  'MARKETING LEAD',
  'SOCIAL MEDIA MANAGER',
  'RESPONSABLE MARKETING',
  'RESPONSABLE PARTENARIAT',
  'QA',
  'DEVOPS',
  'FULLSTACK',
  'FRONTEND',
  'BACKEND',
  'PROJECT MANAGER',
  'PROGRAM MANAGER',
] as const;

export type AffectationRole = typeof AFFECTATION_ROLES[number];

export interface ChargeabilityReportUser {
  userId: string;
  userName: string;
  email: string;
  avatar?: string;
  totalEstimatedHours: number;
  totalActualHours: number;
  billableHours: number;
  nonBillableHours: number;
  availableHours: number;
  chargeabilityPercent: number;
  utilizationPercent: number;
  affectations: {
    affectationId: string;
    projectId: string;
    projectName: string;
    projectKey: string;
    role: string;
    startDate: string;
    endDate: string;
    estimatedHours: number;
    actualHours: number;
    isBillable: boolean;
    allocationPercentage: number;
  }[];
}

export interface ChargeabilityReport {
  period: {
    startDate: string;
    endDate: string;
    workingDays: number;
    hoursPerDay: number;
  };
  summary: {
    totalUsers: number;
    totalAvailableHours: number;
    totalActualHours: number;
    totalBillableHours: number;
    overallChargeability: number;
    overallUtilization: number;
  };
  users: ChargeabilityReportUser[];
}

export interface ResourcePlanningProject {
  projectId: string;
  projectName: string;
  projectKey: string;
  projectLogo?: string;
  totalEstimatedHours: number;
  totalActualHours: number;
  members: {
    affectationId: string;
    userId: string;
    userName: string;
    email: string;
    avatar?: string;
    role: string;
    startDate: string;
    endDate: string;
    allocationPercentage: number;
    estimatedHours: number;
    actualHours: number;
    status: AffectationStatus;
  }[];
}

export interface ResourcePlanningReport {
  projects: ResourcePlanningProject[];
  totalProjects: number;
}

export interface UserTimelineReport {
  user: {
    userId: string;
    userName: string;
    email: string;
    avatar?: string;
  } | null;
  timeline: {
    affectationId: string;
    projectId: string;
    projectName: string;
    projectKey: string;
    projectLogo?: string;
    role: string;
    startDate: string;
    endDate: string;
    allocationPercentage: number;
    estimatedHours: number;
    actualHours: number;
    status: AffectationStatus;
    isBillable: boolean;
    notes: string;
  }[];
  summary: {
    totalAffectations: number;
    totalEstimatedHours: number;
    totalActualHours: number;
    activeProjects: number;
  };
}
