import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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

  async findByUser(userId: string | Types.ObjectId, unreadOnly: boolean = false): Promise<NotificationDocument[]> {
    console.log(`[NotificationsService] Finding notifications for userId: ${userId}, type: ${typeof userId}, unreadOnly: ${unreadOnly}`);

    // Convert to ObjectId if it's a string, otherwise use as-is
    const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    console.log(`[NotificationsService] Converted userId to:`, userObjectId);

    const query: any = { userId: userObjectId };
    if (unreadOnly) {
      query.read = false;
    }

    console.log(`[NotificationsService] Query:`, JSON.stringify(query));

    const notifications = await this.notificationModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();

    console.log(`[NotificationsService] Found ${notifications.length} notifications`);

    // Also try to find ALL notifications to see if there are any in the database
    const allNotifications = await this.notificationModel.find({}).limit(10).exec();
    console.log(`[NotificationsService] Total notifications in DB: ${allNotifications.length}`);
    if (allNotifications.length > 0) {
      console.log(`[NotificationsService] Sample notification:`, {
        userId: allNotifications[0].userId.toString(),
        type: allNotifications[0].type,
        title: allNotifications[0].title,
      });
    }

    return notifications;
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

  async markAllAsRead(userId: string | Types.ObjectId): Promise<any> {
    const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    return this.notificationModel
      .updateMany(
        { userId: userObjectId, read: false },
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

  async getUnreadCount(userId: string | Types.ObjectId): Promise<number> {
    const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    return this.notificationModel
      .countDocuments({ userId: userObjectId, read: false })
      .exec();
  }

  async clearAll(userId: string | Types.ObjectId): Promise<any> {
    const userObjectId = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    return this.notificationModel
      .deleteMany({ userId: userObjectId, read: true })
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
