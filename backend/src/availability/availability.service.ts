import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Availability, AvailabilityDocument } from './schemas/availability.schema';
import { CreateAvailabilityDto, UpdateAvailabilityDto } from './dto';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel(Availability.name) private availabilityModel: Model<AvailabilityDocument>,
  ) {}

  async create(userId: string, createDto: CreateAvailabilityDto): Promise<AvailabilityDocument> {
    // Check if availability already exists for this date
    const startOfDay = new Date(createDto.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(createDto.date);
    endOfDay.setHours(23, 59, 59, 999);

    // If it's an all-day entry, remove any existing entries for this date
    if (createDto.isAllDay !== false) {
      await this.availabilityModel.deleteMany({
        userId: new Types.ObjectId(userId),
        date: { $gte: startOfDay, $lte: endOfDay },
      });
    }

    const availability = new this.availabilityModel({
      userId: new Types.ObjectId(userId),
      date: startOfDay,
      status: createDto.status,
      note: createDto.note,
      isAllDay: createDto.isAllDay !== false,
      startTime: createDto.startTime,
      endTime: createDto.endTime,
    });

    return availability.save();
  }

  async findByUser(userId: string, startDate: Date, endDate: Date): Promise<AvailabilityDocument[]> {
    return this.availabilityModel
      .find({
        userId: new Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate },
      })
      .sort({ date: 1 })
      .exec();
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<AvailabilityDocument[]> {
    return this.availabilityModel
      .find({
        date: { $gte: startDate, $lte: endDate },
      })
      .populate('userId', 'firstName lastName email avatar')
      .sort({ date: 1, userId: 1 })
      .exec();
  }

  async findOne(id: string): Promise<AvailabilityDocument> {
    const availability = await this.availabilityModel
      .findById(id)
      .populate('userId', 'firstName lastName email avatar')
      .exec();

    if (!availability) {
      throw new NotFoundException('Availability not found');
    }

    return availability;
  }

  async update(
    id: string,
    userId: string,
    updateDto: UpdateAvailabilityDto,
    isAdmin: boolean,
  ): Promise<AvailabilityDocument> {
    const availability = await this.findOne(id);

    // Only the owner or admin can update
    if (availability.userId.toString() !== userId && !isAdmin) {
      throw new ForbiddenException('You can only update your own availability');
    }

    Object.assign(availability, updateDto);
    return availability.save();
  }

  async remove(id: string, userId: string, isAdmin: boolean): Promise<void> {
    const availability = await this.findOne(id);

    // Only the owner or admin can delete
    if (availability.userId.toString() !== userId && !isAdmin) {
      throw new ForbiddenException('You can only delete your own availability');
    }

    await this.availabilityModel.findByIdAndDelete(id).exec();
  }

  async removeByDate(userId: string, date: string): Promise<void> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    await this.availabilityModel.deleteMany({
      userId: new Types.ObjectId(userId),
      date: { $gte: startOfDay, $lte: endOfDay },
    });
  }

  async getMonthlyAvailability(userId: string, year: number, month: number): Promise<AvailabilityDocument[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    return this.findByUser(userId, startDate, endDate);
  }
}
