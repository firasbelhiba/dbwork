import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto, UpdateUserDto } from './dto';
import { getCloudinary } from '../attachments/cloudinary.config';
import { Issue, IssueDocument } from '@issues/schemas/issue.schema';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Issue.name) private issueModel: Model<IssueDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const { email, password } = createUserDto;

    const existingUser = await this.userModel.findOne({ email }).exec();
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });

    return user.save();
  }

  async findAll(
    filters: any = {},
    options: { page?: number; limit?: number } = {},
  ): Promise<{
    items: UserDocument[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const page = options.page || 1;
    const limit = Math.min(options.limit || DEFAULT_LIMIT, MAX_LIMIT);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.userModel
        .find(filters)
        .select('-password -refreshToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filters),
    ]);

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Internal method to get all users without pagination.
   * Use sparingly - only for internal operations like mention matching.
   * Still has a safety cap of 1000 users.
   */
  async findAllInternal(filters: any = {}): Promise<UserDocument[]> {
    return this.userModel
      .find(filters)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .limit(1000) // Safety cap
      .exec();
  }

  async findOne(id: string): Promise<UserDocument> {
    const user = await this.userModel
      .findById(id)
      .select('-password -refreshToken')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserDocument> {
    // If password is provided, hash it before saving
    const updateData = { ...updateUserDto };
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .select('-password -refreshToken')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async uploadAvatar(id: string, file: Express.Multer.File): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const cloudinary = getCloudinary();

    // Delete old avatar from Cloudinary if it exists
    if (user.avatarCloudinaryId) {
      try {
        await cloudinary.uploader.destroy(user.avatarCloudinaryId);
      } catch (error) {
        console.error('Error deleting old avatar from Cloudinary:', error);
      }
    }

    // Upload new avatar to Cloudinary
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'avatars',
          resource_type: 'image',
          transformation: [
            { width: 200, height: 200, crop: 'fill', gravity: 'face' },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      uploadStream.end(file.buffer);
    });

    // Update user with new avatar URL and Cloudinary ID
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        id,
        { avatar: result.secure_url, avatarCloudinaryId: result.public_id },
        { new: true },
      )
      .select('-password -refreshToken')
      .exec();

    return updatedUser;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException('User not found');
    }
  }

  async deactivate(id: string): Promise<UserDocument> {
    return this.update(id, { isActive: false });
  }

  async activate(id: string): Promise<UserDocument> {
    return this.update(id, { isActive: true });
  }

  async search(query: string): Promise<UserDocument[]> {
    return this.userModel
      .find({
        $or: [
          { firstName: { $regex: query, $options: 'i' } },
          { lastName: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
        ],
      })
      .select('-password -refreshToken')
      .limit(10)
      .exec();
  }

  async updateNotificationPreferences(
    userId: string,
    preferences: Record<string, boolean>,
  ): Promise<UserDocument> {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Merge new preferences with existing ones
    const updatedPreferences = {
      ...user.preferences,
      notificationPreferences: {
        ...user.preferences.notificationPreferences,
        ...preferences,
      },
    };

    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { preferences: updatedPreferences },
        { new: true },
      )
      .select('-password -refreshToken')
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  async getNotificationPreferences(userId: string): Promise<any> {
    const user = await this.userModel
      .findById(userId)
      .select('preferences.notificationPreferences')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.preferences?.notificationPreferences || {};
  }

  // ==================== TODO QUEUE METHODS ====================

  /**
   * Get user's todo queue with populated issue details
   * Filters out completed/archived issues and issues no longer assigned to user
   */
  async getTodoQueue(userId: string): Promise<{
    currentInProgress: IssueDocument | null;
    queue: IssueDocument[];
  }> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userObjectId = new Types.ObjectId(userId);

    // Get all issues in user's queue that are still valid
    const queueIssueIds = user.todoQueue || [];

    // Find valid issues (not archived, not done, still assigned to user)
    const validIssues = await this.issueModel
      .find({
        _id: { $in: queueIssueIds },
        isArchived: { $ne: true },
        status: { $nin: ['done'] },
        assignees: userObjectId,
      })
      .populate('projectId', 'name key logo')
      .exec();

    // Create a map for ordering
    const issueMap = new Map<string, IssueDocument>();
    validIssues.forEach(issue => {
      issueMap.set(issue._id.toString(), issue);
    });

    // Order issues according to queue order, filtering out invalid ones
    const orderedQueue: IssueDocument[] = [];
    const validIds: Types.ObjectId[] = [];

    for (const issueId of queueIssueIds) {
      const issue = issueMap.get(issueId.toString());
      if (issue) {
        orderedQueue.push(issue);
        validIds.push(issueId);
      }
    }

    // Update queue if some issues were removed (cleanup)
    if (validIds.length !== queueIssueIds.length) {
      await this.userModel.findByIdAndUpdate(userId, {
        todoQueue: validIds,
      });
    }

    // Get current in_progress ticket (may or may not be in queue)
    const currentInProgress = await this.issueModel
      .findOne({
        assignees: userObjectId,
        status: 'in_progress',
        isArchived: { $ne: true },
      })
      .populate('projectId', 'name key logo')
      .exec();

    // Remove current in_progress from queue display (it's shown separately)
    const queueWithoutCurrent = orderedQueue.filter(
      issue => issue.status !== 'in_progress'
    );

    return {
      currentInProgress,
      queue: queueWithoutCurrent,
    };
  }

  /**
   * Update the entire todo queue order
   */
  async updateTodoQueue(userId: string, issueIds: string[]): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userObjectId = new Types.ObjectId(userId);

    // Validate all issues exist and are assigned to user
    const issues = await this.issueModel
      .find({
        _id: { $in: issueIds.map(id => new Types.ObjectId(id)) },
        assignees: userObjectId,
        isArchived: { $ne: true },
      })
      .exec();

    const validIds = new Set(issues.map(i => i._id.toString()));
    const filteredIds = issueIds
      .filter(id => validIds.has(id))
      .map(id => new Types.ObjectId(id));

    await this.userModel.findByIdAndUpdate(userId, {
      todoQueue: filteredIds,
    });
  }

  /**
   * Add an issue to the todo queue
   */
  async addToQueue(
    userId: string,
    issueId: string,
    position?: number,
  ): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userObjectId = new Types.ObjectId(userId);
    const issueObjectId = new Types.ObjectId(issueId);

    // Validate issue exists and is assigned to user
    const issue = await this.issueModel.findOne({
      _id: issueObjectId,
      assignees: userObjectId,
      isArchived: { $ne: true },
    }).exec();

    if (!issue) {
      throw new BadRequestException('Issue not found or not assigned to you');
    }

    // Check if already in queue
    const currentQueue = user.todoQueue || [];
    const alreadyInQueue = currentQueue.some(
      id => id.toString() === issueId
    );

    if (alreadyInQueue) {
      return; // Already in queue, no action needed
    }

    // Add to queue at specified position or end
    const newQueue = [...currentQueue];
    if (position !== undefined && position >= 0 && position <= newQueue.length) {
      newQueue.splice(position, 0, issueObjectId);
    } else {
      newQueue.push(issueObjectId);
    }

    await this.userModel.findByIdAndUpdate(userId, {
      todoQueue: newQueue,
    });
  }

  /**
   * Remove an issue from the todo queue
   */
  async removeFromQueue(userId: string, issueId: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const newQueue = (user.todoQueue || []).filter(
      id => id.toString() !== issueId
    );

    await this.userModel.findByIdAndUpdate(userId, {
      todoQueue: newQueue,
    });
  }

  /**
   * Get available issues to add to queue (assigned but not in queue)
   */
  async getAvailableForQueue(userId: string): Promise<IssueDocument[]> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userObjectId = new Types.ObjectId(userId);
    const queueIds = (user.todoQueue || []).map(id => id.toString());

    // Find issues assigned to user that are not done, not archived, and not in queue
    const availableIssues = await this.issueModel
      .find({
        assignees: userObjectId,
        isArchived: { $ne: true },
        status: { $nin: ['done'] },
      })
      .populate('projectId', 'name key logo')
      .sort({ updatedAt: -1 })
      .exec();

    // Filter out issues already in queue
    return availableIssues.filter(
      issue => !queueIds.includes(issue._id.toString())
    );
  }
}
