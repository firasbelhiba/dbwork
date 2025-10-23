import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { CreateNotificationDto } from './dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) {}

  async create(createNotificationDto: CreateNotificationDto): Promise<NotificationDocument> {
    const notification = new this.notificationModel(createNotificationDto);
    return notification.save();
  }

  async findByUser(userId: string, unreadOnly: boolean = false): Promise<NotificationDocument[]> {
    const query: any = { userId };
    if (unreadOnly) {
      query.read = false;
    }

    return this.notificationModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();
  }

  async findOne(id: string): Promise<NotificationDocument> {
    const notification = await this.notificationModel.findById(id).exec();

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return notification;
  }

  async markAsRead(id: string, userId: string): Promise<NotificationDocument> {
    const notification = await this.findOne(id);

    if (notification.userId.toString() !== userId) {
      throw new NotFoundException('Notification not found');
    }

    notification.read = true;
    notification.readAt = new Date();

    return notification.save();
  }

  async markAllAsRead(userId: string): Promise<any> {
    return this.notificationModel
      .updateMany(
        { userId, read: false },
        { read: true, readAt: new Date() },
      )
      .exec();
  }

  async remove(id: string, userId: string): Promise<void> {
    const notification = await this.findOne(id);

    if (notification.userId.toString() !== userId) {
      throw new NotFoundException('Notification not found');
    }

    await this.notificationModel.findByIdAndDelete(id).exec();
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel
      .countDocuments({ userId, read: false })
      .exec();
  }

  async clearAll(userId: string): Promise<any> {
    return this.notificationModel
      .deleteMany({ userId, read: true })
      .exec();
  }

  // Helper methods for creating specific notification types
  async notifyIssueAssigned(
    userId: string,
    issueKey: string,
    issueTitle: string,
    assignedBy: string,
  ): Promise<NotificationDocument> {
    return this.create({
      userId,
      type: 'issue_assigned' as any,
      title: 'Issue Assigned',
      message: `You have been assigned to ${issueKey}: ${issueTitle}`,
      link: `/issues/${issueKey}`,
      metadata: { issueKey, assignedBy },
    });
  }

  async notifyIssueUpdated(
    userId: string,
    issueKey: string,
    issueTitle: string,
    updatedBy: string,
  ): Promise<NotificationDocument> {
    return this.create({
      userId,
      type: 'issue_updated' as any,
      title: 'Issue Updated',
      message: `${issueKey}: ${issueTitle} has been updated`,
      link: `/issues/${issueKey}`,
      metadata: { issueKey, updatedBy },
    });
  }

  async notifyMention(
    userId: string,
    mentionedIn: string,
    mentionedBy: string,
    link: string,
  ): Promise<NotificationDocument> {
    return this.create({
      userId,
      type: 'mention' as any,
      title: 'You were mentioned',
      message: `You were mentioned in ${mentionedIn}`,
      link,
      metadata: { mentionedBy },
    });
  }
}
