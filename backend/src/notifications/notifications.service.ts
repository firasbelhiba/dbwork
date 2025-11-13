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

    // Convert ObjectId to string since notifications are stored with userId as string
    const userIdString = userId.toString();
    console.log(`[NotificationsService] Converted to string:`, userIdString);

    const query: any = { userId: userIdString };
    if (unreadOnly) {
      query.read = false;
    }

    const notifications = await this.notificationModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();

    console.log(`[NotificationsService] Found ${notifications.length} notifications`);

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
    const userIdString = userId.toString();
    return this.notificationModel
      .updateMany(
        { userId: userIdString, read: false },
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
    const userIdString = userId.toString();
    return this.notificationModel
      .countDocuments({ userId: userIdString, read: false })
      .exec();
  }

  async clearAll(userId: string | Types.ObjectId): Promise<any> {
    const userIdString = userId.toString();
    return this.notificationModel
      .deleteMany({ userId: userIdString, read: true })
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

  async notifyIssueStatusChanged(
    userId: string,
    issueKey: string,
    issueTitle: string,
    oldStatus: string,
    newStatus: string,
    changedBy: string,
  ): Promise<NotificationDocument> {
    return this.create({
      userId,
      type: 'issue_status_changed' as any,
      title: 'Issue Status Changed',
      message: `${issueKey}: ${issueTitle} status changed from ${oldStatus} to ${newStatus}`,
      link: `/issues/${issueKey}`,
      metadata: { issueKey, oldStatus, newStatus, changedBy },
    });
  }

  async notifyIssuePriorityChanged(
    userId: string,
    issueKey: string,
    issueTitle: string,
    oldPriority: string,
    newPriority: string,
    changedBy: string,
  ): Promise<NotificationDocument> {
    return this.create({
      userId,
      type: 'issue_priority_changed' as any,
      title: 'Issue Priority Changed',
      message: `${issueKey}: ${issueTitle} priority changed from ${oldPriority} to ${newPriority}`,
      link: `/issues/${issueKey}`,
      metadata: { issueKey, oldPriority, newPriority, changedBy },
    });
  }

  async notifyIssueDueDateChanged(
    userId: string,
    issueKey: string,
    issueTitle: string,
    oldDueDate: Date | null,
    newDueDate: Date | null,
    changedBy: string,
  ): Promise<NotificationDocument> {
    let message: string;
    if (!oldDueDate && newDueDate) {
      message = `${issueKey}: ${issueTitle} due date set to ${new Date(newDueDate).toLocaleDateString()}`;
    } else if (oldDueDate && !newDueDate) {
      message = `${issueKey}: ${issueTitle} due date removed`;
    } else {
      message = `${issueKey}: ${issueTitle} due date changed to ${new Date(newDueDate).toLocaleDateString()}`;
    }

    return this.create({
      userId,
      type: 'issue_due_date_changed' as any,
      title: 'Issue Due Date Changed',
      message,
      link: `/issues/${issueKey}`,
      metadata: { issueKey, oldDueDate, newDueDate, changedBy },
    });
  }
}
