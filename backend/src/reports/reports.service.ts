import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Issue, IssueDocument } from '@issues/schemas/issue.schema';
import { Sprint, SprintDocument } from '@sprints/schemas/sprint.schema';
import { Project, ProjectDocument } from '@projects/schemas/project.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Issue.name) private issueModel: Model<IssueDocument>,
    @InjectModel(Sprint.name) private sprintModel: Model<SprintDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
  ) {}

  async getProjectProgress(projectId: string): Promise<any> {
    const mongoose = require('mongoose');
    const issues = await this.issueModel.find({ projectId: new mongoose.Types.ObjectId(projectId) }).exec();

    const total = issues.length;
    const byStatus = issues.reduce((acc, issue) => {
      acc[issue.status] = (acc[issue.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = issues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byPriority = issues.reduce((acc, issue) => {
      acc[issue.priority] = (acc[issue.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const completed = byStatus['done'] || 0;
    const inProgress = byStatus['in_progress'] || 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      projectId,
      total,
      completed,
      inProgress,
      completionRate,
      byStatus,
      byType,
      byPriority,
    };
  }

  async getTeamPerformance(projectId?: string): Promise<any> {
    const mongoose = require('mongoose');
    const query: any = {};
    if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId);

    const issues = await this.issueModel
      .find(query)
      .populate('assignees', 'firstName lastName email')
      .exec();

    const performanceByUser: Record<string, any> = {};

    issues.forEach((issue) => {
      if (!issue.assignees || issue.assignees.length === 0) return;

      // Count issue for each assignee
      issue.assignees.forEach((assignee: any) => {
        const userId = assignee._id.toString();
        if (!performanceByUser[userId]) {
          performanceByUser[userId] = {
            user: assignee,
            total: 0,
            completed: 0,
            inProgress: 0,
            todo: 0,
            storyPoints: 0,
          };
        }

        performanceByUser[userId].total++;
        if (issue.status === 'done') performanceByUser[userId].completed++;
        if (issue.status === 'in_progress') performanceByUser[userId].inProgress++;
        if (issue.status === 'todo') performanceByUser[userId].todo++;
        performanceByUser[userId].storyPoints += issue.storyPoints || 0;
      });
    });

    return Object.values(performanceByUser);
  }

  async getIssueStatistics(projectId?: string): Promise<any> {
    const mongoose = require('mongoose');
    const query: any = {};
    if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId);

    const issues = await this.issueModel.find(query).exec();

    const statistics = {
      total: issues.length,
      bugs: issues.filter((i) => i.type === 'bug').length,
      tasks: issues.filter((i) => i.type === 'task').length,
      stories: issues.filter((i) => i.type === 'story').length,
      epics: issues.filter((i) => i.type === 'epic').length,
      critical: issues.filter((i) => i.priority === 'critical').length,
      high: issues.filter((i) => i.priority === 'high').length,
      medium: issues.filter((i) => i.priority === 'medium').length,
      low: issues.filter((i) => i.priority === 'low').length,
      avgStoryPoints:
        issues.length > 0
          ? Math.round(
              issues.reduce((sum, i) => sum + (i.storyPoints || 0), 0) /
                issues.length,
            )
          : 0,
    };

    return statistics;
  }

  async getSprintBurndown(sprintId: string): Promise<any> {
    const sprint = await this.sprintModel
      .findById(sprintId)
      .populate('issues')
      .exec();

    if (!sprint) {
      throw new Error('Sprint not found');
    }

    const issues = sprint.issues as any[];
    const totalPoints = issues.reduce((sum, i) => sum + (i.storyPoints || 0), 0);
    const completedPoints = issues
      .filter((i) => i.status === 'done')
      .reduce((sum, i) => sum + (i.storyPoints || 0), 0);

    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);
    const totalDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const burndownData: any[] = [];
    const pointsPerDay = totalPoints / totalDays;

    for (let i = 0; i <= totalDays; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      burndownData.push({
        day: i,
        date: date.toISOString().split('T')[0],
        idealRemaining: Math.max(0, totalPoints - pointsPerDay * i),
        actualRemaining: i === totalDays ? totalPoints - completedPoints : null,
      });
    }

    return {
      sprintId,
      sprintName: sprint.name,
      totalPoints,
      completedPoints,
      remainingPoints: totalPoints - completedPoints,
      burndownData,
    };
  }

  async getVelocityTrend(projectId: string, sprintCount: number = 5): Promise<any> {
    const sprints = await this.sprintModel
      .find({ projectId, status: 'completed' })
      .sort({ completedAt: -1 })
      .limit(sprintCount)
      .exec();

    const velocityData = sprints.reverse().map((sprint) => ({
      sprintName: sprint.name,
      completedPoints: sprint.completedPoints,
      totalPoints: sprint.totalPoints,
      completedAt: sprint.completedAt,
    }));

    const avgVelocity =
      sprints.length > 0
        ? Math.round(
            sprints.reduce((sum, s) => sum + s.completedPoints, 0) / sprints.length,
          )
        : 0;

    return {
      projectId,
      velocityData,
      averageVelocity: avgVelocity,
      sprintsAnalyzed: sprints.length,
    };
  }

  async getTimeTracking(projectId?: string): Promise<any> {
    const mongoose = require('mongoose');
    const query: any = {};
    if (projectId) query.projectId = new mongoose.Types.ObjectId(projectId);

    const issues = await this.issueModel.find(query).exec();

    const totalEstimated = issues.reduce(
      (sum, i) => sum + (i.timeTracking.estimatedHours || 0),
      0,
    );
    const totalLogged = issues.reduce(
      (sum, i) => sum + i.timeTracking.loggedHours,
      0,
    );

    return {
      totalEstimatedHours: totalEstimated,
      totalLoggedHours: totalLogged,
      variance: totalLogged - totalEstimated,
      issuesWithTracking: issues.filter((i) => i.timeTracking.loggedHours > 0).length,
    };
  }

  async getStatusDistribution(projectId: string): Promise<any> {
    const mongoose = require('mongoose');

    // Get project with custom statuses
    const project = await this.projectModel.findById(new mongoose.Types.ObjectId(projectId)).exec();
    if (!project) {
      throw new Error('Project not found');
    }

    // Get all issues for the project
    const issues = await this.issueModel.find({ projectId: new mongoose.Types.ObjectId(projectId) }).exec();

    // Count issues per status
    const statusCounts = issues.reduce((acc, issue) => {
      acc[issue.status] = (acc[issue.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Map status IDs to status names and colors
    const distribution = project.customStatuses.map((status: any) => ({
      name: status.name,
      count: statusCounts[status.id] || 0,
      color: status.color || '#6B7280',
    }));

    return { projectId, distribution };
  }

  async getTeamWorkloadBreakdown(projectId: string): Promise<any> {
    const mongoose = require('mongoose');

    // Get project with custom statuses
    const project = await this.projectModel.findById(new mongoose.Types.ObjectId(projectId)).exec();
    if (!project) {
      throw new Error('Project not found');
    }

    // Find status IDs for todo, in progress, and done
    const todoStatus = project.customStatuses.find((s: any) => s.name.toLowerCase().includes('todo') || s.name.toLowerCase().includes('to do'));
    const inProgressStatus = project.customStatuses.find((s: any) => s.name.toLowerCase().includes('progress'));
    const doneStatus = project.customStatuses.find((s: any) => s.name.toLowerCase() === 'done');

    const issues = await this.issueModel
      .find({ projectId: new mongoose.Types.ObjectId(projectId) })
      .populate('assignees', 'firstName lastName')
      .exec();

    const workloadByUser: Record<string, any> = {};

    issues.forEach((issue) => {
      if (!issue.assignees || issue.assignees.length === 0) return;

      // Count issue for each assignee
      issue.assignees.forEach((assignee: any) => {
        const userId = assignee._id.toString();
        const userName = `${assignee.firstName} ${assignee.lastName}`;

        if (!workloadByUser[userId]) {
          workloadByUser[userId] = {
            name: userName,
            todo: 0,
            inProgress: 0,
            done: 0,
          };
        }

        if (todoStatus && issue.status === todoStatus.id) {
          workloadByUser[userId].todo++;
        } else if (inProgressStatus && issue.status === inProgressStatus.id) {
          workloadByUser[userId].inProgress++;
        } else if (doneStatus && issue.status === doneStatus.id) {
          workloadByUser[userId].done++;
        }
      });
    });

    return { projectId, workload: Object.values(workloadByUser) };
  }

  async getIssueCreationTrend(projectId: string, days: number = 30): Promise<any> {
    const mongoose = require('mongoose');
    const issues = await this.issueModel
      .find({ projectId: new mongoose.Types.ObjectId(projectId) })
      .sort({ createdAt: 1 })
      .exec();

    if (issues.length === 0) {
      return { projectId, trend: [] };
    }

    // Group issues by date
    const issuesByDate: Record<string, number> = {};
    issues.forEach((issue) => {
      const date = new Date(issue.createdAt).toISOString().split('T')[0];
      issuesByDate[date] = (issuesByDate[date] || 0) + 1;
    });

    // Generate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const trend: any[] = [];
    let cumulative = 0;

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const count = issuesByDate[dateStr] || 0;
      cumulative += count;

      trend.push({
        date: dateStr,
        count,
        cumulative,
      });
    }

    return { projectId, trend };
  }

  async getMyCreatedTasksStats(userId: string, daysParam?: string): Promise<any> {
    const mongoose = require('mongoose');

    // Parse days parameter
    let days: number | null = null;
    if (daysParam && daysParam !== 'all') {
      days = parseInt(daysParam, 10);
      if (isNaN(days)) days = null;
    }

    // Build query for issues created by this user
    const query: any = { reporter: new mongoose.Types.ObjectId(userId) };

    // Add date filter if days is specified
    let startDate: Date | null = null;
    if (days) {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      query.createdAt = { $gte: startDate };
    }

    const issues = await this.issueModel
      .find(query)
      .sort({ createdAt: 1 })
      .exec();

    if (issues.length === 0) {
      return {
        summary: {
          total: 0,
          completed: 0,
          inProgress: 0,
          todo: 0,
          completionRate: 0,
        },
        byStatus: [],
        byType: [],
        byPriority: [],
        creationTrend: [],
        completionTrend: [],
        dateRange: {
          start: startDate ? startDate.toISOString() : null,
          end: new Date().toISOString(),
        },
      };
    }

    // Calculate summary statistics
    // Map common status patterns to categories
    const getStatusCategory = (status: string): string => {
      const s = status.toLowerCase();
      if (s === 'done' || s.includes('complete') || s.includes('closed') || s.includes('resolved')) {
        return 'completed';
      }
      if (s.includes('progress') || s.includes('review') || s.includes('testing')) {
        return 'inProgress';
      }
      return 'todo';
    };

    let completed = 0;
    let inProgress = 0;
    let todo = 0;

    // Count by status categories
    const statusCounts: Record<string, number> = {};
    const typeCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = {};

    issues.forEach((issue) => {
      // Status category
      const category = getStatusCategory(issue.status);
      if (category === 'completed') completed++;
      else if (category === 'inProgress') inProgress++;
      else todo++;

      // Raw status counts
      statusCounts[issue.status] = (statusCounts[issue.status] || 0) + 1;

      // Type counts
      typeCounts[issue.type] = (typeCounts[issue.type] || 0) + 1;

      // Priority counts
      priorityCounts[issue.priority] = (priorityCounts[issue.priority] || 0) + 1;
    });

    const total = issues.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Status colors mapping
    const statusColors: Record<string, string> = {
      todo: '#6B7280',
      in_progress: '#3B82F6',
      in_review: '#8B5CF6',
      done: '#22C55E',
    };

    // Convert to arrays
    const byStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      color: statusColors[status] || '#6B7280',
    }));

    const typeColors: Record<string, string> = {
      bug: '#EF4444',
      task: '#3B82F6',
      story: '#22C55E',
      epic: '#8B5CF6',
    };

    const byType = Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count,
      color: typeColors[type] || '#6B7280',
    }));

    const priorityColors: Record<string, string> = {
      critical: '#EF4444',
      high: '#F97316',
      medium: '#EAB308',
      low: '#22C55E',
    };

    const byPriority = Object.entries(priorityCounts).map(([priority, count]) => ({
      priority,
      count,
      color: priorityColors[priority] || '#6B7280',
    }));

    // Generate creation trend
    const issuesByDate: Record<string, number> = {};
    issues.forEach((issue) => {
      const date = new Date(issue.createdAt).toISOString().split('T')[0];
      issuesByDate[date] = (issuesByDate[date] || 0) + 1;
    });

    // Determine date range for trend
    const endDate = new Date();
    const trendStartDate = startDate || new Date(issues[0].createdAt);

    const creationTrend: any[] = [];
    let cumulative = 0;

    // For longer periods, aggregate by week
    const daysDiff = Math.ceil((endDate.getTime() - trendStartDate.getTime()) / (1000 * 60 * 60 * 24));
    const aggregateByWeek = daysDiff > 60;

    if (aggregateByWeek) {
      // Aggregate by week
      const weeklyData: Record<string, { count: number; weekStart: string }> = {};

      for (let d = new Date(trendStartDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const count = issuesByDate[dateStr] || 0;

        // Get week start (Monday)
        const weekStart = new Date(d);
        const day = weekStart.getDay();
        const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
        weekStart.setDate(diff);
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { count: 0, weekStart: weekKey };
        }
        weeklyData[weekKey].count += count;
      }

      // Convert to array with cumulative
      Object.values(weeklyData)
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
        .forEach((week) => {
          cumulative += week.count;
          creationTrend.push({
            date: week.weekStart,
            count: week.count,
            cumulative,
          });
        });
    } else {
      // Daily aggregation
      for (let d = new Date(trendStartDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const count = issuesByDate[dateStr] || 0;
        cumulative += count;

        creationTrend.push({
          date: dateStr,
          count,
          cumulative,
        });
      }
    }

    // Generate completion trend (issues completed by date)
    const completedIssuesByDate: Record<string, number> = {};
    issues.forEach((issue: any) => {
      const category = getStatusCategory(issue.status);
      if (category === 'completed') {
        // Use completedAt if available, otherwise fall back to updatedAt
        const completionDate = issue.completedAt || issue.updatedAt;
        if (completionDate) {
          const date = new Date(completionDate).toISOString().split('T')[0];
          completedIssuesByDate[date] = (completedIssuesByDate[date] || 0) + 1;
        }
      }
    });

    const completionTrend: any[] = [];
    let completedCumulative = 0;

    if (aggregateByWeek) {
      // Aggregate by week for completion trend
      const weeklyCompletionData: Record<string, { count: number; weekStart: string }> = {};

      for (let d = new Date(trendStartDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const count = completedIssuesByDate[dateStr] || 0;

        // Get week start (Monday)
        const weekStart = new Date(d);
        const day = weekStart.getDay();
        const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
        weekStart.setDate(diff);
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!weeklyCompletionData[weekKey]) {
          weeklyCompletionData[weekKey] = { count: 0, weekStart: weekKey };
        }
        weeklyCompletionData[weekKey].count += count;
      }

      // Convert to array with cumulative
      Object.values(weeklyCompletionData)
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
        .forEach((week) => {
          completedCumulative += week.count;
          completionTrend.push({
            date: week.weekStart,
            count: week.count,
            cumulative: completedCumulative,
          });
        });
    } else {
      // Daily aggregation for completion trend
      for (let d = new Date(trendStartDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const count = completedIssuesByDate[dateStr] || 0;
        completedCumulative += count;

        completionTrend.push({
          date: dateStr,
          count,
          cumulative: completedCumulative,
        });
      }
    }

    return {
      summary: {
        total,
        completed,
        inProgress,
        todo,
        completionRate,
      },
      byStatus,
      byType,
      byPriority,
      creationTrend,
      completionTrend,
      dateRange: {
        start: trendStartDate.toISOString(),
        end: endDate.toISOString(),
      },
    };
  }
}
