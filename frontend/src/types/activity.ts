export enum ActionType {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  COMMENTED = 'commented',
  ADDED_MEMBER = 'added_member',
  REMOVED_MEMBER = 'removed_member',
  STARTED = 'started',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
  RESTORED = 'restored',
  ASSIGNED = 'assigned',
  STATUS_CHANGED = 'status_changed',
  PRIORITY_CHANGED = 'priority_changed',
}

export enum EntityType {
  ISSUE = 'issue',
  PROJECT = 'project',
  SPRINT = 'sprint',
  COMMENT = 'comment',
  USER = 'user',
}

export interface Activity {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
  action: ActionType;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  projectId?: {
    _id: string;
    name: string;
    key: string;
  };
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface ActivityResponse {
  data: Activity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ActivityStats {
  totalActivities: number;
  todayActivities: number;
  thisWeekActivities: number;
  topUsers: Array<{
    userId: string;
    firstName: string;
    lastName: string;
    count: number;
  }>;
  activityByType: Record<string, number>;
}

export interface ActivityFilters {
  page?: number;
  limit?: number;
  userId?: string;
  action?: ActionType;
  entityType?: EntityType;
  projectId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}
