import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Feedback, FeedbackDocument } from './schemas/feedback.schema';
import { CreateFeedbackDto, UpdateFeedbackDto, QueryFeedbackDto } from './dto';
import { FeedbackStatus } from './enums/feedback.enum';
import { ActivitiesService } from '../activities/activities.service';
import { ActionType, EntityType } from '../activities/schemas/activity.schema';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(Feedback.name)
    private feedbackModel: Model<FeedbackDocument>,
    private activitiesService: ActivitiesService,
  ) {}

  async create(
    createFeedbackDto: CreateFeedbackDto,
    userId: string,
  ): Promise<FeedbackDocument> {
    const feedback = new this.feedbackModel({
      ...createFeedbackDto,
      userId: new Types.ObjectId(userId),
    });

    const savedFeedback = await feedback.save();

    // Log activity
    await this.activitiesService.logActivity(
      userId,
      ActionType.CREATED,
      EntityType.FEEDBACK,
      savedFeedback._id.toString(),
      savedFeedback.title,
    );

    return savedFeedback;
  }

  async findAll(query: QueryFeedbackDto): Promise<{
    data: FeedbackDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      search,
      sortBy = 'recent',
      userId,
    } = query;

    const skip = (page - 1) * limit;
    const filter: any = {};

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    if (userId) {
      filter.userId = new Types.ObjectId(userId);
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Determine sort order
    let sort: any = { createdAt: -1 }; // Default: most recent
    if (sortBy === 'oldest') {
      sort = { createdAt: 1 };
    } else if (sortBy === 'most_upvoted') {
      sort = { upvotes: -1, createdAt: -1 };
    }

    const [data, total] = await Promise.all([
      this.feedbackModel
        .find(filter)
        .populate('userId', 'firstName lastName email avatar')
        .populate('resolvedBy', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.feedbackModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<FeedbackDocument> {
    const feedback = await this.feedbackModel
      .findById(id)
      .populate('userId', 'firstName lastName email avatar')
      .populate('resolvedBy', 'firstName lastName email')
      .exec();

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    return feedback;
  }

  async update(
    id: string,
    updateFeedbackDto: UpdateFeedbackDto,
    userId: string,
  ): Promise<FeedbackDocument> {
    const feedback = await this.feedbackModel.findById(id).exec();

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    // Check if user is the owner
    if (feedback.userId.toString() !== userId) {
      throw new ForbiddenException('You can only update your own feedback');
    }

    // Don't allow updating resolved feedback
    if (feedback.status === FeedbackStatus.RESOLVED) {
      throw new BadRequestException('Cannot update resolved feedback');
    }

    Object.assign(feedback, updateFeedbackDto);
    const updatedFeedback = await feedback.save();

    // Log activity
    await this.activitiesService.logActivity(
      userId,
      ActionType.UPDATED,
      EntityType.FEEDBACK,
      updatedFeedback._id.toString(),
      updatedFeedback.title,
    );

    return this.findOne(id);
  }

  async remove(id: string, userId: string): Promise<void> {
    const feedback = await this.feedbackModel.findById(id).exec();

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    // Check if user is the owner
    if (feedback.userId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own feedback');
    }

    await this.feedbackModel.findByIdAndDelete(id).exec();

    // Log activity
    await this.activitiesService.logActivity(
      userId,
      ActionType.DELETED,
      EntityType.FEEDBACK,
      feedback._id.toString(),
      feedback.title,
    );
  }

  async toggleUpvote(id: string, userId: string): Promise<FeedbackDocument> {
    const feedback = await this.feedbackModel.findById(id).exec();

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    const userObjectId = new Types.ObjectId(userId);
    const hasUpvoted = feedback.upvotedBy.some(
      (id) => id.toString() === userId,
    );

    if (hasUpvoted) {
      // Remove upvote
      feedback.upvotedBy = feedback.upvotedBy.filter(
        (id) => id.toString() !== userId,
      );
      feedback.upvotes = Math.max(0, feedback.upvotes - 1);
    } else {
      // Add upvote
      feedback.upvotedBy.push(userObjectId);
      feedback.upvotes += 1;
    }

    await feedback.save();

    return this.findOne(id);
  }

  async resolve(id: string, adminUserId: string): Promise<FeedbackDocument> {
    const feedback = await this.feedbackModel.findById(id).exec();

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    if (feedback.status === FeedbackStatus.RESOLVED) {
      throw new BadRequestException('Feedback is already resolved');
    }

    feedback.status = FeedbackStatus.RESOLVED;
    feedback.resolvedAt = new Date();
    feedback.resolvedBy = new Types.ObjectId(adminUserId);

    await feedback.save();

    // Log activity
    await this.activitiesService.logActivity(
      adminUserId,
      ActionType.COMPLETED,
      EntityType.FEEDBACK,
      feedback._id.toString(),
      feedback.title,
    );

    return this.findOne(id);
  }

  async reopen(id: string, adminUserId: string): Promise<FeedbackDocument> {
    const feedback = await this.feedbackModel.findById(id).exec();

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    if (feedback.status === FeedbackStatus.OPEN) {
      throw new BadRequestException('Feedback is already open');
    }

    feedback.status = FeedbackStatus.OPEN;
    feedback.resolvedAt = null;
    feedback.resolvedBy = null;

    await feedback.save();

    // Log activity
    await this.activitiesService.logActivity(
      adminUserId,
      ActionType.UPDATED,
      EntityType.FEEDBACK,
      feedback._id.toString(),
      feedback.title,
    );

    return this.findOne(id);
  }

  async getStats(): Promise<{
    totalFeedback: number;
    openFeedback: number;
    resolvedFeedback: number;
    byType: { [key: string]: number };
  }> {
    const [total, open, resolved, byType] = await Promise.all([
      this.feedbackModel.countDocuments(),
      this.feedbackModel.countDocuments({ status: FeedbackStatus.OPEN }),
      this.feedbackModel.countDocuments({ status: FeedbackStatus.RESOLVED }),
      this.feedbackModel.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const byTypeObj: { [key: string]: number } = {};
    byType.forEach((item) => {
      byTypeObj[item._id] = item.count;
    });

    return {
      totalFeedback: total,
      openFeedback: open,
      resolvedFeedback: resolved,
      byType: byTypeObj,
    };
  }
}
