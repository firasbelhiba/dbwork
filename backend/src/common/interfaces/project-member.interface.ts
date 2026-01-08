import { ProjectRole } from '../enums';

export interface ProjectMember {
  userId: string;
  projectRoles: ProjectRole[];
  addedAt: Date;
}
