import { Injectable, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment, CommentDocument } from './schemas/comment.schema';
import { CreateCommentDto, UpdateCommentDto } from './dto';
import { ActivitiesService } from '../activities/activities.service';
import { ActionType, EntityType } from '../activities/schemas/activity.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { IssuesService } from '../issues/issues.service';
import { UsersService } from '../users/users.service';
import { AchievementsService } from '../achievements/achievements.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    private activitiesService: ActivitiesService,
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => IssuesService))
    private issuesService: IssuesService,
    private usersService: UsersService,
    private achievementsService: AchievementsService,
  ) {}

  async create(
    issueId: string,
    userId: string,
    createCommentDto: CreateCommentDto,
  ): Promise<CommentDocument> {
    // Extract @mentions from comment content
    const mentions = this.notificationsService.extractMentions(createCommentDto.content);

    const comment = new this.commentModel({
      ...createCommentDto,
      issueId: new Types.ObjectId(issueId),
      userId: new Types.ObjectId(userId),
      mentions, // Store mentions in the comment
    });

    const savedComment = await (await comment.save()).populate('userId', 'firstName lastName email avatar');

    // Log activity
    await this.activitiesService.logActivity(
      userId,
      ActionType.COMMENTED,
      EntityType.COMMENT,
      savedComment._id.toString(),
      `Comment on issue`,
      undefined,
      { issueId },
    );

    // Get issue details for notifications
    try {
      const issue = await this.issuesService.findOne(issueId);
      const recipientIds = new Set<string>();

      // 1. Notify mentioned users
      if (mentions.length > 0) {
        for (const username of mentions) {
          try {
            // Find user by firstName or lastName matching the mention
            const users = await this.usersService.findAll();
            const mentionedUser = users.find(u =>
              u.firstName.toLowerCase() === username.toLowerCase() ||
              u.lastName.toLowerCase() === username.toLowerCase() ||
              `${u.firstName}${u.lastName}`.toLowerCase() === username.toLowerCase()
            );

            if (mentionedUser && mentionedUser._id.toString() !== userId) {
              recipientIds.add(mentionedUser._id.toString());
              await this.notificationsService.notifyCommentMention(
                mentionedUser._id.toString(),
                issue._id.toString(),
                issue.key,
                issue.title,
                userId,
                createCommentDto.content,
              );
            }
          } catch (error) {
            console.error(`[NOTIFICATION] Error notifying mentioned user @${username}:`, error);
          }
        }
      }

      // 2. Notify issue reporter (if comment is on their issue)
      if (issue.reporter) {
        const reporterId = typeof issue.reporter === 'object' && issue.reporter !== null
          ? (issue.reporter as any)._id.toString()
          : String(issue.reporter);

        if (reporterId !== userId && !recipientIds.has(reporterId)) {
          recipientIds.add(reporterId);
          await this.notificationsService.notifyCommentOnIssue(
            reporterId,
            issue._id.toString(),
            issue.key,
            issue.title,
            userId,
            createCommentDto.content,
          );
        }
      }

      // 3. Notify issue assignees (if comment is on an issue assigned to them)
      if (issue.assignees && Array.isArray(issue.assignees)) {
        for (const assignee of issue.assignees) {
          const assigneeId = typeof assignee === 'object' && assignee !== null
            ? (assignee as any)._id.toString()
            : String(assignee);

          if (assigneeId !== userId && !recipientIds.has(assigneeId)) {
            recipientIds.add(assigneeId);
            await this.notificationsService.notifyCommentOnIssue(
              assigneeId,
              issue._id.toString(),
              issue.key,
              issue.title,
              userId,
              createCommentDto.content,
            );
          }
        }
      }

      // 4. Notify parent comment author (if this is a reply)
      if (createCommentDto.parentCommentId) {
        try {
          const parentComment = await this.commentModel.findById(createCommentDto.parentCommentId).exec();
          if (parentComment) {
            const parentAuthorId = parentComment.userId.toString();

            if (parentAuthorId !== userId && !recipientIds.has(parentAuthorId)) {
              recipientIds.add(parentAuthorId);
              await this.notificationsService.notifyCommentReply(
                parentAuthorId,
                issue._id.toString(),
                issue.key,
                issue.title,
                userId,
                createCommentDto.content,
              );
            }
          }
        } catch (error) {
          console.error('[NOTIFICATION] Error notifying parent comment author:', error);
        }
      }

      // Check achievements for commenter
      try {
        await this.achievementsService.checkCommentAchievements(
          userId,
          issueId,
          createCommentDto.content,
        );
      } catch (error) {
        console.error('[ACHIEVEMENTS] Error checking comment achievements:', error);
      }

      // Check mention achievements for mentioned users
      if (mentions.length > 0) {
        for (const username of mentions) {
          try {
            const users = await this.usersService.findAll();
            const mentionedUser = users.find(u =>
              u.firstName.toLowerCase() === username.toLowerCase() ||
              u.lastName.toLowerCase() === username.toLowerCase() ||
              `${u.firstName}${u.lastName}`.toLowerCase() === username.toLowerCase()
            );

            if (mentionedUser && mentionedUser._id.toString() !== userId) {
              await this.achievementsService.checkMentionAchievements(mentionedUser._id.toString());
            }
          } catch (error) {
            console.error(`[ACHIEVEMENTS] Error checking mention achievements for @${username}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('[NOTIFICATION] Error sending comment notifications:', error);
    }

    return savedComment;
  }

  async findByIssue(issueId: string): Promise<CommentDocument[]> {
    return this.commentModel
      .find({ issueId })
      .populate('userId', 'firstName lastName email avatar role')
      .populate('parentCommentId')
      .populate('reactions.userId', 'firstName lastName avatar')
      .sort({ createdAt: 1 })
      .exec();
  }

  async findOne(id: string): Promise<CommentDocument> {
    const comment = await this.commentModel
      .findById(id)
      .populate('userId', 'firstName lastName email avatar')
      .populate('parentCommentId')
      .exec();

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  async update(
    id: string,
    userId: string,
    updateCommentDto: UpdateCommentDto,
  ): Promise<CommentDocument> {
    const comment = await this.findOne(id);

    // Only the author can edit their comment
    if (comment.userId.toString() !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    comment.content = updateCommentDto.content;
    comment.isEdited = true;
    comment.editedAt = new Date();

    const updatedComment = await comment.save();

    // Log activity
    await this.activitiesService.logActivity(
      userId,
      ActionType.UPDATED,
      EntityType.COMMENT,
      updatedComment._id.toString(),
      `Updated comment`,
      undefined,
      { issueId: comment.issueId },
    );

    return updatedComment;
  }

  async remove(id: string, userId: string, isAdmin: boolean = false): Promise<void> {
    const comment = await this.findOne(id);

    // Only author or admin can delete
    if (comment.userId.toString() !== userId && !isAdmin) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentModel.findByIdAndDelete(id).exec();

    // Log activity
    await this.activitiesService.logActivity(
      userId,
      ActionType.DELETED,
      EntityType.COMMENT,
      comment._id.toString(),
      `Deleted comment`,
      undefined,
      { issueId: comment.issueId },
    );
  }

  async addReaction(
    commentId: string,
    userId: string,
    reaction: string,
  ): Promise<CommentDocument> {
    const comment = await this.findOne(commentId);

    // Check if user already reacted
    const existingReaction = comment.reactions.find(
      (r) => r.userId.toString() === userId,
    );

    if (existingReaction) {
      // Update existing reaction
      existingReaction.reaction = reaction;
    } else {
      // Add new reaction
      comment.reactions.push({
        userId: new Types.ObjectId(userId),
        reaction,
      });
    }

    return comment.save();
  }

  async removeReaction(commentId: string, userId: string): Promise<CommentDocument> {
    const comment = await this.findOne(commentId);

    comment.reactions = comment.reactions.filter(
      (r) => r.userId.toString() !== userId,
    );

    return comment.save();
  }

  async getReplies(parentCommentId: string): Promise<CommentDocument[]> {
    return this.commentModel
      .find({ parentCommentId })
      .populate('userId', 'firstName lastName email avatar')
      .sort({ createdAt: 1 })
      .exec();
  }

  async getCommentCount(issueId: string): Promise<number> {
    return this.commentModel.countDocuments({ issueId }).exec();
  }
}
