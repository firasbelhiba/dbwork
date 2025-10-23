import { UserRole } from '../enums';

export interface ProjectMember {
  userId: string;
  role: UserRole;
  addedAt: Date;
}
