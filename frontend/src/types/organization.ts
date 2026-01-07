import { User, UserRole } from './user';

export interface OrganizationMember {
  userId: User | string;
  role: UserRole;
  addedAt: string;
}

export interface Organization {
  _id: string;
  name: string;
  key: string;
  description?: string;
  logo?: string;
  logoCloudinaryId?: string;
  creator: User | string;
  members: OrganizationMember[];
  settings: Record<string, any>;
  isArchived: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationData {
  name: string;
  key: string;
  description?: string;
  settings?: Record<string, any>;
}

export interface UpdateOrganizationData {
  name?: string;
  description?: string;
  settings?: Record<string, any>;
  isArchived?: boolean;
}

export interface AddOrganizationMemberData {
  userId: string;
  role?: UserRole;
}
