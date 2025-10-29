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
      .populate('assignee', 'firstName lastName email')
      .exec();

    const performanceByUser: Record<string, any> = {};

    issues.forEach((issue) => {
      if (!issue.assignee) return;

      const userId = (issue.assignee as any)._id.toString();
      if (!performanceByUser[userId]) {
        performanceByUser[userId] = {
          user: issue.assignee,
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
}
