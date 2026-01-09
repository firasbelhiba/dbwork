import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Issue, IssueDocument } from '../issues/schemas/issue.schema';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Affectation, AffectationDocument } from '../affectations/schemas/affectation.schema';
import {
  GlobalSearchDto,
  GlobalSearchResponse,
  SearchResultItem,
  SearchEntityType,
} from './dto/global-search.dto';

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(Issue.name) private issueModel: Model<IssueDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Affectation.name) private affectationModel: Model<AffectationDocument>,
  ) {}

  async globalSearch(
    dto: GlobalSearchDto,
    currentUserId: string,
    isAdmin: boolean,
  ): Promise<GlobalSearchResponse> {
    const startTime = Date.now();
    const { q, limit = 5, types } = dto;
    const query = q.trim();

    if (!query) {
      return {
        query: '',
        results: [],
        total: 0,
        took: 0,
      };
    }

    // Determine which entity types to search
    const searchTypes = types && types.length > 0
      ? types
      : [SearchEntityType.ISSUE, SearchEntityType.PROJECT, SearchEntityType.USER, SearchEntityType.AFFECTATION];

    // Build fuzzy-like search patterns
    const { exactPattern, fuzzyPattern, tokens } = this.buildSearchPatterns(query);

    // Execute searches in parallel
    const searchPromises: Promise<SearchResultItem[]>[] = [];

    if (searchTypes.includes(SearchEntityType.ISSUE)) {
      searchPromises.push(this.searchIssues(query, exactPattern, fuzzyPattern, tokens, limit));
    }

    if (searchTypes.includes(SearchEntityType.PROJECT)) {
      searchPromises.push(this.searchProjects(query, exactPattern, fuzzyPattern, tokens, limit));
    }

    if (searchTypes.includes(SearchEntityType.USER) && isAdmin) {
      searchPromises.push(this.searchUsers(query, exactPattern, fuzzyPattern, tokens, limit));
    }

    if (searchTypes.includes(SearchEntityType.AFFECTATION) && isAdmin) {
      searchPromises.push(this.searchAffectations(query, exactPattern, fuzzyPattern, tokens, limit));
    }

    const resultsArrays = await Promise.all(searchPromises);

    // Flatten and sort by score
    let allResults = resultsArrays.flat();
    allResults.sort((a, b) => b.score - a.score);

    // Generate suggestions for typos
    const suggestions = this.generateSuggestions(query);

    const took = Date.now() - startTime;

    return {
      query,
      results: allResults,
      total: allResults.length,
      took,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    };
  }

  private buildSearchPatterns(query: string) {
    // Escape special regex characters
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Exact pattern (case-insensitive)
    const exactPattern = new RegExp(escaped, 'i');

    // Fuzzy pattern: allow single character typos between each character
    // e.g., "test" becomes "t.?e.?s.?t"
    const fuzzyChars = escaped.split('').join('.?');
    const fuzzyPattern = new RegExp(fuzzyChars, 'i');

    // Tokenize for multi-word search
    const tokens = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);

    return { exactPattern, fuzzyPattern, tokens };
  }

  private calculateScore(
    query: string,
    matchedValue: string,
    fieldWeight: number,
    isExactMatch: boolean,
  ): number {
    let score = 0;
    const queryLower = query.toLowerCase();
    const valueLower = matchedValue.toLowerCase();

    // Exact match bonus
    if (valueLower === queryLower) {
      score += 100;
    }
    // Starts with bonus
    else if (valueLower.startsWith(queryLower)) {
      score += 75;
    }
    // Contains exact substring
    else if (valueLower.includes(queryLower)) {
      score += 50;
    }
    // Fuzzy match (lower score)
    else {
      score += 25;
    }

    // Apply field weight
    score *= fieldWeight;

    // Penalize longer results (prefer concise matches)
    const lengthPenalty = Math.max(0, 1 - (matchedValue.length - query.length) / 100);
    score *= lengthPenalty;

    return Math.round(score);
  }

  private async searchIssues(
    query: string,
    exactPattern: RegExp,
    fuzzyPattern: RegExp,
    tokens: string[],
    limit: number,
  ): Promise<SearchResultItem[]> {
    // Check if query looks like a ticket key
    const isTicketKey = /^[A-Z]{2,5}-\d+$/i.test(query);

    const searchConditions: any[] = [
      { key: { $regex: exactPattern } },
      { title: { $regex: exactPattern } },
      { description: { $regex: exactPattern } },
    ];

    // Add fuzzy conditions for non-key searches
    if (!isTicketKey) {
      searchConditions.push(
        { title: { $regex: fuzzyPattern } },
        { description: { $regex: fuzzyPattern } },
      );
    }

    const issues = await this.issueModel
      .find({ $or: searchConditions })
      .populate('projectId', 'name key')
      .populate('assignees', 'firstName lastName avatar')
      .limit(limit * 2) // Fetch more for scoring
      .lean()
      .exec();

    return issues.map((issue: any) => {
      const matchedFields: string[] = [];
      let highestScore = 0;
      const projectKey = issue.projectId?.key || '';
      const issueKey = issue.key || `${projectKey}-${issue._id.toString().slice(-4)}`;

      // Check which fields matched and calculate scores
      if (exactPattern.test(issue.key || '')) {
        matchedFields.push('key');
        const score = this.calculateScore(query, issue.key || '', 2.0, true);
        highestScore = Math.max(highestScore, score);
      }
      if (exactPattern.test(issue.title || '')) {
        matchedFields.push('title');
        const score = this.calculateScore(query, issue.title || '', 1.5, true);
        highestScore = Math.max(highestScore, score);
      }
      if (exactPattern.test(issue.description || '')) {
        matchedFields.push('description');
        const score = this.calculateScore(query, issue.description || '', 0.8, true);
        highestScore = Math.max(highestScore, score);
      }

      // Boost if ticket key pattern matches directly
      if (isTicketKey && issueKey.toUpperCase().includes(query.toUpperCase())) {
        highestScore += 50;
      }

      return {
        id: issue._id.toString(),
        type: SearchEntityType.ISSUE,
        title: issue.title,
        subtitle: issueKey,
        description: issue.description?.substring(0, 100),
        url: `/issues/${issue._id}`,
        score: highestScore,
        matchedFields,
        metadata: {
          status: issue.status,
          priority: issue.priority,
          type: issue.type,
          projectName: issue.projectId?.name,
          assignees: issue.assignees?.map((a: any) => ({
            name: `${a.firstName} ${a.lastName}`,
            avatar: a.avatar,
          })),
        },
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  }

  private async searchProjects(
    query: string,
    exactPattern: RegExp,
    fuzzyPattern: RegExp,
    tokens: string[],
    limit: number,
  ): Promise<SearchResultItem[]> {
    const searchConditions = [
      { name: { $regex: exactPattern } },
      { key: { $regex: exactPattern } },
      { description: { $regex: exactPattern } },
      { name: { $regex: fuzzyPattern } },
    ];

    const projects = await this.projectModel
      .find({
        $or: searchConditions,
        isArchived: { $ne: true },
      })
      .populate('lead', 'firstName lastName avatar')
      .limit(limit * 2)
      .lean()
      .exec();

    return projects.map((project: any) => {
      const matchedFields: string[] = [];
      let highestScore = 0;

      if (exactPattern.test(project.name || '')) {
        matchedFields.push('name');
        const score = this.calculateScore(query, project.name || '', 2.0, true);
        highestScore = Math.max(highestScore, score);
      }
      if (exactPattern.test(project.key || '')) {
        matchedFields.push('key');
        const score = this.calculateScore(query, project.key || '', 1.8, true);
        highestScore = Math.max(highestScore, score);
      }
      if (exactPattern.test(project.description || '')) {
        matchedFields.push('description');
        const score = this.calculateScore(query, project.description || '', 0.7, true);
        highestScore = Math.max(highestScore, score);
      }

      return {
        id: project._id.toString(),
        type: SearchEntityType.PROJECT,
        title: project.name,
        subtitle: project.key,
        description: project.description?.substring(0, 100),
        avatar: project.logo,
        url: `/projects/${project._id}`,
        score: highestScore,
        matchedFields,
        metadata: {
          lead: project.lead ? `${project.lead.firstName} ${project.lead.lastName}` : undefined,
          memberCount: project.members?.length || 0,
        },
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  }

  private async searchUsers(
    query: string,
    exactPattern: RegExp,
    fuzzyPattern: RegExp,
    tokens: string[],
    limit: number,
  ): Promise<SearchResultItem[]> {
    const searchConditions = [
      { firstName: { $regex: exactPattern } },
      { lastName: { $regex: exactPattern } },
      { email: { $regex: exactPattern } },
      { firstName: { $regex: fuzzyPattern } },
      { lastName: { $regex: fuzzyPattern } },
    ];

    // Also search for full name combination
    if (tokens.length >= 2) {
      searchConditions.push({
        $and: [
          { firstName: { $regex: new RegExp(tokens[0], 'i') } },
          { lastName: { $regex: new RegExp(tokens[1], 'i') } },
        ],
      } as any);
    }

    const users = await this.userModel
      .find({ $or: searchConditions })
      .select('-password -refreshToken')
      .limit(limit * 2)
      .lean()
      .exec();

    return users.map((user: any) => {
      const matchedFields: string[] = [];
      let highestScore = 0;
      const fullName = `${user.firstName} ${user.lastName}`;

      if (exactPattern.test(user.firstName || '')) {
        matchedFields.push('firstName');
        const score = this.calculateScore(query, user.firstName || '', 1.5, true);
        highestScore = Math.max(highestScore, score);
      }
      if (exactPattern.test(user.lastName || '')) {
        matchedFields.push('lastName');
        const score = this.calculateScore(query, user.lastName || '', 1.5, true);
        highestScore = Math.max(highestScore, score);
      }
      if (exactPattern.test(user.email || '')) {
        matchedFields.push('email');
        const score = this.calculateScore(query, user.email || '', 1.2, true);
        highestScore = Math.max(highestScore, score);
      }

      // Full name match bonus
      if (fullName.toLowerCase().includes(query.toLowerCase())) {
        highestScore += 30;
      }

      return {
        id: user._id.toString(),
        type: SearchEntityType.USER,
        title: fullName,
        subtitle: user.email,
        avatar: user.avatar,
        url: `/admin/users?user=${user._id}`,
        score: highestScore,
        matchedFields,
        metadata: {
          role: user.role,
          department: user.department,
          isActive: user.isActive,
        },
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  }

  private async searchAffectations(
    query: string,
    exactPattern: RegExp,
    fuzzyPattern: RegExp,
    tokens: string[],
    limit: number,
  ): Promise<SearchResultItem[]> {
    // For affectations, we search by populated user and project names
    const affectations = await this.affectationModel
      .find({})
      .populate('userId', 'firstName lastName avatar')
      .populate('projectId', 'name key logo')
      .limit(100) // Fetch more since we filter in memory
      .lean()
      .exec();

    const results: SearchResultItem[] = [];

    for (const aff of affectations as any[]) {
      const userName = aff.userId ? `${aff.userId.firstName} ${aff.userId.lastName}` : '';
      const projectName = aff.projectId?.name || '';
      const projectKey = aff.projectId?.key || '';
      const role = aff.role || '';

      const matchedFields: string[] = [];
      let highestScore = 0;

      // Check matches
      if (exactPattern.test(userName)) {
        matchedFields.push('user');
        const score = this.calculateScore(query, userName, 1.5, true);
        highestScore = Math.max(highestScore, score);
      }
      if (exactPattern.test(projectName)) {
        matchedFields.push('project');
        const score = this.calculateScore(query, projectName, 1.5, true);
        highestScore = Math.max(highestScore, score);
      }
      if (exactPattern.test(projectKey)) {
        matchedFields.push('projectKey');
        const score = this.calculateScore(query, projectKey, 1.3, true);
        highestScore = Math.max(highestScore, score);
      }
      if (exactPattern.test(role)) {
        matchedFields.push('role');
        const score = this.calculateScore(query, role, 1.0, true);
        highestScore = Math.max(highestScore, score);
      }

      if (matchedFields.length > 0) {
        results.push({
          id: aff._id.toString(),
          type: SearchEntityType.AFFECTATION,
          title: `${userName} - ${projectName}`,
          subtitle: `${role} (${aff.allocationPercentage}%)`,
          avatar: aff.userId?.avatar,
          url: `/admin/affectations?id=${aff._id}`,
          score: highestScore,
          matchedFields,
          metadata: {
            status: aff.status,
            startDate: aff.startDate,
            endDate: aff.endDate,
            isBillable: aff.isBillable,
          },
        });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private generateSuggestions(query: string): string[] {
    // Common typo corrections
    const commonTypos: Record<string, string> = {
      'devlopper': 'developer',
      'developper': 'developer',
      'developpeur': 'developer',
      'projct': 'project',
      'porject': 'project',
      'isue': 'issue',
      'isseu': 'issue',
      'taks': 'task',
      'taski': 'task',
      'bug': 'bug',
      'featur': 'feature',
      'featuer': 'feature',
    };

    const suggestions: string[] = [];
    const queryLower = query.toLowerCase();

    // Check for known typos
    for (const [typo, correction] of Object.entries(commonTypos)) {
      if (queryLower.includes(typo)) {
        suggestions.push(query.replace(new RegExp(typo, 'gi'), correction));
      }
    }

    return suggestions.slice(0, 3);
  }
}
