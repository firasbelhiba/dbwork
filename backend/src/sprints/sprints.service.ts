import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Sprint, SprintDocument } from './schemas/sprint.schema';
import { CreateSprintDto, UpdateSprintDto } from './dto';
import { SprintStatus } from '@common/enums';
import { ActivitiesService } from '../activities/activities.service';
import { ActionType, EntityType } from '../activities/schemas/activity.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { IssuesService } from '../issues/issues.service';

@Injectable()
export class SprintsService {
  constructor(
    @InjectModel(Sprint.name) private sprintModel: Model<SprintDocument>,
    private activitiesService: ActivitiesService,
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => IssuesService))
    private issuesService: IssuesService,
  ) {}

  async create(createSprintDto: CreateSprintDto, userId?: string): Promise<SprintDocument> {
    // Check for date validation
    if (new Date(createSprintDto.endDate) <= new Date(createSprintDto.startDate)) {
      throw new BadRequestException('End date must be after start date');
    }

    // Check for overlapping sprints
    const overlappingSprint = await this.sprintModel
      .findOne({
        projectId: createSprintDto.projectId,
        status: { $in: [SprintStatus.PLANNED, SprintStatus.ACTIVE] },
        $or: [
          {
            startDate: { $lte: createSprintDto.endDate },
            endDate: { $gte: createSprintDto.startDate },
          },
        ],
      })
      .exec();

    if (overlappingSprint) {
      throw new ConflictException('Sprint dates overlap with existing sprint');
    }

    const sprint = new this.sprintModel({
      ...createSprintDto,
      status: SprintStatus.PLANNED,
      issues: [],
      completedPoints: 0,
      totalPoints: 0,
    });

    const savedSprint = await sprint.save();

    // Log activity
    if (userId) {
      await this.activitiesService.logActivity(
        userId,
        ActionType.CREATED,
        EntityType.SPRINT,
        savedSprint._id.toString(),
        savedSprint.name,
        savedSprint.projectId.toString(),
      );
    }

    return savedSprint;
  }

  async findAll(projectId?: string, status?: string): Promise<SprintDocument[]> {
    const query: any = {};
    if (projectId) query.projectId = new this.sprintModel.base.Types.ObjectId(projectId);
    if (status) query.status = status;

    return this.sprintModel
      .find(query)
      .populate('projectId', 'name key')
      .populate('issues', 'key title status storyPoints')
      .sort({ startDate: -1 })
      .exec();
  }

  async findOne(id: string): Promise<SprintDocument> {
    const sprint = await this.sprintModel
      .findById(id)
      .populate('projectId', 'name key description')
      .populate({
        path: 'issues',
        select: 'key title status type priority assignee storyPoints',
        populate: {
          path: 'assignee',
          select: 'firstName lastName avatar',
        },
      })
      .exec();

    if (!sprint) {
      throw new NotFoundException('Sprint not found');
    }

    return sprint;
  }

  async update(id: string, updateSprintDto: UpdateSprintDto): Promise<SprintDocument> {
    const sprint = await this.findOne(id);

    // Prevent updating dates of active or completed sprints
    if (
      (sprint.status === SprintStatus.ACTIVE || sprint.status === SprintStatus.COMPLETED) &&
      (updateSprintDto.startDate || updateSprintDto.endDate)
    ) {
      throw new BadRequestException(
        'Cannot update dates of active or completed sprint',
      );
    }

    Object.assign(sprint, updateSprintDto);
    return sprint.save();
  }

  async remove(id: string): Promise<void> {
    const sprint = await this.findOne(id);

    if (sprint.status === SprintStatus.ACTIVE) {
      throw new BadRequestException('Cannot delete active sprint');
    }

    if (sprint.issues.length > 0) {
      throw new BadRequestException(
        'Cannot delete sprint with issues. Move issues first.',
      );
    }

    await this.sprintModel.findByIdAndDelete(id).exec();
  }

  async start(id: string, userId?: string): Promise<SprintDocument> {
    const sprint = await this.findOne(id);

    if (sprint.status !== SprintStatus.PLANNED) {
      throw new BadRequestException('Only planned sprints can be started');
    }

    // Check if there's already an active sprint for this project
    const activeSprint = await this.sprintModel
      .findOne({
        projectId: sprint.projectId,
        status: SprintStatus.ACTIVE,
      })
      .exec();

    if (activeSprint) {
      throw new ConflictException('There is already an active sprint for this project');
    }

    sprint.status = SprintStatus.ACTIVE;
    sprint.startDate = new Date();

    const savedSprint = await sprint.save();

    // Log activity
    if (userId) {
      await this.activitiesService.logActivity(
        userId,
        ActionType.STARTED,
        EntityType.SPRINT,
        savedSprint._id.toString(),
        savedSprint.name,
        savedSprint.projectId.toString(),
      );
    }

    return savedSprint;
  }

  async complete(id: string, userId?: string): Promise<SprintDocument> {
    const sprint = await this.findOne(id);

    if (sprint.status !== SprintStatus.ACTIVE) {
      throw new BadRequestException('Only active sprints can be completed');
    }

    // Calculate completed points
    const populatedSprint = await sprint.populate('issues');
    const completedIssues = (populatedSprint.issues as any[]).filter(
      (issue: any) => issue.status === 'done',
    );

    sprint.completedPoints = completedIssues.reduce(
      (sum: number, issue: any) => sum + (issue.storyPoints || 0),
      0,
    );

    sprint.status = SprintStatus.COMPLETED;
    sprint.completedAt = new Date();

    const savedSprint = await sprint.save();

    // Log activity
    if (userId) {
      await this.activitiesService.logActivity(
        userId,
        ActionType.COMPLETED,
        EntityType.SPRINT,
        savedSprint._id.toString(),
        savedSprint.name,
        savedSprint.projectId.toString(),
      );
    }

    return savedSprint;
  }

  async addIssue(sprintId: string, issueId: string): Promise<SprintDocument> {
    const sprint = await this.findOne(sprintId);

    if (sprint.status === SprintStatus.COMPLETED) {
      throw new BadRequestException('Cannot add issues to completed sprint');
    }

    if (sprint.issues.some((issue) => issue.toString() === issueId.toString())) {
      throw new BadRequestException('Issue already in sprint');
    }

    sprint.issues.push(new Types.ObjectId(issueId));
    const savedSprint = await sprint.save();

    // Notify assignees that their issue was added to a sprint
    try {
      const issue = await this.issuesService.findOne(issueId);

      if (issue.assignees && Array.isArray(issue.assignees)) {
        for (const assignee of issue.assignees) {
          const assigneeId = typeof assignee === 'object' && assignee !== null
            ? (assignee as any)._id?.toString() || assignee.toString()
            : String(assignee);

          await this.notificationsService.notifySprintIssueAdded(
            assigneeId,
            issue.key,
            issue.title,
            sprint.name,
            sprint._id.toString(),
          );
        }
      }
    } catch (error) {
      console.error('[NOTIFICATION] Error notifying sprint issue added:', error);
    }

    return savedSprint;
  }

  async removeIssue(sprintId: string, issueId: string): Promise<SprintDocument> {
    const sprint = await this.findOne(sprintId);

    if (sprint.status === SprintStatus.COMPLETED) {
      throw new BadRequestException('Cannot remove issues from completed sprint');
    }

    sprint.issues = sprint.issues.filter((issue) => issue.toString() !== issueId.toString());
    return sprint.save();
  }

  async calculateVelocity(sprintId: string): Promise<any> {
    const sprint = await this.findOne(sprintId);

    const populatedSprint = await sprint.populate('issues');
    const issues = populatedSprint.issues as any[];

    const totalPoints = issues.reduce(
      (sum, issue) => sum + (issue.storyPoints || 0),
      0,
    );

    const completedIssues = issues.filter((issue) => issue.status === 'done');
    const completedPoints = completedIssues.reduce(
      (sum, issue) => sum + (issue.storyPoints || 0),
      0,
    );

    const inProgressIssues = issues.filter((issue) => issue.status === 'in_progress');
    const inProgressPoints = inProgressIssues.reduce(
      (sum, issue) => sum + (issue.storyPoints || 0),
      0,
    );

    return {
      sprintId: sprint._id,
      sprintName: sprint.name,
      totalIssues: issues.length,
      completedIssues: completedIssues.length,
      totalPoints,
      completedPoints,
      inProgressPoints,
      remainingPoints: totalPoints - completedPoints - inProgressPoints,
      completionPercentage:
        totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
    };
  }

  async getBurndownData(sprintId: string): Promise<any> {
    const sprint = await this.findOne(sprintId);
    const velocity = await this.calculateVelocity(sprintId);

    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate);
    const totalDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    const idealBurndown: any[] = [];
    const pointsPerDay = velocity.totalPoints / totalDays;

    for (let i = 0; i <= totalDays; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      idealBurndown.push({
        date: date.toISOString().split('T')[0],
        ideal: Math.max(0, velocity.totalPoints - pointsPerDay * i),
        actual: i === totalDays ? velocity.completedPoints : null, // Simplified
      });
    }

    return {
      sprintId: sprint._id,
      sprintName: sprint.name,
      totalPoints: velocity.totalPoints,
      completedPoints: velocity.completedPoints,
      burndownData: idealBurndown,
    };
  }

  async getActiveSprint(projectId: string): Promise<SprintDocument | null> {
    return this.sprintModel
      .findOne({ projectId, status: SprintStatus.ACTIVE })
      .populate('issues', 'key title status type priority storyPoints')
      .exec();
  }

  async getProjectVelocity(projectId: string, limit: number = 5): Promise<any> {
    const completedSprints = await this.sprintModel
      .find({
        projectId,
        status: SprintStatus.COMPLETED,
      })
      .sort({ completedAt: -1 })
      .limit(limit)
      .exec();

    const velocityData = completedSprints.map((sprint) => ({
      sprintName: sprint.name,
      completedPoints: sprint.completedPoints,
      totalPoints: sprint.totalPoints,
      completedAt: sprint.completedAt,
    }));

    const averageVelocity =
      completedSprints.length > 0
        ? completedSprints.reduce((sum, s) => sum + s.completedPoints, 0) /
          completedSprints.length
        : 0;

    return {
      projectId,
      recentSprints: velocityData,
      averageVelocity: Math.round(averageVelocity),
      sprintsAnalyzed: completedSprints.length,
    };
  }

  /**
   * Check and send notifications for sprints starting or ending soon
   * This method should be called by a cron job/scheduler
   */
  async sendSprintReminders(): Promise<void> {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    try {
      // Find sprints starting in 1-3 days
      const upcomingSprints = await this.sprintModel
        .find({
          status: SprintStatus.PLANNED,
          startDate: {
            $gte: tomorrow,
            $lte: threeDaysFromNow,
          },
        })
        .populate({
          path: 'issues',
          select: 'assignees key',
          populate: {
            path: 'assignees',
            select: '_id',
          },
        })
        .exec();

      // Notify about sprints starting soon
      for (const sprint of upcomingSprints) {
        const daysUntilStart = Math.ceil(
          (new Date(sprint.startDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        // Get all unique assignees from sprint issues
        const assigneeIds = new Set<string>();
        for (const issue of sprint.issues as any[]) {
          if (issue.assignees && Array.isArray(issue.assignees)) {
            for (const assignee of issue.assignees) {
              const assigneeId = typeof assignee === 'object' && assignee !== null
                ? (assignee as any)._id?.toString() || assignee.toString()
                : String(assignee);
              assigneeIds.add(assigneeId);
            }
          }
        }

        // Send notifications to all assignees
        for (const assigneeId of assigneeIds) {
          try {
            await this.notificationsService.notifySprintStartingSoon(
              assigneeId,
              sprint.name,
              sprint._id.toString(),
              sprint.startDate,
              daysUntilStart,
            );
          } catch (error) {
            console.error(`[NOTIFICATION] Error notifying sprint starting soon for user ${assigneeId}:`, error);
          }
        }
      }

      // Find active sprints ending in 1-3 days
      const endingSprints = await this.sprintModel
        .find({
          status: SprintStatus.ACTIVE,
          endDate: {
            $gte: tomorrow,
            $lte: threeDaysFromNow,
          },
        })
        .populate({
          path: 'issues',
          select: 'assignees key',
          populate: {
            path: 'assignees',
            select: '_id',
          },
        })
        .exec();

      // Notify about sprints ending soon
      for (const sprint of endingSprints) {
        const daysUntilEnd = Math.ceil(
          (new Date(sprint.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        // Get all unique assignees from sprint issues
        const assigneeIds = new Set<string>();
        for (const issue of sprint.issues as any[]) {
          if (issue.assignees && Array.isArray(issue.assignees)) {
            for (const assignee of issue.assignees) {
              const assigneeId = typeof assignee === 'object' && assignee !== null
                ? (assignee as any)._id?.toString() || assignee.toString()
                : String(assignee);
              assigneeIds.add(assigneeId);
            }
          }
        }

        // Send notifications to all assignees
        for (const assigneeId of assigneeIds) {
          try {
            await this.notificationsService.notifySprintEndingSoon(
              assigneeId,
              sprint.name,
              sprint._id.toString(),
              sprint.endDate,
              daysUntilEnd,
            );
          } catch (error) {
            console.error(`[NOTIFICATION] Error notifying sprint ending soon for user ${assigneeId}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('[NOTIFICATION] Error sending sprint reminders:', error);
    }
  }
}
