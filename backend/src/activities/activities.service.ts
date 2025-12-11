import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Activity, ActivityDocument } from './schemas/activity.schema';
import { CreateActivityDto, QueryActivitiesDto } from './dto';

const MAX_LIMIT = 100;

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectModel(Activity.name)
    private activityModel: Model<ActivityDocument>,
  ) {}

  async create(createActivityDto: CreateActivityDto): Promise<ActivityDocument> {
    // Convert string IDs to ObjectIds for proper MongoDB storage
    const activityData: any = {
      ...createActivityDto,
      userId: createActivityDto.userId ? new Types.ObjectId(createActivityDto.userId as any) : undefined,
    };

    // Only convert projectId if it exists and is a string
    if (createActivityDto.projectId && typeof createActivityDto.projectId === 'string') {
      activityData.projectId = new Types.ObjectId(createActivityDto.projectId);
    } else if (createActivityDto.projectId) {
      activityData.projectId = createActivityDto.projectId;
    }

    const activity = new this.activityModel(activityData);
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

    // Cap limit at MAX_LIMIT to prevent DoS
    const cappedLimit = Math.min(limit, MAX_LIMIT);

    // Build filter object
    const filter: any = {};

    if (userId) {
      // Convert string to ObjectId for proper MongoDB comparison
      filter.userId = new Types.ObjectId(userId);
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
    const skip = (page - 1) * cappedLimit;

    const [data, total] = await Promise.all([
      this.activityModel
        .find(filter)
        .populate('userId', 'firstName lastName email avatar')
        .populate('projectId', 'name key')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(cappedLimit)
        .exec(),
      this.activityModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit: cappedLimit,
      totalPages: Math.ceil(total / cappedLimit),
    };
  }

  async findRecent(limit: number = 10): Promise<ActivityDocument[]> {
    const cappedLimit = Math.min(limit, MAX_LIMIT);
    console.log('[ActivitiesService] Finding recent activities, limit:', cappedLimit);
    const activities = await this.activityModel
      .find()
      .populate('userId', 'firstName lastName email avatar')
      .populate('projectId', 'name key')
      .sort({ createdAt: -1 })
      .limit(cappedLimit)
      .exec();

    console.log('[ActivitiesService] Found', activities.length, 'activities');
    console.log('[ActivitiesService] User IDs in activities:',
      activities.map(a => {
        const user = a.userId as any; // Type assertion for populated user
        return {
          userId: user?._id || a.userId,
          userName: user?.firstName ? `${user.firstName} ${user.lastName}` : 'Unknown',
          action: a.action,
          entityType: a.entityType
        };
      })
    );

    return activities;
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

  async getAnalytics(startDate: string, endDate: string): Promise<{
    summary: {
      totalActivities: number;
      activitiesInPeriod: number;
      uniqueUsers: number;
      uniqueProjects: number;
    };
    byActionType: Array<{ action: string; count: number }>;
    byEntityType: Array<{ entityType: string; count: number }>;
    byUser: Array<{
      userId: string;
      userName: string;
      userAvatar: string | null;
      count: number;
      entityBreakdown: Array<{ entityType: string; count: number; percentage: number }>;
    }>;
    byProject: Array<{ projectId: string; projectName: string; count: number }>;
    dailyTrend: Array<{ date: string; count: number }>;
    recentActivities: any[];
  }> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const dateFilter = { createdAt: { $gte: start, $lte: end } };

    const [
      totalActivities,
      activitiesInPeriod,
      uniqueUsersResult,
      uniqueProjectsResult,
      byActionType,
      byEntityType,
      byUser,
      byProject,
      dailyTrend,
      recentActivities,
    ] = await Promise.all([
      this.activityModel.countDocuments(),
      this.activityModel.countDocuments(dateFilter),
      this.activityModel.distinct('userId', dateFilter),
      this.activityModel.distinct('projectId', dateFilter),
      this.activityModel.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { action: '$_id', count: 1, _id: 0 } },
      ]),
      this.activityModel.aggregate([
        { $match: dateFilter },
        { $group: { _id: '$entityType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { entityType: '$_id', count: 1, _id: 0 } },
      ]),
      this.activityModel.aggregate([
        { $match: dateFilter },
        // First group by userId and entityType to get counts per entity type
        {
          $group: {
            _id: { userId: '$userId', entityType: '$entityType' },
            count: { $sum: 1 },
          },
        },
        // Then group by userId to collect all entity types
        {
          $group: {
            _id: '$_id.userId',
            totalCount: { $sum: '$count' },
            entityBreakdown: {
              $push: {
                entityType: '$_id.entityType',
                count: '$count',
              },
            },
          },
        },
        { $sort: { totalCount: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            userId: '$_id',
            count: '$totalCount',
            entityBreakdown: {
              $map: {
                input: '$entityBreakdown',
                as: 'eb',
                in: {
                  entityType: '$$eb.entityType',
                  count: '$$eb.count',
                  percentage: {
                    $round: [{ $multiply: [{ $divide: ['$$eb.count', '$totalCount'] }, 100] }, 1],
                  },
                },
              },
            },
            userName: {
              $cond: {
                if: { $and: ['$user.firstName', '$user.lastName'] },
                then: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
                else: 'Unknown User',
              },
            },
            userAvatar: { $ifNull: ['$user.avatar', null] },
            _id: 0,
          },
        },
      ]),
      this.activityModel.aggregate([
        { $match: { ...dateFilter, projectId: { $ne: null } } },
        { $group: { _id: '$projectId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'projects',
            localField: '_id',
            foreignField: '_id',
            as: 'project',
          },
        },
        { $unwind: { path: '$project', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            projectId: '$_id',
            count: 1,
            projectName: { $ifNull: ['$project.name', 'Unknown Project'] },
            _id: 0,
          },
        },
      ]),
      this.activityModel.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $project: { date: '$_id', count: 1, _id: 0 } },
      ]),
      this.activityModel
        .find(dateFilter)
        .populate('userId', 'firstName lastName email avatar')
        .populate('projectId', 'name key')
        .sort({ createdAt: -1 })
        .limit(20)
        .exec(),
    ]);

    return {
      summary: {
        totalActivities,
        activitiesInPeriod,
        uniqueUsers: uniqueUsersResult.length,
        uniqueProjects: uniqueProjectsResult.filter(Boolean).length,
      },
      byActionType,
      byEntityType,
      byUser,
      byProject,
      dailyTrend,
      recentActivities,
    };
  }

  async getAllUserActivities(startDate: string, endDate: string): Promise<Array<{
    userId: string;
    userName: string;
    userAvatar: string | null;
    count: number;
    entityBreakdown: Array<{ entityType: string; count: number; percentage: number }>;
  }>> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const dateFilter = { createdAt: { $gte: start, $lte: end } };

    const allUsers = await this.activityModel.aggregate([
      { $match: dateFilter },
      // First group by userId and entityType to get counts per entity type
      {
        $group: {
          _id: { userId: '$userId', entityType: '$entityType' },
          count: { $sum: 1 },
        },
      },
      // Then group by userId to collect all entity types
      {
        $group: {
          _id: '$_id.userId',
          totalCount: { $sum: '$count' },
          entityBreakdown: {
            $push: {
              entityType: '$_id.entityType',
              count: '$count',
            },
          },
        },
      },
      { $sort: { totalCount: -1 } },
      // No limit - get all users
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          userId: '$_id',
          count: '$totalCount',
          entityBreakdown: {
            $map: {
              input: '$entityBreakdown',
              as: 'eb',
              in: {
                entityType: '$$eb.entityType',
                count: '$$eb.count',
                percentage: {
                  $round: [{ $multiply: [{ $divide: ['$$eb.count', '$totalCount'] }, 100] }, 1],
                },
              },
            },
          },
          userName: {
            $cond: {
              if: { $and: ['$user.firstName', '$user.lastName'] },
              then: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
              else: 'Unknown User',
            },
          },
          userAvatar: { $ifNull: ['$user.avatar', null] },
          _id: 0,
        },
      },
    ]);

    return allUsers;
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
      console.log('[ActivitiesService] Logging activity:', {
        userId,
        action,
        entityType,
        entityId,
        entityName,
        projectId,
      });

      await this.create({
        userId,
        action: action as any,
        entityType: entityType as any,
        entityId,
        entityName,
        projectId,
        metadata,
      });

      console.log('[ActivitiesService] Activity logged successfully');
    } catch (error) {
      // Log error but don't fail the main operation
      console.error('[ActivitiesService] Failed to log activity:', error);
    }
  }
}
