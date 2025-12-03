import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto, UpdateUserDto } from './dto';
import { getCloudinary } from '../attachments/cloudinary.config';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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
    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
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
}
