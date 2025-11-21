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

  async findAll(filters: any = {}): Promise<UserDocument[]> {
    return this.userModel
      .find(filters)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
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

  async updateAvatar(id: string, avatarPath: string): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, { avatar: avatarPath }, { new: true })
      .select('-password -refreshToken')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
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
