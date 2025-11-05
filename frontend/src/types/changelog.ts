import { User } from './user';

export interface IChangelog {
  _id: string;
  version: string;
  title: string;
  description: string;
  releaseDate: string;
  features: string[];
  improvements: string[];
  bugFixes: string[];
  createdBy: User | string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChangelogDto {
  version: string;
  title: string;
  description: string;
  releaseDate: string;
  features: string[];
  improvements?: string[];
  bugFixes?: string[];
}

export interface UpdateChangelogDto {
  version?: string;
  title?: string;
  description?: string;
  releaseDate?: string;
  features?: string[];
  improvements?: string[];
  bugFixes?: string[];
}

export interface QueryChangelogDto {
  page?: number;
  limit?: number;
}

export interface ChangelogListResponse {
  items: IChangelog[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
