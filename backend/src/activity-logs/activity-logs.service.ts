import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ActivityLog, ActivityLogDocument } from './schemas/activity-log.schema';

@Injectable()
export class ActivityLogsService {
  constructor(
    @InjectModel(ActivityLog.name)
    private activityLogModel: Model<ActivityLogDocument>,
  ) {}

  async log(
    entityType: string,
    entityId: string,
    userId: string,
    action: string,
    changes: Record<string, any> = {},
    metadata: Record<string, any> = {},
  ): Promise<ActivityLogDocument> {
    const activityLog = new this.activityLogModel({
      entityType,
      entityId,
      userId,
      action,
      changes,
      metadata,
    });

    return activityLog.save();
  }

  async findByEntity(
    entityType: string,
    entityId: string,
    limit: number = 50,
  ): Promise<ActivityLogDocument[]> {
    return this.activityLogModel
      .find({ entityType, entityId })
      .populate('userId', 'firstName lastName email avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async findByUser(userId: string, limit: number = 50): Promise<ActivityLogDocument[]> {
    return this.activityLogModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async findRecent(limit: number = 100): Promise<ActivityLogDocument[]> {
    return this.activityLogModel
      .find()
      .populate('userId', 'firstName lastName email avatar')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  // Helper methods for common logging scenarios
  async logIssueCreated(issueId: string, userId: string, issueData: any): Promise<ActivityLogDocument> {
    return this.log('Issue', issueId, userId, 'created', { issueData });
  }

  async logIssueUpdated(
    issueId: string,
    userId: string,
    oldData: any,
    newData: any,
  ): Promise<ActivityLogDocument> {
    return this.log('Issue', issueId, userId, 'updated', { oldData, newData });
  }

  async logIssueStatusChanged(
    issueId: string,
    userId: string,
    oldStatus: string,
    newStatus: string,
  ): Promise<ActivityLogDocument> {
    return this.log('Issue', issueId, userId, 'status_changed', {
      oldStatus,
      newStatus,
    });
  }

  async logIssueAssigned(
    issueId: string,
    userId: string,
    assigneeId: string,
  ): Promise<ActivityLogDocument> {
    return this.log('Issue', issueId, userId, 'assigned', { assigneeId });
  }

  async logCommentAdded(
    issueId: string,
    userId: string,
    commentId: string,
  ): Promise<ActivityLogDocument> {
    return this.log('Issue', issueId, userId, 'comment_added', { commentId });
  }
}
