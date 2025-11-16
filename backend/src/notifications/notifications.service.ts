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

  async notifyCommentOnIssue(
    userId: string,
    issueKey: string,
    issueTitle: string,
    commentedBy: string,
    commentPreview: string,
  ): Promise<NotificationDocument> {
    const preview = commentPreview.length > 100
      ? commentPreview.substring(0, 100) + '...'
      : commentPreview;

    return this.create({
      userId,
      type: 'comment_on_issue' as any,
      title: 'New Comment on Issue',
      message: `New comment on ${issueKey}: ${issueTitle} - "${preview}"`,
      link: `/issues/${issueKey}`,
      metadata: { issueKey, commentedBy, commentPreview },
    });
  }

  async notifyCommentMention(
    userId: string,
    issueKey: string,
    issueTitle: string,
    mentionedBy: string,
    commentPreview: string,
  ): Promise<NotificationDocument> {
    const preview = commentPreview.length > 100
      ? commentPreview.substring(0, 100) + '...'
      : commentPreview;

    return this.create({
      userId,
      type: 'comment_mention' as any,
      title: 'You were mentioned',
      message: `You were mentioned in a comment on ${issueKey}: "${preview}"`,
      link: `/issues/${issueKey}`,
      metadata: { issueKey, mentionedBy, commentPreview },
    });
  }

  async notifyCommentReply(
    userId: string,
    issueKey: string,
    issueTitle: string,
    repliedBy: string,
    replyPreview: string,
  ): Promise<NotificationDocument> {
    const preview = replyPreview.length > 100
      ? replyPreview.substring(0, 100) + '...'
      : replyPreview;

    return this.create({
      userId,
      type: 'comment_reply' as any,
      title: 'Reply to Your Comment',
      message: `New reply on ${issueKey}: "${preview}"`,
      link: `/issues/${issueKey}`,
      metadata: { issueKey, repliedBy, replyPreview },
    });
  }

  // Helper function to extract @mentions from text
  extractMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]); // Extract username without @
    }

    return [...new Set(mentions)]; // Remove duplicates
  }

  // Project-level notification methods
  async notifyProjectMemberAdded(
    userId: string,
    projectKey: string,
    projectName: string,
    addedBy: string,
  ): Promise<NotificationDocument> {
    return this.create({
      userId,
      type: 'project_member_added' as any,
      title: 'Added to Project',
      message: `You were added to project ${projectKey}: ${projectName}`,
      link: `/projects/${projectKey}`,
      metadata: { projectKey, addedBy },
    });
  }

  async notifyProjectMemberRemoved(
    userId: string,
    projectKey: string,
    projectName: string,
    removedBy: string,
  ): Promise<NotificationDocument> {
    return this.create({
      userId,
      type: 'project_member_removed' as any,
      title: 'Removed from Project',
      message: `You were removed from project ${projectKey}: ${projectName}`,
      link: `/projects`,
      metadata: { projectKey, removedBy },
    });
  }

  async notifyProjectRoleChanged(
    userId: string,
    projectKey: string,
    projectName: string,
    oldRole: string,
    newRole: string,
    changedBy: string,
  ): Promise<NotificationDocument> {
    return this.create({
      userId,
      type: 'project_role_changed' as any,
      title: 'Project Role Changed',
      message: `Your role in ${projectKey}: ${projectName} changed from ${oldRole} to ${newRole}`,
      link: `/projects/${projectKey}`,
      metadata: { projectKey, oldRole, newRole, changedBy },
    });
  }

  async notifyProjectArchived(
    userId: string,
    projectKey: string,
    projectName: string,
    archivedBy: string,
  ): Promise<NotificationDocument> {
    return this.create({
      userId,
      type: 'project_archived' as any,
      title: 'Project Archived',
      message: `Project ${projectKey}: ${projectName} has been archived`,
      link: `/projects/${projectKey}`,
      metadata: { projectKey, archivedBy },
    });
  }

  async notifyProjectDeleted(
    userId: string,
    projectKey: string,
    projectName: string,
    deletedBy: string,
  ): Promise<NotificationDocument> {
    return this.create({
      userId,
      type: 'project_deleted' as any,
      title: 'Project Deleted',
      message: `Project ${projectKey}: ${projectName} has been deleted`,
      link: `/projects`,
      metadata: { projectKey, deletedBy },
    });
  }

  // Sprint-level notification methods
  async notifySprintIssueAdded(
    userId: string,
    issueKey: string,
    issueTitle: string,
    sprintName: string,
    sprintId: string,
  ): Promise<NotificationDocument> {
    return this.create({
      userId,
      type: 'sprint_issue_added' as any,
      title: 'Issue Added to Sprint',
      message: `Your issue ${issueKey}: ${issueTitle} was added to sprint "${sprintName}"`,
      link: `/sprints/${sprintId}`,
      metadata: { issueKey, sprintName, sprintId },
    });
  }

  async notifySprintStartingSoon(
    userId: string,
    sprintName: string,
    sprintId: string,
    startDate: Date,
    daysUntilStart: number,
  ): Promise<NotificationDocument> {
    return this.create({
      userId,
      type: 'sprint_starting_soon' as any,
      title: 'Sprint Starting Soon',
      message: `Sprint "${sprintName}" starts in ${daysUntilStart} day${daysUntilStart !== 1 ? 's' : ''} on ${new Date(startDate).toLocaleDateString()}`,
      link: `/sprints/${sprintId}`,
      metadata: { sprintName, sprintId, startDate, daysUntilStart },
    });
  }

  async notifySprintEndingSoon(
    userId: string,
    sprintName: string,
    sprintId: string,
    endDate: Date,
    daysUntilEnd: number,
  ): Promise<NotificationDocument> {
    return this.create({
      userId,
      type: 'sprint_ending_soon' as any,
      title: 'Sprint Ending Soon',
      message: `Sprint "${sprintName}" ends in ${daysUntilEnd} day${daysUntilEnd !== 1 ? 's' : ''} on ${new Date(endDate).toLocaleDateString()}`,
      link: `/sprints/${sprintId}`,
      metadata: { sprintName, sprintId, endDate, daysUntilEnd },
    });
  }

  // Feedback notification methods
  async notifyFeedbackUpvoted(
    userId: string,
    feedbackId: string,
    feedbackTitle: string,
    upvotedBy: string,
    totalUpvotes: number,
  ): Promise<NotificationDocument> {
    return this.create({
      userId,
      type: 'feedback_upvoted' as any,
      title: 'Feedback Upvoted',
      message: `Your feedback "${feedbackTitle}" received an upvote (${totalUpvotes} total)`,
      link: `/feedback/${feedbackId}`,
      metadata: { feedbackId, upvotedBy, totalUpvotes },
    });
  }

  async notifyFeedbackStatusChanged(
    userId: string,
    feedbackId: string,
    feedbackTitle: string,
    oldStatus: string,
    newStatus: string,
    changedBy: string,
  ): Promise<NotificationDocument> {
    const statusMap: {[key: string]: string} = {
      'open': 'Open',
      'to_test': 'To Test',
      'resolved': 'Resolved',
    };

    const formattedOldStatus = statusMap[oldStatus] || oldStatus;
    const formattedNewStatus = statusMap[newStatus] || newStatus;

    return this.create({
      userId,
      type: 'feedback_status_changed' as any,
      title: 'Feedback Status Changed',
      message: `Your feedback "${feedbackTitle}" status changed from ${formattedOldStatus} to ${formattedNewStatus}`,
      link: `/feedback/${feedbackId}`,
      metadata: { feedbackId, oldStatus, newStatus, changedBy },
    });
  }

  async notifyFeedbackCommented(
    userId: string,
    feedbackId: string,
    feedbackTitle: string,
    commentedBy: string,
    commentPreview: string,
  ): Promise<NotificationDocument> {
    const preview = commentPreview.length > 100
      ? commentPreview.substring(0, 100) + '...'
      : commentPreview;

    return this.create({
      userId,
      type: 'feedback_commented' as any,
      title: 'New Comment on Feedback',
      message: `New comment on "${feedbackTitle}": "${preview}"`,
      link: `/feedback/${feedbackId}`,
      metadata: { feedbackId, commentedBy, commentPreview },
    });
  }

  async notifyFeedbackCommentMention(
    userId: string,
    feedbackId: string,
    commentId: string,
    feedbackTitle: string,
    mentionedBy: string,
  ): Promise<NotificationDocument> {
    return this.create({
      userId,
      type: 'comment_mention' as any,
      title: 'You were mentioned',
      message: `You were mentioned in a comment on feedback: "${feedbackTitle}"`,
      link: `/feedback/${feedbackId}`,
      metadata: { feedbackId, commentId, mentionedBy },
    });
  }

  // Changelog notification methods
  async notifyNewChangelog(
    userId: string,
    changelogId: string,
    version: string,
    title: string,
  ): Promise<NotificationDocument> {
    return this.create({
      userId,
      type: 'new_changelog' as any,
      title: 'New Version Released',
      message: `Version ${version} has been released: ${title}`,
      link: `/changelog/${changelogId}`,
      metadata: { changelogId, version },
    });
  }
}
