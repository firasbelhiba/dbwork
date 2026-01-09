import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import {
  Affectation,
  AffectationDocument,
  AffectationStatus,
} from './schemas/affectation.schema';
import { Issue, IssueDocument } from '../issues/schemas/issue.schema';
import {
  CreateAffectationDto,
  UpdateAffectationDto,
  QueryAffectationDto,
  ChargeabilityReportDto,
} from './dto';

@Injectable()
export class AffectationsService {
  constructor(
    @InjectModel(Affectation.name)
    private affectationModel: Model<AffectationDocument>,
    @InjectModel(Issue.name)
    private issueModel: Model<IssueDocument>,
  ) {}

  async create(
    createAffectationDto: CreateAffectationDto,
    currentUserId: string,
  ): Promise<AffectationDocument> {
    // Validate dates
    if (createAffectationDto.startDate >= createAffectationDto.endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    const affectation = new this.affectationModel({
      ...createAffectationDto,
      userId: new Types.ObjectId(createAffectationDto.userId),
      projectId: new Types.ObjectId(createAffectationDto.projectId),
      createdBy: new Types.ObjectId(currentUserId),
    });

    const saved = await affectation.save();
    return this.findOne(saved._id.toString());
  }

  async findAll(query: QueryAffectationDto): Promise<AffectationDocument[]> {
    const filter: any = {};

    if (query.userId) {
      filter.userId = new Types.ObjectId(query.userId);
    }

    if (query.projectId) {
      filter.projectId = new Types.ObjectId(query.projectId);
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.role) {
      filter.role = { $regex: query.role, $options: 'i' };
    }

    if (query.isBillable !== undefined) {
      filter.isBillable = query.isBillable === 'true';
    }

    // Date range filters
    if (query.startDateFrom || query.startDateTo) {
      filter.startDate = {};
      if (query.startDateFrom) {
        filter.startDate.$gte = new Date(query.startDateFrom);
      }
      if (query.startDateTo) {
        filter.startDate.$lte = new Date(query.startDateTo);
      }
    }

    if (query.endDateFrom || query.endDateTo) {
      filter.endDate = {};
      if (query.endDateFrom) {
        filter.endDate.$gte = new Date(query.endDateFrom);
      }
      if (query.endDateTo) {
        filter.endDate.$lte = new Date(query.endDateTo);
      }
    }

    return this.affectationModel
      .find(filter)
      .populate('userId', 'firstName lastName email avatar')
      .populate('projectId', 'name key logo')
      .populate('createdBy', 'firstName lastName email')
      .sort({ projectId: 1, startDate: -1 })
      .exec();
  }

  async findOne(id: string): Promise<AffectationDocument> {
    const affectation = await this.affectationModel
      .findById(id)
      .populate('userId', 'firstName lastName email avatar')
      .populate('projectId', 'name key logo')
      .populate('createdBy', 'firstName lastName email')
      .exec();

    if (!affectation) {
      throw new NotFoundException('Affectation not found');
    }

    return affectation;
  }

  async findByUser(userId: string): Promise<AffectationDocument[]> {
    return this.affectationModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('userId', 'firstName lastName email avatar')
      .populate('projectId', 'name key logo')
      .populate('createdBy', 'firstName lastName email')
      .sort({ startDate: -1 })
      .exec();
  }

  async findByProject(projectId: string): Promise<AffectationDocument[]> {
    return this.affectationModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .populate('userId', 'firstName lastName email avatar')
      .populate('projectId', 'name key logo')
      .populate('createdBy', 'firstName lastName email')
      .sort({ startDate: -1 })
      .exec();
  }

  async update(
    id: string,
    updateAffectationDto: UpdateAffectationDto,
  ): Promise<AffectationDocument> {
    // Validate dates if both provided
    if (updateAffectationDto.startDate && updateAffectationDto.endDate) {
      if (updateAffectationDto.startDate >= updateAffectationDto.endDate) {
        throw new BadRequestException('Start date must be before end date');
      }
    }

    const updateData: any = { ...updateAffectationDto };

    if (updateAffectationDto.userId) {
      updateData.userId = new Types.ObjectId(updateAffectationDto.userId);
    }

    if (updateAffectationDto.projectId) {
      updateData.projectId = new Types.ObjectId(updateAffectationDto.projectId);
    }

    const affectation = await this.affectationModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!affectation) {
      throw new NotFoundException('Affectation not found');
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.affectationModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException('Affectation not found');
    }
  }

  /**
   * Calculate actual hours from time tracking data for a single affectation
   */
  async calculateActualHours(affectationId: string): Promise<number> {
    const affectation = await this.affectationModel.findById(affectationId).exec();

    if (!affectation) {
      throw new NotFoundException('Affectation not found');
    }

    const userId = affectation.userId.toString();
    const projectId = affectation.projectId;
    const startDate = affectation.startDate;
    const endDate = affectation.endDate;

    // Aggregate time entries from all issues in the project for this user within date range
    const result = await this.issueModel.aggregate([
      {
        $match: {
          projectId: projectId,
        },
      },
      {
        $unwind: {
          path: '$timeTracking.timeEntries',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $match: {
          'timeTracking.timeEntries.userId': userId,
          'timeTracking.timeEntries.startTime': {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalSeconds: { $sum: '$timeTracking.timeEntries.duration' },
        },
      },
    ]);

    const totalSeconds = result[0]?.totalSeconds || 0;
    const actualHours = Math.round((totalSeconds / 3600) * 100) / 100; // Round to 2 decimal places

    // Update the affectation with calculated hours
    await this.affectationModel.findByIdAndUpdate(affectationId, {
      actualHours,
    });

    return actualHours;
  }

  /**
   * Sync actual hours for all active affectations
   */
  async syncAllActualHours(): Promise<{ updated: number; errors: number }> {
    const affectations = await this.affectationModel
      .find({
        status: { $in: [AffectationStatus.ACTIVE, AffectationStatus.PLANNED] },
      })
      .exec();

    let updated = 0;
    let errors = 0;

    for (const affectation of affectations) {
      try {
        await this.calculateActualHours(affectation._id.toString());
        updated++;
      } catch (error) {
        console.error(
          `Error syncing hours for affectation ${affectation._id}:`,
          error,
        );
        errors++;
      }
    }

    return { updated, errors };
  }

  /**
   * Scheduled job to sync actual hours daily at 6 AM
   */
  @Cron('0 6 * * *')
  async syncActualHoursJob(): Promise<void> {
    console.log('Running scheduled actual hours sync...');
    const result = await this.syncAllActualHours();
    console.log(`Sync completed: ${result.updated} updated, ${result.errors} errors`);
  }

  /**
   * Get chargeability report for users
   */
  async getChargeabilityReport(query: ChargeabilityReportDto): Promise<any> {
    const filter: any = {
      startDate: { $lte: query.endDate },
      endDate: { $gte: query.startDate },
    };

    if (query.userId) {
      filter.userId = new Types.ObjectId(query.userId);
    }

    const affectations = await this.affectationModel
      .find(filter)
      .populate('userId', 'firstName lastName email avatar')
      .populate('projectId', 'name key')
      .exec();

    // Calculate working days in the period (excluding weekends)
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    let workingDays = 0;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const availableHours = workingDays * 8; // 8 hours per working day

    // Group by user
    const userMap = new Map<string, any>();

    for (const affectation of affectations) {
      const userId = affectation.userId._id.toString();
      const user = affectation.userId as any;

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          userName: `${user.firstName} ${user.lastName}`,
          email: user.email,
          avatar: user.avatar,
          totalEstimatedHours: 0,
          totalActualHours: 0,
          billableHours: 0,
          nonBillableHours: 0,
          affectations: [],
        });
      }

      const userData = userMap.get(userId);
      userData.totalEstimatedHours += affectation.estimatedHours || 0;
      userData.totalActualHours += affectation.actualHours || 0;

      if (affectation.isBillable) {
        userData.billableHours += affectation.actualHours || 0;
      } else {
        userData.nonBillableHours += affectation.actualHours || 0;
      }

      const project = affectation.projectId as any;
      userData.affectations.push({
        affectationId: affectation._id,
        projectId: project._id,
        projectName: project.name,
        projectKey: project.key,
        role: affectation.role,
        startDate: affectation.startDate,
        endDate: affectation.endDate,
        estimatedHours: affectation.estimatedHours,
        actualHours: affectation.actualHours,
        isBillable: affectation.isBillable,
        allocationPercentage: affectation.allocationPercentage,
      });
    }

    // Calculate chargeability for each user
    const users = Array.from(userMap.values()).map((user) => ({
      ...user,
      availableHours,
      chargeabilityPercent:
        availableHours > 0
          ? Math.round((user.billableHours / availableHours) * 100 * 100) / 100
          : 0,
      utilizationPercent:
        availableHours > 0
          ? Math.round((user.totalActualHours / availableHours) * 100 * 100) / 100
          : 0,
    }));

    // Summary
    const totalBillableHours = users.reduce((sum, u) => sum + u.billableHours, 0);
    const totalActualHours = users.reduce((sum, u) => sum + u.totalActualHours, 0);
    const totalAvailableHours = users.length * availableHours;

    return {
      period: {
        startDate: query.startDate,
        endDate: query.endDate,
        workingDays,
        hoursPerDay: 8,
      },
      summary: {
        totalUsers: users.length,
        totalAvailableHours,
        totalActualHours,
        totalBillableHours,
        overallChargeability:
          totalAvailableHours > 0
            ? Math.round((totalBillableHours / totalAvailableHours) * 100 * 100) / 100
            : 0,
        overallUtilization:
          totalAvailableHours > 0
            ? Math.round((totalActualHours / totalAvailableHours) * 100 * 100) / 100
            : 0,
      },
      users,
    };
  }

  /**
   * Get resource planning view - all affectations grouped by project
   */
  async getResourcePlanningReport(): Promise<any> {
    const affectations = await this.affectationModel
      .find({
        status: { $in: [AffectationStatus.ACTIVE, AffectationStatus.PLANNED] },
      })
      .populate('userId', 'firstName lastName email avatar')
      .populate('projectId', 'name key logo')
      .sort({ projectId: 1, startDate: 1 })
      .exec();

    // Group by project
    const projectMap = new Map<string, any>();

    for (const affectation of affectations) {
      const project = affectation.projectId as any;
      const projectId = project._id.toString();

      if (!projectMap.has(projectId)) {
        projectMap.set(projectId, {
          projectId,
          projectName: project.name,
          projectKey: project.key,
          projectLogo: project.logo,
          totalEstimatedHours: 0,
          totalActualHours: 0,
          members: [],
        });
      }

      const projectData = projectMap.get(projectId);
      projectData.totalEstimatedHours += affectation.estimatedHours || 0;
      projectData.totalActualHours += affectation.actualHours || 0;

      const user = affectation.userId as any;
      projectData.members.push({
        affectationId: affectation._id,
        userId: user._id,
        userName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        avatar: user.avatar,
        role: affectation.role,
        startDate: affectation.startDate,
        endDate: affectation.endDate,
        allocationPercentage: affectation.allocationPercentage,
        estimatedHours: affectation.estimatedHours,
        actualHours: affectation.actualHours,
        status: affectation.status,
      });
    }

    return {
      projects: Array.from(projectMap.values()),
      totalProjects: projectMap.size,
    };
  }

  /**
   * Get user timeline - all affectations for a specific user
   */
  async getUserTimelineReport(userId: string): Promise<any> {
    const affectations = await this.affectationModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('userId', 'firstName lastName email avatar')
      .populate('projectId', 'name key logo')
      .sort({ startDate: -1 })
      .exec();

    if (affectations.length === 0) {
      return {
        user: null,
        timeline: [],
        summary: {
          totalAffectations: 0,
          totalEstimatedHours: 0,
          totalActualHours: 0,
          activeProjects: 0,
        },
      };
    }

    const user = affectations[0].userId as any;

    const timeline = affectations.map((aff) => {
      const project = aff.projectId as any;
      return {
        affectationId: aff._id,
        projectId: project._id,
        projectName: project.name,
        projectKey: project.key,
        projectLogo: project.logo,
        role: aff.role,
        startDate: aff.startDate,
        endDate: aff.endDate,
        allocationPercentage: aff.allocationPercentage,
        estimatedHours: aff.estimatedHours,
        actualHours: aff.actualHours,
        status: aff.status,
        isBillable: aff.isBillable,
        notes: aff.notes,
      };
    });

    const activeProjects = new Set(
      affectations
        .filter((a) => a.status === AffectationStatus.ACTIVE)
        .map((a) => (a.projectId as any)._id.toString()),
    ).size;

    return {
      user: {
        userId: user._id,
        userName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        avatar: user.avatar,
      },
      timeline,
      summary: {
        totalAffectations: affectations.length,
        totalEstimatedHours: affectations.reduce(
          (sum, a) => sum + (a.estimatedHours || 0),
          0,
        ),
        totalActualHours: affectations.reduce(
          (sum, a) => sum + (a.actualHours || 0),
          0,
        ),
        activeProjects,
      },
    };
  }
}
