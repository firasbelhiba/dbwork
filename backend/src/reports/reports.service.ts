import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Issue, IssueDocument } from '@issues/schemas/issue.schema';
import { Sprint, SprintDocument } from '@sprints/schemas/sprint.schema';
import { Project, ProjectDocument } from '@projects/schemas/project.schema';
import { User, UserDocument } from '@users/schemas/user.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Issue.name) private issueModel: Model<IssueDocument>,
    @InjectModel(Sprint.name) private sprintModel: Model<SprintDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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
          inReview: 0,
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
      if (s.includes('review') || s.includes('testing')) {
        return 'inReview';
      }
      if (s.includes('progress')) {
        return 'inProgress';
      }
      return 'todo';
    };

    let completed = 0;
    let inReview = 0;
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
      else if (category === 'inReview') inReview++;
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
        inReview,
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

  // ============================================
  // NEW ADMIN REPORTS - Time & Attendance
  // ============================================

  /**
   * Get time attendance report for all users
   * Shows daily work hours, extra hours, and comparison to 8h target
   */
  async getTimeAttendanceReport(startDate: string, endDate: string): Promise<any> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const now = new Date();

    // Get all active users
    const users = await this.userModel.find({ isActive: true }).select('_id firstName lastName email avatar').exec();

    // Get all issues with:
    // 1. Completed time entries in the date range
    // 2. ANY active timer (we'll calculate today's portion regardless of when it started)
    const issues = await this.issueModel.find({
      $or: [
        { 'timeTracking.timeEntries.startTime': { $gte: start, $lte: end } },
        { 'timeTracking.activeTimeEntry': { $exists: true, $ne: null } },
      ],
    }).exec();

    // Build a map of userId -> date -> { regularSeconds, extraSeconds, tickets }
    const userDailyTime: Record<string, Record<string, {
      regularSeconds: number;
      extraSeconds: number;
      tickets: Array<{
        issueKey: string;
        issueTitle: string;
        projectKey: string;
        seconds: number;
        isExtra: boolean;
      }>;
    }>> = {};

    // Initialize for all users
    users.forEach((user) => {
      userDailyTime[user._id.toString()] = {};
    });

    // Collect all active timers per user (to pick only ONE per user later)
    const userActiveTimers: Record<string, Array<{
      entry: any;
      issue: any;
      isPaused: boolean;
      startTime: Date;
    }>> = {};

    // Process completed time entries and collect active timers
    for (const issue of issues) {
      const timeEntries = issue.timeTracking?.timeEntries || [];
      const projectKey = (issue.projectId as any)?.key || (issue as any).projectKey || 'UNK';

      for (const entry of timeEntries) {
        const entryDate = new Date(entry.startTime);
        if (entryDate < start || entryDate > end) continue;

        const userId = entry.userId;
        const dateKey = entryDate.toISOString().split('T')[0];

        if (!userDailyTime[userId]) {
          userDailyTime[userId] = {};
        }
        if (!userDailyTime[userId][dateKey]) {
          userDailyTime[userId][dateKey] = { regularSeconds: 0, extraSeconds: 0, tickets: [] };
        }

        // Check if this was an extra hours entry (based on description or isExtraHours flag)
        const isExtra = (entry as any).isExtraHours === true ||
                        (entry.description && entry.description.toLowerCase().includes('extra'));

        if (isExtra) {
          userDailyTime[userId][dateKey].extraSeconds += entry.duration;
        } else {
          userDailyTime[userId][dateKey].regularSeconds += entry.duration;
        }

        // Add to tickets breakdown (or update existing ticket entry)
        const existingTicket = userDailyTime[userId][dateKey].tickets.find(
          (t) => t.issueKey === issue.key && t.isExtra === isExtra
        );
        if (existingTicket) {
          existingTicket.seconds += entry.duration;
        } else {
          userDailyTime[userId][dateKey].tickets.push({
            issueKey: issue.key,
            issueTitle: issue.title,
            projectKey,
            seconds: entry.duration,
            isExtra,
          });
        }
      }

      // Collect active timer (don't process yet - we'll pick ONE per user later)
      const activeEntry = issue.timeTracking?.activeTimeEntry;
      if (activeEntry) {
        const userId = activeEntry.userId;
        if (!userActiveTimers[userId]) {
          userActiveTimers[userId] = [];
        }
        userActiveTimers[userId].push({
          entry: activeEntry,
          issue,
          isPaused: activeEntry.isPaused || false,
          startTime: new Date(activeEntry.startTime),
        });
      }
    }

    // Process active timers - only ONE per user
    // A user can only work on one thing at a time
    const todayStr = now.toISOString().split('T')[0];
    if (now >= start && now <= end) {
      for (const userId of Object.keys(userActiveTimers)) {
        const timers = userActiveTimers[userId];
        if (timers.length === 0) continue;

        // Sort: running timers first, then by start time (most recent first)
        timers.sort((a, b) => {
          if (a.isPaused !== b.isPaused) {
            return a.isPaused ? 1 : -1;
          }
          return b.startTime.getTime() - a.startTime.getTime();
        });

        // Pick only the first (best) timer
        const { entry: activeEntry, isPaused, issue: activeIssue } = timers[0];
        const entryStartTime = new Date(activeEntry.startTime);
        const activeProjectKey = (activeIssue.projectId as any)?.key || (activeIssue as any).projectKey || 'UNK';

        if (!userDailyTime[userId]) {
          userDailyTime[userId] = {};
        }
        if (!userDailyTime[userId][todayStr]) {
          userDailyTime[userId][todayStr] = { regularSeconds: 0, extraSeconds: 0, tickets: [] };
        }

        // Calculate TODAY's work time only
        const todayStart = new Date(todayStr);
        todayStart.setHours(9, 0, 0, 0);
        const todayEnd = new Date(todayStr);
        todayEnd.setHours(23, 59, 59, 999);

        // For paused timers, use pausedAt as end time
        const endTime = isPaused && activeEntry.pausedAt
          ? new Date(activeEntry.pausedAt)
          : now;

        const effectiveStart = entryStartTime > todayStart ? entryStartTime : todayStart;
        const effectiveEnd = endTime < todayEnd ? endTime : todayEnd;

        if (effectiveEnd > effectiveStart) {
          let todaySeconds = Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / 1000);

          // Cap at maximum reasonable daily hours (12 hours)
          const MAX_DAILY_SECONDS = 12 * 3600;
          todaySeconds = Math.max(0, Math.min(todaySeconds, MAX_DAILY_SECONDS));

          const isExtra = (activeEntry as any).isExtraHours === true;
          if (isExtra) {
            userDailyTime[userId][todayStr].extraSeconds += todaySeconds;
          } else {
            userDailyTime[userId][todayStr].regularSeconds += todaySeconds;
          }

          // Add active timer ticket to breakdown
          const existingActiveTicket = userDailyTime[userId][todayStr].tickets.find(
            (t) => t.issueKey === activeIssue.key && t.isExtra === isExtra
          );
          if (existingActiveTicket) {
            existingActiveTicket.seconds += todaySeconds;
          } else {
            userDailyTime[userId][todayStr].tickets.push({
              issueKey: activeIssue.key,
              issueTitle: activeIssue.title,
              projectKey: activeProjectKey,
              seconds: todaySeconds,
              isExtra,
            });
          }
        }
      }
    }

    // Build daily data array
    const dailyData: any[] = [];
    const TARGET_HOURS = 7;
    const TARGET_SECONDS = TARGET_HOURS * 3600;

    // Generate all dates in range
    const dateRange: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      // Skip weekends
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        dateRange.push(d.toISOString().split('T')[0]);
      }
    }

    for (const user of users) {
      const userId = user._id.toString();
      const userData = userDailyTime[userId] || {};

      for (const dateKey of dateRange) {
        const dayData = userData[dateKey] || { regularSeconds: 0, extraSeconds: 0, tickets: [] };
        const totalSeconds = dayData.regularSeconds + dayData.extraSeconds;
        const hoursWorked = totalSeconds / 3600;
        const diff = totalSeconds - TARGET_SECONDS;

        let status: 'on_track' | 'under' | 'over' = 'on_track';
        if (diff < -1800) status = 'under'; // More than 30 min under
        else if (diff > 1800) status = 'over'; // More than 30 min over

        // Format tickets with hours
        const formattedTickets = (dayData.tickets || []).map((ticket) => ({
          ...ticket,
          hours: Math.round((ticket.seconds / 3600) * 100) / 100,
        })).sort((a, b) => b.seconds - a.seconds);

        dailyData.push({
          odataKey: dateKey,
          userId,
          userName: `${user.firstName} ${user.lastName}`,
          userAvatar: user.avatar,
          date: dateKey,
          hoursWorked: Math.round(hoursWorked * 100) / 100,
          regularHours: Math.round((dayData.regularSeconds / 3600) * 100) / 100,
          extraHours: Math.round((dayData.extraSeconds / 3600) * 100) / 100,
          target: TARGET_HOURS,
          diff: Math.round((diff / 3600) * 100) / 100,
          status,
          tickets: formattedTickets,
        });
      }
    }

    // Calculate summary
    const totalHours = dailyData.reduce((sum, d) => sum + d.hoursWorked, 0);
    const totalExtraHours = dailyData.reduce((sum, d) => sum + d.extraHours, 0);
    const workingDays = dateRange.length;
    const avgDailyHours = workingDays > 0 ? totalHours / (users.length * workingDays) : 0;
    const usersUnderTarget = new Set(
      dailyData.filter((d) => d.status === 'under').map((d) => d.userId)
    ).size;

    // Get users with consistently under 7 hours
    const userUnderDays: Record<string, number> = {};
    dailyData.forEach((d) => {
      if (d.status === 'under') {
        userUnderDays[d.userId] = (userUnderDays[d.userId] || 0) + 1;
      }
    });

    const alertUsers = users
      .filter((u) => (userUnderDays[u._id.toString()] || 0) >= 3)
      .map((u) => ({
        userId: u._id.toString(),
        userName: `${u.firstName} ${u.lastName}`,
        userAvatar: u.avatar,
        underDays: userUnderDays[u._id.toString()],
      }));

    return {
      dailyData,
      summary: {
        totalHours: Math.round(totalHours * 100) / 100,
        avgDailyHours: Math.round(avgDailyHours * 100) / 100,
        totalExtraHours: Math.round(totalExtraHours * 100) / 100,
        usersUnderTarget,
        totalUsers: users.length,
        workingDays,
      },
      alertUsers,
      dateRange: { start: startDate, end: endDate },
    };
  }

  /**
   * Get team productivity report
   * Shows issues completed, avg completion time, time logged per user
   */
  async getTeamProductivityReport(startDate: string, endDate: string): Promise<any> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Get all active users
    const users = await this.userModel.find({ isActive: true }).select('_id firstName lastName email avatar').exec();

    // Get issues completed in date range (by updatedAt for "done" status)
    const completedIssues = await this.issueModel.find({
      status: { $regex: /done|complete|closed|resolved/i },
      updatedAt: { $gte: start, $lte: end },
    }).populate('assignees', '_id firstName lastName').exec();

    // Get all issues with time entries
    const issuesWithTime = await this.issueModel.find({
      'timeTracking.timeEntries.startTime': { $gte: start, $lte: end },
    }).exec();

    // Build user productivity map
    const userProductivity: Record<string, {
      issuesCompleted: number;
      totalCompletionTime: number; // in hours
      completionCount: number;
      totalTimeLogged: number; // in hours
      extraHours: number;
      projectIds: Set<string>;
    }> = {};

    // Initialize for all users
    users.forEach((user) => {
      userProductivity[user._id.toString()] = {
        issuesCompleted: 0,
        totalCompletionTime: 0,
        completionCount: 0,
        totalTimeLogged: 0,
        extraHours: 0,
        projectIds: new Set(),
      };
    });

    // Count completed issues per user
    for (const issue of completedIssues) {
      if (!issue.assignees) continue;

      // Calculate completion time (createdAt to updatedAt)
      const createdAt = new Date(issue.createdAt);
      const completedAt = new Date(issue.updatedAt);
      const completionHours = (completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      for (const assignee of issue.assignees as any[]) {
        const userId = assignee._id.toString();
        if (userProductivity[userId]) {
          userProductivity[userId].issuesCompleted++;
          userProductivity[userId].totalCompletionTime += completionHours;
          userProductivity[userId].completionCount++;
          userProductivity[userId].projectIds.add(issue.projectId.toString());
        }
      }
    }

    // Aggregate time logged per user
    for (const issue of issuesWithTime) {
      const timeEntries = issue.timeTracking?.timeEntries || [];

      for (const entry of timeEntries) {
        const entryDate = new Date(entry.startTime);
        if (entryDate < start || entryDate > end) continue;

        const userId = entry.userId;
        if (!userProductivity[userId]) continue;

        const hours = entry.duration / 3600;
        const isExtra = (entry as any).isExtraHours === true;

        userProductivity[userId].totalTimeLogged += hours;
        if (isExtra) {
          userProductivity[userId].extraHours += hours;
        }
        userProductivity[userId].projectIds.add(issue.projectId.toString());
      }
    }

    // Build response
    const usersData = users.map((user) => {
      const data = userProductivity[user._id.toString()];
      const avgCompletionTime = data.completionCount > 0
        ? data.totalCompletionTime / data.completionCount
        : 0;

      return {
        odataKey: user._id.toString(),
        odataDate: startDate,
        userId: user._id.toString(),
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email,
        userAvatar: user.avatar,
        issuesCompleted: data.issuesCompleted,
        avgCompletionTime: Math.round(avgCompletionTime * 10) / 10, // in hours
        avgCompletionDays: Math.round((avgCompletionTime / 24) * 10) / 10, // in days
        totalTimeLogged: Math.round(data.totalTimeLogged * 100) / 100,
        extraHours: Math.round(data.extraHours * 100) / 100,
        projectsWorkedOn: data.projectIds.size,
      };
    });

    // Sort by issues completed (descending)
    usersData.sort((a, b) => b.issuesCompleted - a.issuesCompleted);

    // Calculate leaderboard
    const mostProductive = [...usersData].sort((a, b) => b.issuesCompleted - a.issuesCompleted)[0];
    const mostTimeLogged = [...usersData].sort((a, b) => b.totalTimeLogged - a.totalTimeLogged)[0];
    const fastestCompletion = [...usersData]
      .filter((u) => u.avgCompletionTime > 0)
      .sort((a, b) => a.avgCompletionTime - b.avgCompletionTime)[0];

    return {
      users: usersData,
      leaderboard: {
        mostProductive: mostProductive ? {
          userId: mostProductive.userId,
          userName: mostProductive.userName,
          userAvatar: mostProductive.userAvatar,
          value: mostProductive.issuesCompleted,
          label: 'issues completed',
        } : null,
        mostTimeLogged: mostTimeLogged ? {
          userId: mostTimeLogged.userId,
          userName: mostTimeLogged.userName,
          userAvatar: mostTimeLogged.userAvatar,
          value: mostTimeLogged.totalTimeLogged,
          label: 'hours logged',
        } : null,
        fastestCompletion: fastestCompletion ? {
          userId: fastestCompletion.userId,
          userName: fastestCompletion.userName,
          userAvatar: fastestCompletion.userAvatar,
          value: fastestCompletion.avgCompletionDays,
          label: 'days avg',
        } : null,
      },
      summary: {
        totalIssuesCompleted: usersData.reduce((sum, u) => sum + u.issuesCompleted, 0),
        totalTimeLogged: Math.round(usersData.reduce((sum, u) => sum + u.totalTimeLogged, 0) * 100) / 100,
        totalExtraHours: Math.round(usersData.reduce((sum, u) => sum + u.extraHours, 0) * 100) / 100,
        activeUsers: usersData.filter((u) => u.totalTimeLogged > 0 || u.issuesCompleted > 0).length,
      },
      dateRange: { start: startDate, end: endDate },
    };
  }

  /**
   * Get detailed report for a single user
   */
  async getUserDetailReport(userId: string, startDate: string, endDate: string): Promise<any> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const user = await this.userModel.findById(userId).select('_id firstName lastName email avatar').exec();
    if (!user) {
      throw new Error('User not found');
    }

    // Get all issues with time entries for this user
    const issues = await this.issueModel.find({
      'timeTracking.timeEntries.userId': userId,
    }).populate('projectId', 'name').exec();

    // Time by project
    const projectTime: Record<string, { projectId: string; projectName: string; hours: number }> = {};

    // Daily activity
    const dailyActivity: Record<string, number> = {};

    // Issues worked on
    const issuesWorkedOn: any[] = [];

    for (const issue of issues) {
      const timeEntries = issue.timeTracking?.timeEntries || [];
      let issueTimeSpent = 0;

      for (const entry of timeEntries) {
        if (entry.userId !== userId) continue;

        const entryDate = new Date(entry.startTime);
        if (entryDate < start || entryDate > end) continue;

        const hours = entry.duration / 3600;
        issueTimeSpent += hours;

        // Add to project time
        const projectId = issue.projectId?._id?.toString() || issue.projectId?.toString();
        const projectName = (issue.projectId as any)?.name || 'Unknown Project';

        if (!projectTime[projectId]) {
          projectTime[projectId] = { projectId, projectName, hours: 0 };
        }
        projectTime[projectId].hours += hours;

        // Add to daily activity
        const dateKey = entryDate.toISOString().split('T')[0];
        dailyActivity[dateKey] = (dailyActivity[dateKey] || 0) + hours;
      }

      if (issueTimeSpent > 0) {
        issuesWorkedOn.push({
          issueId: issue._id.toString(),
          issueKey: issue.key,
          title: issue.title,
          status: issue.status,
          timeSpent: Math.round(issueTimeSpent * 100) / 100,
        });
      }
    }

    // Generate all dates in range for daily activity
    const dailyActivityArray: any[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateKey = d.toISOString().split('T')[0];
      dailyActivityArray.push({
        date: dateKey,
        hours: Math.round((dailyActivity[dateKey] || 0) * 100) / 100,
      });
    }

    return {
      user: {
        userId: user._id.toString(),
        userName: `${user.firstName} ${user.lastName}`,
        userEmail: user.email,
        userAvatar: user.avatar,
      },
      timeByProject: Object.values(projectTime).map((p) => ({
        ...p,
        hours: Math.round(p.hours * 100) / 100,
      })),
      dailyActivity: dailyActivityArray,
      issuesWorkedOn: issuesWorkedOn.sort((a, b) => b.timeSpent - a.timeSpent),
      summary: {
        totalHours: Math.round(Object.values(projectTime).reduce((sum, p) => sum + p.hours, 0) * 100) / 100,
        projectsWorkedOn: Object.keys(projectTime).length,
        issuesWorkedOn: issuesWorkedOn.length,
      },
      dateRange: { start: startDate, end: endDate },
    };
  }

  /**
   * Get project time analysis
   * Shows team time breakdown, issue lifecycle, and bottlenecks
   */
  async getProjectTimeAnalysis(projectId: string): Promise<any> {
    const project = await this.projectModel.findById(projectId).exec();
    if (!project) {
      throw new Error('Project not found');
    }

    const issues = await this.issueModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .populate('assignees', '_id firstName lastName avatar')
      .exec();

    // Team time breakdown
    const teamTime: Record<string, { odataKey?: string; odataDate?: string; userId: string; userName: string; userAvatar: string | null; hours: number }> = {};

    for (const issue of issues) {
      const timeEntries = issue.timeTracking?.timeEntries || [];

      for (const entry of timeEntries) {
        const userId = entry.userId;
        const hours = entry.duration / 3600;

        if (!teamTime[userId]) {
          // Try to find user info from assignees
          const assignee = (issue.assignees as any[])?.find((a) => a._id.toString() === userId);
          teamTime[userId] = {
            odataKey: userId,
            odataDate: new Date().toISOString().split('T')[0],
            userId,
            userName: assignee ? `${assignee.firstName} ${assignee.lastName}` : 'Unknown User',
            userAvatar: assignee?.avatar || null,
            hours: 0,
          };
        }
        teamTime[userId].hours += hours;
      }
    }

    // Issue lifecycle analysis
    // Find status transitions (simplified - using status history if available, or estimate)
    const statusTimeMap: Record<string, number[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };

    for (const issue of issues) {
      const createdAt = new Date(issue.createdAt);
      const updatedAt = new Date(issue.updatedAt);

      // Simplified lifecycle estimation based on current status
      const totalHours = (updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      if (issue.status.toLowerCase().includes('done') || issue.status.toLowerCase().includes('complete')) {
        // Completed issues - estimate time distribution
        statusTimeMap.todo.push(totalHours * 0.1);
        statusTimeMap.in_progress.push(totalHours * 0.8);
        statusTimeMap.done.push(totalHours * 0.1);
      } else if (issue.status.toLowerCase().includes('progress')) {
        statusTimeMap.todo.push(totalHours * 0.2);
        statusTimeMap.in_progress.push(totalHours * 0.8);
      } else {
        statusTimeMap.todo.push(totalHours);
      }
    }

    const avgTimeInTodo = statusTimeMap.todo.length > 0
      ? statusTimeMap.todo.reduce((a, b) => a + b, 0) / statusTimeMap.todo.length
      : 0;
    const avgTimeInProgress = statusTimeMap.in_progress.length > 0
      ? statusTimeMap.in_progress.reduce((a, b) => a + b, 0) / statusTimeMap.in_progress.length
      : 0;
    const avgTimeToComplete = issues
      .filter((i) => i.status.toLowerCase().includes('done'))
      .map((i) => (new Date(i.updatedAt).getTime() - new Date(i.createdAt).getTime()) / (1000 * 60 * 60));
    const avgCompletionTime = avgTimeToComplete.length > 0
      ? avgTimeToComplete.reduce((a, b) => a + b, 0) / avgTimeToComplete.length
      : 0;

    // Bottlenecks - issues stuck for more than 7 days
    const BOTTLENECK_THRESHOLD_DAYS = 7;
    const now = new Date();
    const bottlenecks = issues
      .filter((issue) => {
        const daysSinceUpdate = (now.getTime() - new Date(issue.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceUpdate > BOTTLENECK_THRESHOLD_DAYS &&
               !issue.status.toLowerCase().includes('done') &&
               !issue.status.toLowerCase().includes('complete');
      })
      .map((issue) => ({
        issueId: issue._id.toString(),
        issueKey: issue.key,
        title: issue.title,
        status: issue.status,
        daysStuck: Math.round((now.getTime() - new Date(issue.updatedAt).getTime()) / (1000 * 60 * 60 * 24)),
        assignees: (issue.assignees as any[])?.map((a) => ({
          userId: a._id.toString(),
          userName: `${a.firstName} ${a.lastName}`,
        })) || [],
      }))
      .sort((a, b) => b.daysStuck - a.daysStuck);

    return {
      project: {
        projectId: project._id.toString(),
        projectName: project.name,
      },
      teamTimeBreakdown: Object.values(teamTime)
        .map((t) => ({ ...t, hours: Math.round(t.hours * 100) / 100 }))
        .sort((a, b) => b.hours - a.hours),
      issueLifecycle: {
        avgTimeInTodo: Math.round(avgTimeInTodo * 10) / 10,
        avgTimeInProgress: Math.round(avgTimeInProgress * 10) / 10,
        avgTimeToComplete: Math.round(avgCompletionTime * 10) / 10,
        avgTimeToCompleteDays: Math.round((avgCompletionTime / 24) * 10) / 10,
      },
      bottlenecks,
      summary: {
        totalIssues: issues.length,
        completedIssues: issues.filter((i) => i.status.toLowerCase().includes('done')).length,
        bottleneckCount: bottlenecks.length,
        totalTimeLogged: Math.round(Object.values(teamTime).reduce((sum, t) => sum + t.hours, 0) * 100) / 100,
      },
    };
  }
}
