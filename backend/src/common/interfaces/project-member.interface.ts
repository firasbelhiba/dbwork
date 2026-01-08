import { ProjectRole } from '../enums';

export interface ProjectMember {
  userId: string;
  projectRole: ProjectRole;
  addedAt: Date;
}
