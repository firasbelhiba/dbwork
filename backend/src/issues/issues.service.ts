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
import { CreateIssueDto, UpdateIssueDto, FilterIssuesDto, AddTimeLogDto } from './dto';
import { ActivitiesService } from '../activities/activities.service';
import { ActionType, EntityType } from '../activities/schemas/activity.schema';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class IssuesService {
  constructor(
    @InjectModel(Issue.name) private issueModel: Model<IssueDocument>,
    private activitiesService: ActivitiesService,
    @Inject(forwardRef(() => ProjectsService))
    private projectsService: ProjectsService,
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

    // Generate issue key - find the highest issue number globally across all issues
    const allIssues = await this.issueModel
      .find({})
      .select('key')
      .lean()
      .exec();

    let maxIssueNumber = 0;
    allIssues.forEach((issue) => {
      if (issue.key) {
        // Extract number from key like "ISSUE-5" or "PROJ-10"
        const match = issue.key.match(/-(\d+)$/);
        if (match) {
          const number = parseInt(match[1], 10);
          if (number > maxIssueNumber) {
            maxIssueNumber = number;
          }
        }
      }
    });

    const issueKey = `ISSUE-${maxIssueNumber + 1}`;

    const issue = new this.issueModel({
      ...createIssueDto,
      projectId: new Types.ObjectId(createIssueDto.projectId), // Ensure ObjectId conversion
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
      { path: 'assignee', select: 'firstName lastName email avatar' },
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

    return savedIssue;
  }

  async findAll(filterDto: FilterIssuesDto): Promise<any> {
    const {
      projectId,
      sprintId,
      status,
      type,
      priority,
      assignee,
      reporter,
      labels,
      search,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filterDto;

    const query: any = {};

    if (projectId) query.projectId = new Types.ObjectId(projectId);
    if (sprintId) query.sprintId = new Types.ObjectId(sprintId);
    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (assignee) query.assignee = new Types.ObjectId(assignee);
    if (reporter) query.reporter = new Types.ObjectId(reporter);
    if (labels && labels.length > 0) query.labels = { $in: labels };

    if (search) {
      query.$text = { $search: search };
    }

    const skip = (page - 1) * limit;
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [issues, total] = await Promise.all([
      this.issueModel
        .find(query)
        .populate('assignee', 'firstName lastName email avatar')
        .populate('reporter', 'firstName lastName email avatar')
        .populate('projectId', 'name key')
        .populate('sprintId', 'name status')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.issueModel.countDocuments(query).exec(),
    ]);

    return {
      items: issues,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<any> {
    const issue = await this.issueModel
      .findById(id)
      .populate('assignee', 'firstName lastName email avatar role')
      .populate('reporter', 'firstName lastName email avatar role')
      .populate('projectId', 'name key description')
      .populate('sprintId', 'name status startDate endDate')
      .populate('watchers', 'firstName lastName email avatar')
      .populate('blockedBy', 'key title status')
      .populate('blocks', 'key title status')
      .populate('parentIssue', 'key title status')
      .exec();

    if (!issue) {
      throw new NotFoundException('Issue not found');
    }

    // Count sub-issues
    const subIssueCount = await this.issueModel.countDocuments({ parentIssue: id }).exec();

    return {
      ...issue.toObject(),
      subIssueCount,
    };
  }

  async findByKey(key: string): Promise<IssueDocument> {
    const issue = await this.issueModel
      .findOne({ key: key.toUpperCase() })
      .populate('assignee', 'firstName lastName email avatar')
      .populate('reporter', 'firstName lastName email avatar')
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

    const issue = await this.issueModel
      .findByIdAndUpdate(id, updateIssueDto, { new: true })
      .populate('assignee', 'firstName lastName email avatar')
      .populate('reporter', 'firstName lastName email avatar')
      .populate('projectId', 'name key')
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
      if (updateIssueDto.assignee && originalIssue?.assignee?.toString() !== updateIssueDto.assignee) {
        changes.assignee = true;
      }
      if (updateIssueDto.priority && originalIssue?.priority !== updateIssueDto.priority) {
        changes.priority = { from: originalIssue.priority, to: updateIssueDto.priority };
      }

      const actionType = changes.status ? ActionType.STATUS_CHANGED
        : changes.priority ? ActionType.PRIORITY_CHANGED
        : changes.assignee ? ActionType.ASSIGNED
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

    if (issue.watchers.some((w) => w.toString() === userId)) {
      throw new BadRequestException('User is already watching this issue');
    }

    issue.watchers.push(userId as any);
    return issue.save();
  }

  async removeWatcher(issueId: string, userId: string): Promise<IssueDocument> {
    const issue = await this.findOne(issueId);

    issue.watchers = issue.watchers.filter((w) => w.toString() !== userId);
    return issue.save();
  }

  async addBlocker(issueId: string, blockerIssueId: string): Promise<IssueDocument> {
    const issue = await this.findOne(issueId);
    const blockerIssue = await this.findOne(blockerIssueId);

    if (issue.blockedBy.some((b) => b.toString() === blockerIssueId)) {
      throw new BadRequestException('This blocker already exists');
    }

    issue.blockedBy.push(blockerIssueId as any);
    blockerIssue.blocks.push(issueId as any);

    await blockerIssue.save();
    return issue.save();
  }

  async removeBlocker(issueId: string, blockerIssueId: string): Promise<IssueDocument> {
    const issue = await this.findOne(issueId);
    const blockerIssue = await this.findOne(blockerIssueId);

    issue.blockedBy = issue.blockedBy.filter((b) => b.toString() !== blockerIssueId);
    blockerIssue.blocks = blockerIssue.blocks.filter((b) => b.toString() !== issueId);

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
      .populate('assignee', 'firstName lastName email avatar')
      .populate('reporter', 'firstName lastName email avatar')
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

  async getIssuesByProject(projectId: string, status?: string): Promise<IssueDocument[]> {
    console.log('[getIssuesByProject] Called with projectId:', projectId);
    const query: any = { projectId: new Types.ObjectId(projectId) };
    if (status) query.status = status;
    console.log('[getIssuesByProject] Query:', JSON.stringify(query));

    // Count before query
    const count = await this.issueModel.countDocuments(query);
    console.log('[getIssuesByProject] Count in DB:', count);

    const results = await this.issueModel
      .find(query)
      .populate('assignee', 'firstName lastName email avatar')
      .populate('reporter', 'firstName lastName email avatar')
      .populate('sprintId', 'name status')
      .sort({ order: 1, createdAt: -1 })
      .exec();

    console.log('[getIssuesByProject] Results returned:', results.length);
    console.log('[getIssuesByProject] First 3 keys:', results.slice(0, 3).map(i => i.key));

    return results;
  }

  async getIssuesBySprint(sprintId: string): Promise<IssueDocument[]> {
    return this.issueModel
      .find({ sprintId: new Types.ObjectId(sprintId) })
      .populate('assignee', 'firstName lastName email avatar')
      .populate('reporter', 'firstName lastName email avatar')
      .populate('sprintId', 'name status')
      .sort({ status: 1, order: 1 })
      .exec();
  }

  async getBacklog(projectId: string): Promise<IssueDocument[]> {
    return this.issueModel
      .find({ projectId: new Types.ObjectId(projectId), sprintId: null })
      .populate('assignee', 'firstName lastName email avatar')
      .populate('reporter', 'firstName lastName email avatar')
      .populate('sprintId', 'name status')
      .sort({ order: 1, createdAt: -1 })
      .exec();
  }

  async updateOrder(issueId: string, newOrder: number): Promise<IssueDocument> {
    return this.update(issueId, { order: newOrder });
  }

  async getSubIssues(parentIssueId: string): Promise<IssueDocument[]> {
    // Verify parent issue exists
    const parentIssue = await this.issueModel.findById(parentIssueId);
    if (!parentIssue) {
      throw new NotFoundException('Parent issue not found');
    }

    return this.issueModel
      .find({ parentIssue: parentIssueId })
      .populate('assignee', 'firstName lastName email avatar')
      .populate('reporter', 'firstName lastName email avatar')
      .populate('projectId', 'name key')
      .populate('sprintId', 'name status')
      .sort({ createdAt: -1 })
      .exec();
  }

  private async validateParentIssue(parentIssueId: string, projectId: string): Promise<void> {
    const parentIssue = await this.issueModel.findById(parentIssueId);

    if (!parentIssue) {
      throw new NotFoundException('Parent issue not found');
    }

    // Ensure parent issue is in the same project
    if (parentIssue.projectId.toString() !== projectId) {
      throw new BadRequestException('Parent issue must be in the same project');
    }

    // Check for circular reference - parent cannot have a parent (max 2 levels)
    if (parentIssue.parentIssue) {
      throw new BadRequestException('Cannot create sub-issue of a sub-issue. Maximum nesting level is 2.');
    }
  }
}
