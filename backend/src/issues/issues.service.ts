import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Issue, IssueDocument } from './schemas/issue.schema';
import { CreateIssueDto, UpdateIssueDto, FilterIssuesDto, AddTimeLogDto } from './dto';

@Injectable()
export class IssuesService {
  constructor(
    @InjectModel(Issue.name) private issueModel: Model<IssueDocument>,
  ) {}

  async create(createIssueDto: CreateIssueDto, reporterId: string): Promise<IssueDocument> {
    // Generate issue key
    const projectIssuesCount = await this.issueModel
      .countDocuments({ projectId: createIssueDto.projectId })
      .exec();

    // Get project to generate key (would normally import ProjectsService)
    const issueKey = `ISSUE-${projectIssuesCount + 1}`;

    const issue = new this.issueModel({
      ...createIssueDto,
      key: issueKey,
      reporter: reporterId,
      timeTracking: {
        estimatedHours: createIssueDto.estimatedHours || null,
        loggedHours: 0,
        timeLogs: [],
      },
    });

    return (await issue.save()).populate([
      { path: 'assignee', select: 'firstName lastName email avatar' },
      { path: 'reporter', select: 'firstName lastName email avatar' },
      { path: 'projectId', select: 'name key' },
    ]);
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

    if (projectId) query.projectId = projectId;
    if (sprintId) query.sprintId = sprintId;
    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (assignee) query.assignee = assignee;
    if (reporter) query.reporter = reporter;
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

  async findOne(id: string): Promise<IssueDocument> {
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

    return issue;
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

  async update(id: string, updateIssueDto: UpdateIssueDto): Promise<IssueDocument> {
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

    return issue;
  }

  async remove(id: string): Promise<void> {
    const result = await this.issueModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException('Issue not found');
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
      $text: { $search: query },
    };

    if (projectId) {
      searchQuery.projectId = projectId;
    }

    return this.issueModel
      .find(searchQuery)
      .populate('assignee', 'firstName lastName email avatar')
      .populate('reporter', 'firstName lastName email avatar')
      .populate('projectId', 'name key')
      .limit(20)
      .exec();
  }

  async bulkUpdate(issueIds: string[], updateData: Partial<UpdateIssueDto>): Promise<any> {
    return this.issueModel
      .updateMany({ _id: { $in: issueIds } }, updateData)
      .exec();
  }

  async getIssuesByProject(projectId: string, status?: string): Promise<IssueDocument[]> {
    const query: any = { projectId };
    if (status) query.status = status;

    return this.issueModel
      .find(query)
      .populate('assignee', 'firstName lastName email avatar')
      .populate('reporter', 'firstName lastName email avatar')
      .sort({ order: 1, createdAt: -1 })
      .exec();
  }

  async getIssuesBySprint(sprintId: string): Promise<IssueDocument[]> {
    return this.issueModel
      .find({ sprintId })
      .populate('assignee', 'firstName lastName email avatar')
      .populate('reporter', 'firstName lastName email avatar')
      .sort({ status: 1, order: 1 })
      .exec();
  }

  async getBacklog(projectId: string): Promise<IssueDocument[]> {
    return this.issueModel
      .find({ projectId, sprintId: null })
      .populate('assignee', 'firstName lastName email avatar')
      .populate('reporter', 'firstName lastName email avatar')
      .sort({ order: 1, createdAt: -1 })
      .exec();
  }

  async updateOrder(issueId: string, newOrder: number): Promise<IssueDocument> {
    return this.update(issueId, { order: newOrder });
  }
}
