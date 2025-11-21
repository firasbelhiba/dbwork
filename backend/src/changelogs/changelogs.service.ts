import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Changelog, ChangelogDocument } from './schemas/changelog.schema';
import {
  CreateChangelogDto,
  UpdateChangelogDto,
  QueryChangelogDto,
} from './dto';
import { ActivitiesService } from '../activities/activities.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActionType, EntityType } from '../activities/schemas/activity.schema';

@Injectable()
export class ChangelogsService {
  constructor(
    @InjectModel(Changelog.name)
    private changelogModel: Model<ChangelogDocument>,
    @InjectModel('User')
    private userModel: Model<any>,
    private activitiesService: ActivitiesService,
    private notificationsService: NotificationsService,
  ) {}

  async create(
    createChangelogDto: CreateChangelogDto,
    userId: string,
  ): Promise<ChangelogDocument> {
    const changelog = new this.changelogModel({
      ...createChangelogDto,
      createdBy: new Types.ObjectId(userId),
    });

    const savedChangelog = await (await changelog.save()).populate(
      'createdBy',
      'firstName lastName email',
    );

    // Log activity
    await this.activitiesService.logActivity(
      userId,
      ActionType.CREATED,
      EntityType.CHANGELOG,
      savedChangelog._id.toString(),
      `${savedChangelog.version} - ${savedChangelog.title}`,
    );

    return savedChangelog;
  }

  async findAll(query: QueryChangelogDto): Promise<{
    data: ChangelogDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.changelogModel
        .find()
        .populate('createdBy', 'firstName lastName email')
        .sort({ releaseDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.changelogModel.countDocuments(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<ChangelogDocument> {
    const changelog = await this.changelogModel
      .findById(id)
      .populate('createdBy', 'firstName lastName email')
      .exec();

    if (!changelog) {
      throw new NotFoundException('Changelog not found');
    }

    return changelog;
  }

  async findLatest(): Promise<ChangelogDocument | null> {
    return this.changelogModel
      .findOne()
      .populate('createdBy', 'firstName lastName email')
      .sort({ releaseDate: -1 })
      .exec();
  }

  async update(
    id: string,
    updateChangelogDto: UpdateChangelogDto,
    userId?: string,
  ): Promise<ChangelogDocument> {
    const changelog = await this.changelogModel
      .findByIdAndUpdate(id, updateChangelogDto, { new: true })
      .populate('createdBy', 'firstName lastName email')
      .exec();

    if (!changelog) {
      throw new NotFoundException('Changelog not found');
    }

    // Log activity if userId provided
    if (userId) {
      await this.activitiesService.logActivity(
        userId,
        ActionType.UPDATED,
        EntityType.CHANGELOG,
        changelog._id.toString(),
        `${changelog.version} - ${changelog.title}`,
      );
    }

    return changelog;
  }

  async remove(id: string, userId?: string): Promise<void> {
    const changelog = await this.changelogModel.findById(id);

    if (!changelog) {
      throw new NotFoundException('Changelog not found');
    }

    // Don't allow deleting published changelogs
    if (changelog.isPublished) {
      throw new BadRequestException('Cannot delete published changelog');
    }

    await this.changelogModel.findByIdAndDelete(id).exec();

    // Log activity if userId provided
    if (userId) {
      await this.activitiesService.logActivity(
        userId,
        ActionType.DELETED,
        EntityType.CHANGELOG,
        id,
        `${changelog.version} - ${changelog.title}`,
      );
    }
  }

  async publish(id: string, userId: string): Promise<ChangelogDocument> {
    const changelog = await this.changelogModel.findById(id).exec();

    if (!changelog) {
      throw new NotFoundException('Changelog not found');
    }

    if (changelog.isPublished) {
      throw new BadRequestException('Changelog is already published');
    }

    changelog.isPublished = true;
    changelog.publishedAt = new Date();

    await changelog.save();

    // Log activity
    await this.activitiesService.logActivity(
      userId,
      ActionType.PUBLISHED,
      EntityType.CHANGELOG,
      changelog._id.toString(),
      `${changelog.version} - ${changelog.title}`,
    );

    // Notify all active users about the new changelog
    try {
      const activeUsers = await this.userModel
        .find({ isActive: true })
        .select('_id')
        .exec();

      for (const user of activeUsers) {
        // Skip the user who published
        if (user._id.toString() === userId.toString()) continue;

        try {
          await this.notificationsService.notifyNewChangelog(
            user._id.toString(),
            changelog._id.toString(),
            changelog.version,
            changelog.title,
          );
        } catch (error) {
          console.error(`[NOTIFICATION] Error notifying new changelog for user ${user._id}:`, error);
        }
      }
    } catch (error) {
      console.error('[NOTIFICATION] Error notifying new changelog:', error);
    }

    return this.findOne(id);
  }

  async unpublish(id: string, userId: string): Promise<ChangelogDocument> {
    const changelog = await this.changelogModel.findById(id).exec();

    if (!changelog) {
      throw new NotFoundException('Changelog not found');
    }

    if (!changelog.isPublished) {
      throw new BadRequestException('Changelog is not published');
    }

    changelog.isPublished = false;
    changelog.publishedAt = null;

    await changelog.save();

    // Log activity
    await this.activitiesService.logActivity(
      userId,
      ActionType.UPDATED,
      EntityType.CHANGELOG,
      changelog._id.toString(),
      `${changelog.version} - ${changelog.title}`,
    );

    return this.findOne(id);
  }
}
