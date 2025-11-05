import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Changelog, ChangelogDocument } from './schemas/changelog.schema';
import {
  CreateChangelogDto,
  UpdateChangelogDto,
  QueryChangelogDto,
} from './dto';
import { ActivitiesService } from '../activities/activities.service';
import { ActionType, EntityType } from '../activities/schemas/activity.schema';

@Injectable()
export class ChangelogsService {
  constructor(
    @InjectModel(Changelog.name)
    private changelogModel: Model<ChangelogDocument>,
    private activitiesService: ActivitiesService,
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
}
