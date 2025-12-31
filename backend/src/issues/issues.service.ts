import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Issue, IssueDocument } from './schemas/issue.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateIssueDto, UpdateIssueDto, FilterIssuesDto, AddTimeLogDto } from './dto';
import { ActivitiesService } from '../activities/activities.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AchievementsService } from '../achievements/achievements.service';
import { ActionType, EntityType } from '../activities/schemas/activity.schema';
import { ProjectsService } from '../projects/projects.service';
import { TimeTrackingService } from './time-tracking.service';

const MAX_LIMIT = 100;

@Injectable()
export class IssuesService {
  constructor(
    @InjectModel(Issue.name) private issueModel: Model<IssueDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private activitiesService: ActivitiesService,
    private notificationsService: NotificationsService,
    private achievementsService: AchievementsService,
    @Inject(forwardRef(() => ProjectsService))
    private projectsService: ProjectsService,
    @Inject(forwardRef(() => TimeTrackingService))
    private timeTrackingService: TimeTrackingService,
  ) {}

  async create(createIssueDto: CreateIssueDto, reporterId: string): Promise<IssueDocument> {
    // Validate parent issue if provided
    if (createIssueDto.parentIssue) {
      await this.validateParentIssue(createIssueDto.parentIssue, createIssueDto.projectId);
    }

    // Get project to determine default status
    const project = await this.projectsService.findOne(createIssueDto.projectId);

    // If status not provided and project has custom statuses, use the first one
    let status: string | undefined = createIssueDto.status;
    if (!status && project.customStatuses && project.customStatuses.length > 0) {
      // Sort by order and get the first status
      const sortedStatuses = [...project.customStatuses].sort((a, b) => a.order - b.order);
      status = sortedStatuses[0].id;
    }

    // Generate issue key using project key - find the highest issue number for this project
    const projectKeyPrefix = project.key || 'ISSUE';

    // Find all issues with keys matching this project's prefix
    const projectIssues = await this.issueModel
      .find({ key: new RegExp(`^${projectKeyPrefix}-\\d+$`) })
      .select('key')
      .lean()
      .exec();

    let maxIssueNumber = 0;
    projectIssues.forEach((issue) => {
      if (issue.key) {
        // Extract number from key like "TAI-5" or "PROJ-10"
        const match = issue.key.match(/-(\d+)$/);
        if (match) {
          const number = parseInt(match[1], 10);
          if (number > maxIssueNumber) {
            maxIssueNumber = number;
          }
        }
      }
    });

    const issueKey = `${projectKeyPrefix}-${maxIssueNumber + 1}`;

    const issue = new this.issueModel({
      ...createIssueDto,
      projectId: new Types.ObjectId(createIssueDto.projectId), // Ensure ObjectId conversion
      assignees: createIssueDto.assignees?.map(id => new Types.ObjectId(id)) || [], // Convert assignees to ObjectIds
      key: issueKey,
      reporter: reporterId,
      status: status as any, // Use determined status (custom status ID or enum value)
      timeTracking: {
        estimatedHours: createIssueDto.estimatedHours || null,
        loggedHours: 0,
        timeLogs: [],
      },
    });

    const savedIssue = await (await issue.save()).populate([
      { path: 'assignees', select: 'firstName lastName email avatar' },
      { path: 'reporter', select: 'firstName lastName email avatar' },
      { path: 'projectId', select: 'name key' },
    ]);

    // Log activity
    await this.activitiesService.logActivity(
      reporterId,
      ActionType.CREATED,
      EntityType.ISSUE,
      savedIssue._id.toString(),
      savedIssue.title,
      createIssueDto.projectId,
    );

    // Send notifications to assigned users
    if (createIssueDto.assignees && createIssueDto.assignees.length > 0) {
      for (const assigneeId of createIssueDto.assignees) {
        // Don't notify if the reporter assigned themselves
        if (assigneeId !== reporterId) {
          try {
            await this.notificationsService.create({
              userId: assigneeId,
              type: 'issue_assigned' as any,
              title: 'Issue Assigned',
              message: `You have been assigned to ${savedIssue.key}: ${savedIssue.title}`,
              link: `/issues/${savedIssue._id}`,
              metadata: { issueKey: savedIssue.key, assignedBy: reporterId },
            });
          } catch (error) {
            console.error(`[NOTIFICATION] Error creating notification for user ${assigneeId}:`, error);
          }
        }
      }
    }

    return savedIssue;
  }

  async findAll(filterDto: FilterIssuesDto): Promise<any> {
    const {
      projectId,
      sprintId,
      status,
      type,
      priority,
      assignees,
      reporter,
      labels,
      search,
      isArchived,
      category,
      categories,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filterDto;

    // Cap limit at MAX_LIMIT to prevent DoS
    const cappedLimit = Math.min(limit, MAX_LIMIT);

    const query: any = {};

    if (projectId) query.projectId = new Types.ObjectId(projectId);
    if (sprintId) query.sprintId = new Types.ObjectId(sprintId);
    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (assignees && assignees.length > 0) {
      query.assignees = { $in: assignees.map(id => new Types.ObjectId(id)) };
    }
    if (reporter) query.reporter = new Types.ObjectId(reporter);
    if (labels && labels.length > 0) query.labels = { $in: labels };

    // Category filtering
    if (category) {
      query.category = category;
    } else if (categories && categories.length > 0) {
      query.category = { $in: categories };
    }

    // Exclude archived issues by default
    if (isArchived !== undefined) {
      query.isArchived = isArchived === 'true' || isArchived === true;
    } else {
      query.isArchived = false;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * cappedLimit;
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [issues, total] = await Promise.all([
      this.issueModel
        .find(query)
        .populate({ path: 'assignees', select: 'firstName lastName email avatar', model: 'User' })
        .populate({ path: 'reporter', select: 'firstName lastName email avatar', model: 'User' })
        .populate('projectId', 'name key')
        .populate('sprintId', 'name status')
        .sort(sort)
        .skip(skip)
        .limit(cappedLimit)
        .exec(),
      this.issueModel.countDocuments(query).exec(),
    ]);

    return {
      items: issues,
      total,
      page,
      limit: cappedLimit,
      pages: Math.ceil(total / cappedLimit),
    };
  }

  async findOne(id: string): Promise<any> {
    // Check if id is a valid MongoDB ObjectId or an issue key (e.g., "MKT-4")
    const isObjectId = Types.ObjectId.isValid(id) && new Types.ObjectId(id).toString() === id;

    let issue;
    if (isObjectId) {
      issue = await this.issueModel
        .findById(id)
        .populate({ path: 'assignees', select: 'firstName lastName email avatar role', model: 'User' })
        .populate({ path: 'reporter', select: 'firstName lastName email avatar role', model: 'User' })
        .populate({
          path: 'projectId',
          select: 'name key description members',
          populate: {
            path: 'members.userId',
            select: 'firstName lastName email avatar'
          }
        })
        .populate('sprintId', 'name status startDate endDate')
        .populate({ path: 'watchers', select: 'firstName lastName email avatar', model: 'User' })
        .populate('blockedBy', 'key title status')
        .populate('blocks', 'key title status')
        .populate('parentIssue', 'key title status')
        .exec();
    } else {
      // Assume it's an issue key like "MKT-4"
      issue = await this.issueModel
        .findOne({ key: id.toUpperCase() })
        .populate({ path: 'assignees', select: 'firstName lastName email avatar role', model: 'User' })
        .populate({ path: 'reporter', select: 'firstName lastName email avatar role', model: 'User' })
        .populate({
          path: 'projectId',
          select: 'name key description members',
          populate: {
            path: 'members.userId',
            select: 'firstName lastName email avatar'
          }
        })
        .populate('sprintId', 'name status startDate endDate')
        .populate({ path: 'watchers', select: 'firstName lastName email avatar', model: 'User' })
        .populate('blockedBy', 'key title status')
        .populate('blocks', 'key title status')
        .populate('parentIssue', 'key title status')
        .exec();
    }

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    // Count sub-issues and calculate progress
    // Query for both string and ObjectId types to handle legacy data
    const subIssues = await this.issueModel.find({
      $or: [
        { parentIssue: new Types.ObjectId(id) },
        { parentIssue: id }
      ]
    }).exec();
    const subIssueCount = subIssues.length;
    const completedSubIssues = subIssues.filter(subIssue => subIssue.status === 'done').length;
    const subIssueProgress = subIssueCount > 0 ? Math.round((completedSubIssues / subIssueCount) * 100) : 0;

    return {
      ...issue.toObject(),
      subIssueCount,
      completedSubIssues,
      subIssueProgress,
    };
  }

  async findByKey(key: string): Promise<IssueDocument> {
    const issue = await this.issueModel
      .findOne({ key: key.toUpperCase() })
      .populate({ path: 'assignees', select: 'firstName lastName email avatar', model: 'User' })
      .populate({ path: 'reporter', select: 'firstName lastName email avatar', model: 'User' })
      .populate('projectId', 'name key')
      .exec();

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    return issue;
  }

  async update(id: string, updateIssueDto: UpdateIssueDto, userId?: string): Promise<IssueDocument> {
    // Get original issue for comparison
    const originalIssue = await this.issueModel.findById(id);

    // Convert assignees to ObjectIds if present
    const updateData: any = {
      ...updateIssueDto,
      ...(updateIssueDto.assignees && {
        assignees: updateIssueDto.assignees.map(id => new Types.ObjectId(id))
      })
    };

    // Handle completedAt timestamp based on status change
    if (updateIssueDto.status !== undefined && originalIssue) {
      const isBecomingDone = updateIssueDto.status === 'done' && originalIssue.status !== 'done';
      const isLeavingDone = updateIssueDto.status !== 'done' && originalIssue.status === 'done';

      if (isBecomingDone) {
        updateData.completedAt = new Date();
      } else if (isLeavingDone) {
        updateData.completedAt = null;
      }
    }

    const issue = await this.issueModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate({ path: 'assignees', select: 'firstName lastName email avatar', model: 'User' })
      .populate({ path: 'reporter', select: 'firstName lastName email avatar', model: 'User' })
      .populate('projectId', 'name key lead')
      .populate('sprintId', 'name status')
      .exec();

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    // Log activity with metadata about what changed
    if (userId) {
      const changes: Record<string, any> = {};
      if (updateIssueDto.status && originalIssue?.status !== updateIssueDto.status) {
        changes.status = { from: originalIssue.status, to: updateIssueDto.status };
      }

      // Check if assignees changed
      if (updateIssueDto.assignees) {
        const oldAssignees = (originalIssue?.assignees || []).map(id => id.toString()).sort();
        const newAssignees = updateIssueDto.assignees.map(id => id.toString()).sort();
        if (JSON.stringify(oldAssignees) !== JSON.stringify(newAssignees)) {
          changes.assignees = {
            added: newAssignees.filter(id => !oldAssignees.includes(id)),
            removed: oldAssignees.filter(id => !newAssignees.includes(id))
          };
        }
      }

      if (updateIssueDto.priority && originalIssue?.priority !== updateIssueDto.priority) {
        changes.priority = { from: originalIssue.priority, to: updateIssueDto.priority };
      }

      const actionType = changes.status ? ActionType.STATUS_CHANGED
        : changes.priority ? ActionType.PRIORITY_CHANGED
        : changes.assignees ? ActionType.ASSIGNED
        : ActionType.UPDATED;

      // Extract projectId properly (handle both ObjectId and populated object)
      const projectId = issue.projectId
        ? (typeof issue.projectId === 'object' && '_id' in issue.projectId
            ? (issue.projectId as any)._id.toString()
            : (issue.projectId as any).toString())
        : undefined;

      await this.activitiesService.logActivity(
        userId,
        actionType,
        EntityType.ISSUE,
        issue._id.toString(),
        issue.title,
        projectId,
        changes,
      );

      // Send notifications for assignee changes
      if (changes.assignees?.added && changes.assignees.added.length > 0) {
        for (const assigneeId of changes.assignees.added) {
          // Don't notify the user who made the change
          if (assigneeId !== userId) {
            await this.notificationsService.create({
              userId: assigneeId,
              type: 'issue_assigned' as any,
              title: 'Issue Assigned',
              message: `You have been assigned to ${issue.key}: ${issue.title}`,
              link: `/issues/${issue._id}`,
              metadata: { issueKey: issue.key, assignedBy: userId },
            });
          }
        }
      }

      // Send notification for status change
      if (changes.status) {
        const recipientIds = new Set<string>();

        // Add assignees
        if (issue.assignees && Array.isArray(issue.assignees)) {
          for (const assignee of issue.assignees) {
            const assigneeId = typeof assignee === 'object' && assignee !== null
              ? (assignee as any)._id.toString()
              : String(assignee);
            recipientIds.add(assigneeId);
          }
        }

        // Add reporter
        if (issue.reporter) {
          const reporterId = typeof issue.reporter === 'object' && issue.reporter !== null
            ? (issue.reporter as any)._id.toString()
            : String(issue.reporter);
          recipientIds.add(reporterId);
        }

        // Send notifications to all recipients except the user who made the change
        for (const recipientId of recipientIds) {
          if (recipientId !== userId) {
            await this.notificationsService.notifyIssueStatusChanged(
              recipientId,
              issue._id.toString(),
              issue.key,
              issue.title,
              changes.status.from,
              changes.status.to,
              userId,
            );
          }
        }

        // Check achievements when issue is completed
        if (changes.status.to === 'done') {
          // Check achievements for all assignees
          if (issue.assignees && Array.isArray(issue.assignees)) {
            for (const assignee of issue.assignees) {
              const assigneeId = typeof assignee === 'object' && assignee !== null
                ? (assignee as any)._id.toString()
                : String(assignee);

              try {
                await this.achievementsService.checkIssueCompletionAchievements(
                  assigneeId,
                  issue.type,
                  id, // Pass the issue ID to prevent counting the same issue multiple times
                );
              } catch (error) {
                console.error(`[ACHIEVEMENTS] Error checking achievements for user ${assigneeId}:`, error);
              }
            }
          }
        }

        // Auto-progress to next queued ticket when moving to done or in_review
        if (changes.status.to === 'done' || changes.status.to === 'in_review') {
          if (issue.assignees && Array.isArray(issue.assignees)) {
            for (const assignee of issue.assignees) {
              const assigneeId = typeof assignee === 'object' && assignee !== null
                ? (assignee as any)._id.toString()
                : String(assignee);

              try {
                await this.progressToNextQueuedTicket(assigneeId, id);
              } catch (error) {
                console.error(`[TODO_QUEUE] Error progressing to next ticket for user ${assigneeId}:`, error);
              }
            }
          }
        }

        // Auto-trigger time tracking based on status change
        let timeTrackingModified = false;

        // Start or resume timer when moving TO in_progress
        if (changes.status.to === 'in_progress' && changes.status.from !== 'in_progress') {
          try {
            // First try to resume if there's a paused timer
            await this.timeTrackingService.resumeTimer(id, userId);
            console.log(`[TIME_TRACKING] Auto-resumed timer for issue ${id}`);
            timeTrackingModified = true;
          } catch {
            // No paused timer, try to start a new one
            try {
              await this.timeTrackingService.startTimer(id, userId);
              console.log(`[TIME_TRACKING] Auto-started timer for issue ${id}`);
              timeTrackingModified = true;
            } catch (error) {
              // Timer might already be running, that's okay
              console.log(`[TIME_TRACKING] Could not auto-start timer: ${error.message}`);
            }
          }
        }

        // Pause timer when moving AWAY from in_progress (but not to done or in_review)
        if (changes.status.from === 'in_progress' && changes.status.to !== 'in_progress' && changes.status.to !== 'done' && changes.status.to !== 'in_review') {
          try {
            await this.timeTrackingService.pauseTimer(id, userId);
            console.log(`[TIME_TRACKING] Auto-paused timer for issue ${id}`);
            timeTrackingModified = true;
          } catch (error) {
            // Timer might not be running or already paused, that's okay
            console.log(`[TIME_TRACKING] Could not auto-pause timer: ${error.message}`);
          }
        }

        // Stop timer when moving to done or in_review (commits time to totalTimeSpent)
        if (changes.status.to === 'done' || changes.status.to === 'in_review') {
          try {
            await this.timeTrackingService.stopTimer(id, userId);
            console.log(`[TIME_TRACKING] Auto-stopped timer for completed issue ${id}`);
            timeTrackingModified = true;
          } catch (error) {
            // Timer might not be running or already stopped, that's okay
            console.log(`[TIME_TRACKING] Could not auto-stop timer: ${error.message}`);
          }
        }

        // If time tracking was modified, re-fetch the issue to get updated data
        if (timeTrackingModified) {
          const updatedIssue = await this.issueModel
            .findById(id)
            .populate({ path: 'assignees', select: 'firstName lastName email avatar', model: 'User' })
            .populate({ path: 'reporter', select: 'firstName lastName email avatar', model: 'User' })
            .populate('projectId', 'name key')
            .populate('sprintId', 'name status')
            .exec();
          if (updatedIssue) {
            return updatedIssue;
          }
        }
      }

      // Send notification for priority change
      if (changes.priority) {
        const recipientIds = new Set<string>();

        // Add assignees
        if (issue.assignees && Array.isArray(issue.assignees)) {
          for (const assignee of issue.assignees) {
            const assigneeId = typeof assignee === 'object' && assignee !== null
              ? (assignee as any)._id.toString()
              : String(assignee);
            recipientIds.add(assigneeId);
          }
        }

        // Add reporter
        if (issue.reporter) {
          const reporterId = typeof issue.reporter === 'object' && issue.reporter !== null
            ? (issue.reporter as any)._id.toString()
            : String(issue.reporter);
          recipientIds.add(reporterId);
        }

        // Add project lead (admin) - projectId is already populated with 'lead' field
        if (issue.projectId && typeof issue.projectId === 'object') {
          const projectData = issue.projectId as any;
          if (projectData.lead) {
            const leadId = projectData.lead.toString();
            recipientIds.add(leadId);
          }
        }

        // Send notifications to all recipients except the user who made the change
        for (const recipientId of recipientIds) {
          if (recipientId !== userId) {
            await this.notificationsService.notifyIssuePriorityChanged(
              recipientId,
              issue._id.toString(),
              issue.key,
              issue.title,
              changes.priority.from,
              changes.priority.to,
              userId,
            );
          }
        }
      }

      // Send notification for due date change
      if (updateIssueDto.dueDate !== undefined &&
          originalIssue?.dueDate?.toString() !== updateIssueDto.dueDate?.toString()) {
        // Notify only assignees for due date changes
        if (issue.assignees && Array.isArray(issue.assignees)) {
          for (const assignee of issue.assignees) {
            const assigneeId = typeof assignee === 'object' && assignee !== null
              ? (assignee as any)._id.toString()
              : String(assignee);

            // Don't notify the user who made the change
            if (assigneeId !== userId) {
              await this.notificationsService.notifyIssueDueDateChanged(
                assigneeId,
                issue._id.toString(),
                issue.key,
                issue.title,
                originalIssue.dueDate,
                updateIssueDto.dueDate,
                userId,
              );
            }
          }
        }
      }
    }

    return issue;
  }

  async remove(id: string, userId?: string): Promise<void> {
    const issue = await this.issueModel.findById(id);

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    const result = await this.issueModel.findByIdAndDelete(id).exec();

    // Log activity
    if (userId && result) {
      await this.activitiesService.logActivity(
        userId,
        ActionType.DELETED,
        EntityType.ISSUE,
        result._id.toString(),
        result.title,
        result.projectId?.toString(),
      );
    }
  }

  async addTimeLog(
    issueId: string,
    userId: string,
    addTimeLogDto: AddTimeLogDto,
  ): Promise<IssueDocument> {
    const issue = await this.findOne(issueId);

    const timeLog = {
      userId,
      hours: addTimeLogDto.hours,
      description: addTimeLogDto.description,
      date: new Date(),
    };

    issue.timeTracking.timeLogs.push(timeLog);
    issue.timeTracking.loggedHours += addTimeLogDto.hours;

    return issue.save();
  }

  async addWatcher(issueId: string, userId: string): Promise<IssueDocument> {
    const issue = await this.findOne(issueId);

    if (issue.watchers.some((w) => w.toString() === userId.toString())) {
      throw new BadRequestException('User is already watching this issue');
    }

    issue.watchers.push(new Types.ObjectId(userId));
    return issue.save();
  }

  async removeWatcher(issueId: string, userId: string): Promise<IssueDocument> {
    const issue = await this.findOne(issueId);

    issue.watchers = issue.watchers.filter((w) => w.toString() !== userId.toString());
    return issue.save();
  }

  async addBlocker(issueId: string, blockerIssueId: string): Promise<IssueDocument> {
    const issue = await this.findOne(issueId);
    const blockerIssue = await this.findOne(blockerIssueId);

    if (issue.blockedBy.some((b) => b.toString() === blockerIssueId.toString())) {
      throw new BadRequestException('This blocker already exists');
    }

    issue.blockedBy.push(new Types.ObjectId(blockerIssueId));
    blockerIssue.blocks.push(new Types.ObjectId(issueId));

    await blockerIssue.save();
    return issue.save();
  }

  async removeBlocker(issueId: string, blockerIssueId: string): Promise<IssueDocument> {
    const issue = await this.findOne(issueId);
    const blockerIssue = await this.findOne(blockerIssueId);

    issue.blockedBy = issue.blockedBy.filter((b) => b.toString() !== blockerIssueId.toString());
    blockerIssue.blocks = blockerIssue.blocks.filter((b) => b.toString() !== issueId.toString());

    await blockerIssue.save();
    return issue.save();
  }

  async search(query: string, projectId?: string): Promise<IssueDocument[]> {
    const searchQuery: any = {
      $or: [
        // Search by ticket key (case-insensitive, partial match)
        { key: { $regex: query, $options: 'i' } },
        // Search by title (case-insensitive, partial match)
        { title: { $regex: query, $options: 'i' } },
        // Search by description (case-insensitive, partial match)
        { description: { $regex: query, $options: 'i' } },
      ],
    };

    if (projectId) {
      searchQuery.projectId = new Types.ObjectId(projectId);
    }

    return this.issueModel
      .find(searchQuery)
      .populate({ path: 'assignees', select: 'firstName lastName email avatar', model: 'User' })
      .populate({ path: 'reporter', select: 'firstName lastName email avatar', model: 'User' })
      .populate('projectId', 'name key')
      .populate('sprintId', 'name status')
      .limit(20)
      .exec();
  }

  async bulkUpdate(issueIds: string[], updateData: Partial<UpdateIssueDto>): Promise<any> {
    return this.issueModel
      .updateMany({ _id: { $in: issueIds } }, updateData)
      .exec();
  }

  async getIssuesByProject(projectId: string, status?: string, isArchived?: string, assignedTo?: string, userId?: string, categories?: string[], userRole?: string): Promise<IssueDocument[]> {
    const query: any = {
      projectId: new Types.ObjectId(projectId),
    };

    // Handle archived filter
    // If isArchived === 'all', don't filter by isArchived
    // Otherwise, only show non-archived issues
    if (isArchived !== 'all') {
      query.isArchived = false;
    }

    if (status) query.status = status;

    // Handle assignedTo=me filter
    if (assignedTo === 'me' && userId) {
      query.assignees = { $in: [new Types.ObjectId(userId)] };
    }

    // Handle categories filter (for team tabs)
    if (categories && categories.length > 0) {
      query.category = { $in: categories };
    }

    // Handle visibility filter - admin can see all, others only visible issues or ones they're included in
    if (userRole !== 'admin' && userId) {
      query.$or = [
        { isVisible: true },
        { isVisible: { $exists: false } }, // Legacy issues without visibility field
        { visibleTo: new Types.ObjectId(userId) },
        { assignees: new Types.ObjectId(userId) }, // Assignees can always see their issues
        { reporter: new Types.ObjectId(userId) }, // Reporter can always see their issues
      ];
    }

    // Count before query
    const count = await this.issueModel.countDocuments(query);

    const results = await this.issueModel
      .find(query)
      .populate({ path: 'assignees', select: 'firstName lastName email avatar', model: 'User' })
      .populate({ path: 'reporter', select: 'firstName lastName email avatar', model: 'User' })
      .populate('sprintId', 'name status')
      .populate({ path: 'visibleTo', select: 'firstName lastName email avatar', model: 'User' })
      .sort({ order: 1, createdAt: -1 })
      .exec();

    return results;
  }

  async getIssuesBySprint(sprintId: string, isArchived?: string, assignedTo?: string, userId?: string, categories?: string[], userRole?: string): Promise<IssueDocument[]> {
    const query: any = {
      sprintId: new Types.ObjectId(sprintId),
    };

    // Handle archived filter
    // If isArchived === 'all', don't filter by isArchived
    // Otherwise, only show non-archived issues
    if (isArchived !== 'all') {
      query.isArchived = false;
    }

    // Handle assignedTo=me filter
    if (assignedTo === 'me' && userId) {
      query.assignees = { $in: [new Types.ObjectId(userId)] };
    }

    // Handle categories filter (for team tabs)
    if (categories && categories.length > 0) {
      query.category = { $in: categories };
    }

    // Handle visibility filter - admin can see all, others only visible issues or ones they're included in
    if (userRole !== 'admin' && userId) {
      query.$or = [
        { isVisible: true },
        { isVisible: { $exists: false } }, // Legacy issues without visibility field
        { visibleTo: new Types.ObjectId(userId) },
        { assignees: new Types.ObjectId(userId) }, // Assignees can always see their issues
        { reporter: new Types.ObjectId(userId) }, // Reporter can always see their issues
      ];
    }

    return this.issueModel
      .find(query)
      .populate({ path: 'assignees', select: 'firstName lastName email avatar', model: 'User' })
      .populate({ path: 'reporter', select: 'firstName lastName email avatar', model: 'User' })
      .populate('sprintId', 'name status')
      .populate({ path: 'visibleTo', select: 'firstName lastName email avatar', model: 'User' })
      .sort({ status: 1, order: 1 })
      .exec();
  }

  async getBacklog(projectId: string): Promise<IssueDocument[]> {
    return this.issueModel
      .find({
        projectId: new Types.ObjectId(projectId),
        sprintId: null,
        isArchived: false // Exclude archived issues
      })
      .populate({ path: 'assignees', select: 'firstName lastName email avatar', model: 'User' })
      .populate({ path: 'reporter', select: 'firstName lastName email avatar', model: 'User' })
      .populate('sprintId', 'name status')
      .sort({ order: 1, createdAt: -1 })
      .exec();
  }

  async updateOrder(issueId: string, newOrder: number): Promise<IssueDocument> {
    return this.update(issueId, { order: newOrder });
  }

  async getSubIssues(parentIssueId: string, includeArchived?: string): Promise<IssueDocument[]> {
    // Verify parent issue exists
    const parentIssue = await this.issueModel.findById(parentIssueId);
    if (!parentIssue) {
      throw new NotFoundException('Parent issue not found');
    }

    // Query for both string and ObjectId types to handle legacy data
    const query: any = {
      $or: [
        { parentIssue: new Types.ObjectId(parentIssueId) },
        { parentIssue: parentIssueId }
      ]
    };

    // By default, exclude archived sub-issues unless explicitly requested
    if (includeArchived !== 'true' && includeArchived !== 'all') {
      query.isArchived = false;
    }

    return this.issueModel
      .find(query)
      .populate({ path: 'assignees', select: 'firstName lastName email avatar', model: 'User' })
      .populate({ path: 'reporter', select: 'firstName lastName email avatar', model: 'User' })
      .populate('projectId', 'name key')
      .populate('sprintId', 'name status')
      .sort({ createdAt: 1 }) // Sort by createdAt ASC = oldest first (original creation order)
      .exec();
  }

  private async validateParentIssue(parentIssueId: string, projectId: string): Promise<void> {
    const parentIssue = await this.issueModel.findById(parentIssueId);

    if (!parentIssue) {
      throw new NotFoundException('Parent issue not found');
    }

    // Ensure parent issue is in the same project
    if (parentIssue.projectId.toString() !== projectId.toString()) {
      throw new BadRequestException('Parent issue must be in the same project');
    }

    // Check for circular reference - parent cannot have a parent (max 2 levels)
    if (parentIssue.parentIssue) {
      throw new BadRequestException('Cannot create sub-issue of a sub-issue. Maximum nesting level is 2.');
    }
  }

  async archive(id: string, userId?: string): Promise<IssueDocument> {
    const issue = await this.issueModel
      .findByIdAndUpdate(
        id,
        { isArchived: true, archivedAt: new Date() },
        { new: true },
      )
      .exec();

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    // Log activity
    if (userId) {
      await this.activitiesService.logActivity(
        userId,
        ActionType.ARCHIVED,
        EntityType.ISSUE,
        issue._id.toString(),
        issue.title,
        issue.projectId.toString(),
      );
    }

    return issue;
  }

  async restore(id: string, userId?: string): Promise<IssueDocument> {
    const issue = await this.issueModel
      .findByIdAndUpdate(
        id,
        { isArchived: false, archivedAt: null },
        { new: true },
      )
      .exec();

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    // Log activity
    if (userId) {
      await this.activitiesService.logActivity(
        userId,
        ActionType.RESTORED,
        EntityType.ISSUE,
        issue._id.toString(),
        issue.title,
        issue.projectId.toString(),
      );
    }

    return issue;
  }

  async getUserWorkload(userId: string): Promise<{
    totalInProgress: number;
    overtimeTickets: Array<{
      _id: string;
      key: string;
      title: string;
      loggedHours: number;
    }>;
    byProject: Array<{
      projectId: string;
      projectName: string;
      projectKey: string;
      issues: Array<{
        _id: string;
        key: string;
        title: string;
        status: string;
        priority: string;
        type: string;
        loggedHours: number;
      }>;
    }>;
  }> {
    // Find all active issues assigned to this user (in_progress OR in_review)
    // Both statuses represent work that's currently being handled
    const issues = await this.issueModel
      .find({
        assignees: new Types.ObjectId(userId),
        status: { $in: ['in_progress', 'in_review'] },
        isArchived: { $ne: true },
      })
      .populate('projectId', 'name key')
      .select('key title status priority type projectId timeTracking')
      .sort({ updatedAt: -1 })
      .exec();

    // Track tickets exceeding 10 hours
    const overtimeTickets: Array<{
      _id: string;
      key: string;
      title: string;
      loggedHours: number;
    }> = [];

    // Group by project
    const projectMap = new Map<string, {
      projectId: string;
      projectName: string;
      projectKey: string;
      issues: Array<{
        _id: string;
        key: string;
        title: string;
        status: string;
        priority: string;
        type: string;
        loggedHours: number;
      }>;
    }>();

    for (const issue of issues) {
      const project = issue.projectId as any;
      const projectId = project._id.toString();

      // Calculate total hours (logged + active timer) - same as kanban display
      let totalHours = issue.timeTracking?.loggedHours || 0;

      // Add active timer time if exists (this is what kanban shows)
      if (issue.timeTracking?.activeTimeEntry?.startTime) {
        const activeEntry = issue.timeTracking.activeTimeEntry;
        const startTime = new Date(activeEntry.startTime).getTime();
        const endTime = activeEntry.isPaused && activeEntry.pausedAt
          ? new Date(activeEntry.pausedAt).getTime()
          : Date.now();
        // accumulatedPausedTime is in seconds, convert to ms
        const pausedTimeMs = (activeEntry.accumulatedPausedTime || 0) * 1000;
        const elapsedMs = endTime - startTime - pausedTimeMs;
        totalHours += Math.max(0, elapsedMs / (1000 * 60 * 60));
      }

      // Check for overtime tickets (>10 hours)
      if (totalHours > 10) {
        overtimeTickets.push({
          _id: issue._id.toString(),
          key: issue.key,
          title: issue.title,
          loggedHours: totalHours,
        });
      }

      if (!projectMap.has(projectId)) {
        projectMap.set(projectId, {
          projectId,
          projectName: project.name || 'Unknown Project',
          projectKey: project.key || 'UNK',
          issues: [],
        });
      }

      projectMap.get(projectId)!.issues.push({
        _id: issue._id.toString(),
        key: issue.key,
        title: issue.title,
        status: issue.status,
        priority: issue.priority,
        type: issue.type,
        loggedHours: totalHours,
      });
    }

    return {
      totalInProgress: issues.length,
      overtimeTickets,
      byProject: Array.from(projectMap.values()),
    };
  }

  /**
   * Get user bandwidth - hours worked today/this week/this month
   * and remaining capacity based on 8h/day, 40h/week, ~160h/month targets
   */
  async getUserBandwidth(userId: string): Promise<{
    projects: Array<{
      _id: string;
      key: string;
      name: string;
      logo?: string;
    }>;
    bandwidth: {
      daily: {
        worked: number; // hours
        target: number; // 8
        remaining: number;
        percentage: number;
      };
      weekly: {
        worked: number;
        target: number; // 40
        remaining: number;
        percentage: number;
      };
      monthly: {
        worked: number;
        target: number; // ~160 (working days in month * 8)
        remaining: number;
        percentage: number;
      };
    };
    activeTimer: {
      issueKey: string;
      issueTitle: string;
      projectKey: string;
      startedAt: Date;
      isPaused: boolean;
    } | null;
  }> {
    const now = new Date();

    // Calculate date ranges
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // This week (Monday to Sunday)
    const weekStart = new Date(now);
    const dayOfWeek = weekStart.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday is start of week
    weekStart.setDate(weekStart.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get user's projects (where they are a member or lead)
    const userProjects = await this.projectsService.findByUser(userId);
    const projects = userProjects.map(p => ({
      _id: p._id.toString(),
      key: p.key,
      name: p.name,
      logo: p.logo,
    }));

    // Get all issues with time entries for this user
    const issues = await this.issueModel.find({
      $or: [
        { 'timeTracking.timeEntries.userId': userId },
        { 'timeTracking.activeTimeEntry.userId': userId },
      ],
    }).populate('projectId', 'key').exec();

    let dailySeconds = 0;
    let weeklySeconds = 0;
    let monthlySeconds = 0;
    let activeTimerInfo: any = null;

    // Collect all active timers for this user
    const activeTimers: Array<{
      issue: any;
      entry: any;
      isPaused: boolean;
    }> = [];

    for (const issue of issues) {
      const timeEntries = issue.timeTracking?.timeEntries || [];

      // Process completed time entries
      for (const entry of timeEntries) {
        if (entry.userId !== userId) continue;

        const entryDate = new Date(entry.startTime);
        const duration = entry.duration || 0;

        // Daily
        if (entryDate >= todayStart && entryDate <= todayEnd) {
          dailySeconds += duration;
        }
        // Weekly
        if (entryDate >= weekStart && entryDate <= now) {
          weeklySeconds += duration;
        }
        // Monthly
        if (entryDate >= monthStart && entryDate <= now) {
          monthlySeconds += duration;
        }
      }

      // Collect active timer info
      const activeEntry = issue.timeTracking?.activeTimeEntry;
      if (activeEntry && activeEntry.userId === userId) {
        activeTimers.push({
          issue,
          entry: activeEntry,
          isPaused: activeEntry.isPaused || false,
        });
      }
    }

    // Process active timers - only count ONE
    // Priority: running timer > most recently started paused timer
    if (activeTimers.length > 0) {
      // Sort: running timers first, then by start time (most recent first)
      activeTimers.sort((a, b) => {
        if (a.isPaused !== b.isPaused) {
          return a.isPaused ? 1 : -1; // Running timers first
        }
        // Both same state, sort by start time (most recent first)
        return new Date(b.entry.startTime).getTime() - new Date(a.entry.startTime).getTime();
      });

      // Use the first (best) timer
      const { issue, entry: activeEntry, isPaused } = activeTimers[0];
      const entryStartTime = new Date(activeEntry.startTime);
      const projectData = issue.projectId as any;

      // Determine end time: now for running timers, pausedAt for paused timers
      const endTime = isPaused && activeEntry.pausedAt
        ? new Date(activeEntry.pausedAt)
        : now;

      // Store active timer info for display
      activeTimerInfo = {
        issueKey: issue.key,
        issueTitle: issue.title,
        projectKey: projectData?.key || 'UNK',
        startedAt: activeEntry.startTime,
        isPaused,
      };

      // Calculate active timer duration for today only (using 9 AM work start)
      const workStart = new Date(todayStart);
      workStart.setHours(9, 0, 0, 0);

      // For daily: only count time within today's work hours
      const effectiveStart = entryStartTime > workStart ? entryStartTime : workStart;
      const effectiveEnd = endTime < todayEnd ? endTime : todayEnd;

      // Only add daily time if the timer was active during today
      if (effectiveEnd > effectiveStart) {
        let activeSeconds = Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / 1000);

        // Cap at reasonable max for today (in case of data issues)
        activeSeconds = Math.max(0, Math.min(activeSeconds, 12 * 3600));
        dailySeconds += activeSeconds;
      }

      // For weekly/monthly, calculate actual timer duration since start
      if (entryStartTime >= weekStart) {
        let weekActiveSeconds = Math.floor((endTime.getTime() - entryStartTime.getTime()) / 1000);
        weekActiveSeconds -= (activeEntry.accumulatedPausedTime || 0);
        weekActiveSeconds = Math.max(0, weekActiveSeconds);
        weeklySeconds += weekActiveSeconds;
      }

      if (entryStartTime >= monthStart) {
        let monthActiveSeconds = Math.floor((endTime.getTime() - entryStartTime.getTime()) / 1000);
        monthActiveSeconds -= (activeEntry.accumulatedPausedTime || 0);
        monthActiveSeconds = Math.max(0, monthActiveSeconds);
        monthlySeconds += monthActiveSeconds;
      }
    }

    // Calculate working days in month (excluding weekends)
    let workingDaysInMonth = 0;
    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDaysInMonth++;
      }
    }

    // Convert to hours
    const dailyHours = dailySeconds / 3600;
    const weeklyHours = weeklySeconds / 3600;
    const monthlyHours = monthlySeconds / 3600;

    const DAILY_TARGET = 7;
    const WEEKLY_TARGET = 35;
    const MONTHLY_TARGET = workingDaysInMonth * 7;

    return {
      projects,
      bandwidth: {
        daily: {
          worked: Math.round(dailyHours * 100) / 100,
          target: DAILY_TARGET,
          remaining: Math.max(0, Math.round((DAILY_TARGET - dailyHours) * 100) / 100),
          percentage: Math.min(100, Math.round((dailyHours / DAILY_TARGET) * 100)),
        },
        weekly: {
          worked: Math.round(weeklyHours * 100) / 100,
          target: WEEKLY_TARGET,
          remaining: Math.max(0, Math.round((WEEKLY_TARGET - weeklyHours) * 100) / 100),
          percentage: Math.min(100, Math.round((weeklyHours / WEEKLY_TARGET) * 100)),
        },
        monthly: {
          worked: Math.round(monthlyHours * 100) / 100,
          target: MONTHLY_TARGET,
          remaining: Math.max(0, Math.round((MONTHLY_TARGET - monthlyHours) * 100) / 100),
          percentage: Math.min(100, Math.round((monthlyHours / MONTHLY_TARGET) * 100)),
        },
      },
      activeTimer: activeTimerInfo,
    };
  }

  /**
   * Get user's tickets for calendar display
   * Returns tickets grouped by date based on startDate and dueDate
   */
  async getUserCalendarTickets(userId: string, year: number, month: number): Promise<{
    tickets: Array<{
      _id: string;
      key: string;
      title: string;
      status: string;
      priority: string;
      type: string;
      startDate: string | null;
      dueDate: string | null;
      projectKey: string;
      projectName: string;
      projectLogo: string | null;
    }>;
    byDate: Record<string, Array<{
      _id: string;
      key: string;
      title: string;
      status: string;
      priority: string;
      type: string;
      isStartDate: boolean;
      isDueDate: boolean;
      projectKey: string;
      projectLogo: string | null;
    }>>;
  }> {
    // Calculate date range for the month (with some buffer for spanning tickets)
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Find all tickets assigned to this user that have dates within or spanning this month
    const issues = await this.issueModel
      .find({
        assignees: new Types.ObjectId(userId),
        isArchived: { $ne: true },
        $or: [
          // Tickets with startDate in this month
          { startDate: { $gte: startOfMonth, $lte: endOfMonth } },
          // Tickets with dueDate in this month
          { dueDate: { $gte: startOfMonth, $lte: endOfMonth } },
          // Tickets that span across this month (start before, due after)
          {
            startDate: { $lt: startOfMonth },
            dueDate: { $gt: endOfMonth },
          },
        ],
      })
      .populate('projectId', 'name key logo')
      .select('key title status priority type startDate dueDate projectId')
      .sort({ startDate: 1, dueDate: 1 })
      .exec();

    // Format tickets array
    const tickets = issues.map(issue => {
      const project = issue.projectId as any;
      return {
        _id: issue._id.toString(),
        key: issue.key,
        title: issue.title,
        status: issue.status,
        priority: issue.priority,
        type: issue.type,
        startDate: issue.startDate ? issue.startDate.toISOString() : null,
        dueDate: issue.dueDate ? issue.dueDate.toISOString() : null,
        projectKey: project?.key || 'UNK',
        projectName: project?.name || 'Unknown Project',
        projectLogo: project?.logo || null,
      };
    });

    // Group by date
    const byDate: Record<string, Array<{
      _id: string;
      key: string;
      title: string;
      status: string;
      priority: string;
      type: string;
      isStartDate: boolean;
      isDueDate: boolean;
      projectKey: string;
      projectLogo: string | null;
    }>> = {};

    for (const issue of issues) {
      const project = issue.projectId as any;
      const ticketInfo = {
        _id: issue._id.toString(),
        key: issue.key,
        title: issue.title,
        status: issue.status,
        priority: issue.priority,
        type: issue.type,
        isStartDate: false,
        isDueDate: false,
        projectKey: project?.key || 'UNK',
        projectLogo: project?.logo || null,
      };

      // Add to startDate
      if (issue.startDate) {
        const startDateStr = issue.startDate.toISOString().split('T')[0];
        if (!byDate[startDateStr]) {
          byDate[startDateStr] = [];
        }
        // Check if ticket already exists for this date
        const existing = byDate[startDateStr].find(t => t._id === ticketInfo._id);
        if (existing) {
          existing.isStartDate = true;
        } else {
          byDate[startDateStr].push({ ...ticketInfo, isStartDate: true });
        }
      }

      // Add to dueDate
      if (issue.dueDate) {
        const dueDateStr = issue.dueDate.toISOString().split('T')[0];
        if (!byDate[dueDateStr]) {
          byDate[dueDateStr] = [];
        }
        // Check if ticket already exists for this date (might be same as startDate)
        const existing = byDate[dueDateStr].find(t => t._id === ticketInfo._id);
        if (existing) {
          existing.isDueDate = true;
        } else {
          byDate[dueDateStr].push({ ...ticketInfo, isDueDate: true });
        }
      }
    }

    return {
      tickets,
      byDate,
    };
  }

  /**
   * Auto-progress to next queued ticket when a ticket is completed
   * Called when status changes to 'done' or 'in_review'
   */
  private async progressToNextQueuedTicket(userId: string, completedIssueId: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user || !user.todoQueue || user.todoQueue.length === 0) {
      return;
    }

    // Remove the completed issue from the queue
    const updatedQueue = user.todoQueue.filter(
      id => id.toString() !== completedIssueId
    );

    // Find the next issue in queue that is in 'todo' status
    for (const issueId of updatedQueue) {
      const issue = await this.issueModel.findById(issueId).exec();

      if (!issue) continue;
      if (issue.isArchived) continue;
      if (issue.status !== 'todo') continue;

      // Check if this user is still assigned to the issue
      const isAssigned = issue.assignees.some(
        a => a.toString() === userId
      );
      if (!isAssigned) continue;

      // Found the next ticket - move it to in_progress
      console.log(`[TODO_QUEUE] Auto-progressing user ${userId} to issue ${issue.key}`);

      // Update the issue status to in_progress
      await this.issueModel.findByIdAndUpdate(issueId, {
        status: 'in_progress',
      });

      // Start the timer for this user
      try {
        await this.timeTrackingService.startTimer(issueId.toString(), userId);
        console.log(`[TODO_QUEUE] Auto-started timer for issue ${issue.key}`);
      } catch (error) {
        console.log(`[TODO_QUEUE] Could not auto-start timer: ${error.message}`);
      }

      // Log the activity
      await this.activitiesService.logActivity(
        userId,
        ActionType.STATUS_CHANGED,
        EntityType.ISSUE,
        issueId.toString(),
        issue.title,
        issue.projectId?.toString(),
        {
          issueKey: issue.key,
          from: 'todo',
          to: 'in_progress',
          autoProgressed: true,
        },
      );

      // Send notification to the user
      await this.notificationsService.create({
        userId,
        type: 'issue_status_changed' as any,
        title: 'Next ticket started automatically',
        message: `Your next queued ticket ${issue.key} has been moved to In Progress`,
        link: `/issues/${issue.key}`,
        metadata: { issueKey: issue.key, autoProgressed: true },
      });

      break; // Only progress to one ticket
    }

    // Update the user's queue (remove completed issue)
    await this.userModel.findByIdAndUpdate(userId, {
      todoQueue: updatedQueue,
    });
  }
}
