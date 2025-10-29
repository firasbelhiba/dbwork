import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Activity, ActivityDocument } from './schemas/activity.schema';
import { CreateActivityDto, QueryActivitiesDto } from './dto';

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectModel(Activity.name)
    private activityModel: Model<ActivityDocument>,
  ) {}

  async create(createActivityDto: CreateActivityDto): Promise<ActivityDocument> {
    const activity = new this.activityModel(createActivityDto);
    return activity.save();
  }

  async findAll(query: QueryActivitiesDto): Promise<{
    data: ActivityDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 20,
      userId,
      action,
      entityType,
      projectId,
      search,
      startDate,
      endDate,
    } = query;

    // Build filter object
    const filter: any = {};

    if (userId) {
      filter.userId = userId;
    }

    if (action) {
      filter.action = action;
    }

    if (entityType) {
      filter.entityType = entityType;
    }

    if (projectId) {
      filter.projectId = projectId;
    }

    if (search) {
      filter.entityName = { $regex: search, $options: 'i' };
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.activityModel
        .find(filter)
        .populate('userId', 'firstName lastName email avatar')
        .populate('projectId', 'name key')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.activityModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findRecent(limit: number = 10): Promise<ActivityDocument[]> {
    return this.activityModel
      .find()
      .populate('userId', 'firstName lastName email avatar')
      .populate('projectId', 'name key')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async getStats(): Promise<{
    totalActivities: number;
    activitiesToday: number;
    activitiesThisWeek: number;
    mostActiveUsers: any[];
  }> {
    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(now.setDate(now.getDate() - 7));

    const [totalActivities, activitiesToday, activitiesThisWeek, mostActiveUsers] = await Promise.all([
      this.activityModel.countDocuments(),
      this.activityModel.countDocuments({ createdAt: { $gte: startOfDay } }),
      this.activityModel.countDocuments({ createdAt: { $gte: startOfWeek } }),
      this.activityModel.aggregate([
        {
          $group: {
            _id: '$userId',
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
        {
          $limit: 5,
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        {
          $unwind: '$user',
        },
        {
          $project: {
            userId: '$_id',
            count: 1,
            userName: {
              $concat: ['$user.firstName', ' ', '$user.lastName'],
            },
            userEmail: '$user.email',
          },
        },
      ]),
    ]);

    return {
      totalActivities,
      activitiesToday,
      activitiesThisWeek,
      mostActiveUsers,
    };
  }

  // Helper method to log activity from other services
  async logActivity(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    entityName: string,
    projectId?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    try {
      await this.create({
        userId,
        action: action as any,
        entityType: entityType as any,
        entityId,
        entityName,
        projectId,
        metadata,
      });
    } catch (error) {
      // Log error but don't fail the main operation
      console.error('Failed to log activity:', error);
    }
  }
}
