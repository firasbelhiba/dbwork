import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Feedback, FeedbackDocument } from './schemas/feedback.schema';
import { FeedbackComment, FeedbackCommentDocument } from './schemas/feedback-comment.schema';
import { CreateFeedbackDto, UpdateFeedbackDto, QueryFeedbackDto } from './dto';
import { CreateFeedbackCommentDto } from './dto/create-feedback-comment.dto';
import { UpdateFeedbackCommentDto } from './dto/update-feedback-comment.dto';
import { FeedbackStatus } from './enums/feedback.enum';
import { FeedbackImage } from './schemas/feedback.schema';
import { ActivitiesService } from '../activities/activities.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ActionType, EntityType } from '../activities/schemas/activity.schema';
import { getCloudinary } from '../attachments/cloudinary.config';

const MAX_LIMIT = 100;

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel(Feedback.name)
    private feedbackModel: Model<FeedbackDocument>,
    @InjectModel(FeedbackComment.name)
    private feedbackCommentModel: Model<FeedbackCommentDocument>,
    @InjectModel('User')
    private userModel: Model<any>,
    private activitiesService: ActivitiesService,
    private notificationsService: NotificationsService,
  ) {}

  async create(
    createFeedbackDto: CreateFeedbackDto,
    userId: string,
  ): Promise<FeedbackDocument> {
    const feedback = new this.feedbackModel({
      ...createFeedbackDto,
      userId: new Types.ObjectId(userId),
    });

    const savedFeedback = await feedback.save();

    // Log activity
    await this.activitiesService.logActivity(
      userId,
      ActionType.CREATED,
      EntityType.FEEDBACK,
      savedFeedback._id.toString(),
      savedFeedback.title,
    );

    return savedFeedback;
  }

  async findAll(query: QueryFeedbackDto): Promise<{
    data: FeedbackDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      search,
      sortBy = 'recent',
      userId,
    } = query;

    // Cap limit at MAX_LIMIT to prevent DoS
    const cappedLimit = Math.min(limit, MAX_LIMIT);
    const skip = (page - 1) * cappedLimit;
    const filter: any = {};

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    if (userId) {
      filter.userId = new Types.ObjectId(userId);
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Determine sort order
    let sort: any = { createdAt: -1 }; // Default: most recent
    if (sortBy === 'oldest') {
      sort = { createdAt: 1 };
    } else if (sortBy === 'most_upvoted') {
      sort = { upvotes: -1, createdAt: -1 };
    }

    const [data, total] = await Promise.all([
      this.feedbackModel
        .find(filter)
        .populate('userId', 'firstName lastName email avatar')
        .populate('resolvedBy', 'firstName lastName email')
        .populate('closedBy', 'firstName lastName email')
        .sort(sort)
        .skip(skip)
        .limit(cappedLimit)
        .exec(),
      this.feedbackModel.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit: cappedLimit,
      totalPages: Math.ceil(total / cappedLimit),
    };
  }

  async findOne(id: string): Promise<FeedbackDocument> {
    const feedback = await this.feedbackModel
      .findById(id)
      .populate('userId', 'firstName lastName email avatar')
      .populate('resolvedBy', 'firstName lastName email')
      .populate('closedBy', 'firstName lastName email')
      .exec();

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    return feedback;
  }

  async update(
    id: string,
    updateFeedbackDto: UpdateFeedbackDto,
    userId: string,
  ): Promise<FeedbackDocument> {
    const feedback = await this.feedbackModel.findById(id).exec();

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    // Check if user is the owner
    if (feedback.userId.toString() !== userId.toString()) {
      throw new ForbiddenException('You can only update your own feedback');
    }

    // Don't allow updating resolved feedback
    if (feedback.status === FeedbackStatus.RESOLVED) {
      throw new BadRequestException('Cannot update resolved feedback');
    }

    Object.assign(feedback, updateFeedbackDto);
    const updatedFeedback = await feedback.save();

    // Log activity
    await this.activitiesService.logActivity(
      userId,
      ActionType.UPDATED,
      EntityType.FEEDBACK,
      updatedFeedback._id.toString(),
      updatedFeedback.title,
    );

    return this.findOne(id);
  }

  async remove(id: string, userId: string): Promise<void> {
    const feedback = await this.feedbackModel.findById(id).exec();

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    // Check if user is the owner
    if (feedback.userId.toString() !== userId.toString()) {
      throw new ForbiddenException('You can only delete your own feedback');
    }

    await this.feedbackModel.findByIdAndDelete(id).exec();

    // Log activity
    await this.activitiesService.logActivity(
      userId,
      ActionType.DELETED,
      EntityType.FEEDBACK,
      feedback._id.toString(),
      feedback.title,
    );
  }

  async toggleUpvote(id: string, userId: string): Promise<FeedbackDocument> {
    const userObjectId = new Types.ObjectId(userId);

    // Try to add upvote - only succeeds if user hasn't upvoted yet
    const addResult = await this.feedbackModel.findOneAndUpdate(
      {
        _id: id,
        upvotedBy: { $ne: userObjectId }, // Only update if user NOT in array
      },
      {
        $addToSet: { upvotedBy: userObjectId },
        $inc: { upvotes: 1 },
      },
      { new: true },
    ).exec();

    if (addResult) {
      // Successfully added upvote - notify feedback author (if not self-upvoting)
      try {
        const feedbackAuthorId = addResult.userId.toString();
        if (feedbackAuthorId !== userId) {
          await this.notificationsService.notifyFeedbackUpvoted(
            feedbackAuthorId,
            addResult._id.toString(),
            addResult.title,
            userId,
            addResult.upvotes,
          );
        }
      } catch (error) {
        console.error('[NOTIFICATION] Error notifying feedback upvoted:', error);
      }

      return this.findOne(id);
    }

    // User already upvoted - try to remove upvote
    const removeResult = await this.feedbackModel.findOneAndUpdate(
      {
        _id: id,
        upvotedBy: userObjectId, // Only update if user IS in array
      },
      {
        $pull: { upvotedBy: userObjectId },
        $inc: { upvotes: -1 },
      },
      { new: true },
    ).exec();

    if (!removeResult) {
      throw new NotFoundException('Feedback not found');
    }

    return this.findOne(id);
  }

  async resolve(id: string, adminUserId: string): Promise<FeedbackDocument> {
    const feedback = await this.feedbackModel.findById(id).exec();

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    if (feedback.status === FeedbackStatus.RESOLVED) {
      throw new BadRequestException('Feedback is already resolved');
    }

    const oldStatus = feedback.status;
    feedback.status = FeedbackStatus.RESOLVED;
    feedback.resolvedAt = new Date();
    feedback.resolvedBy = new Types.ObjectId(adminUserId);

    await feedback.save();

    // Log activity
    await this.activitiesService.logActivity(
      adminUserId,
      ActionType.COMPLETED,
      EntityType.FEEDBACK,
      feedback._id.toString(),
      feedback.title,
    );

    // Notify feedback author about status change
    try {
      const feedbackAuthorId = feedback.userId.toString();
      if (feedbackAuthorId !== adminUserId) {
        await this.notificationsService.notifyFeedbackStatusChanged(
          feedbackAuthorId,
          feedback._id.toString(),
          feedback.title,
          oldStatus,
          FeedbackStatus.RESOLVED,
          adminUserId,
        );
      }
    } catch (error) {
      console.error('[NOTIFICATION] Error notifying feedback status changed:', error);
    }

    return this.findOne(id);
  }

  async reopen(id: string, adminUserId: string): Promise<FeedbackDocument> {
    const feedback = await this.feedbackModel.findById(id).exec();

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    if (feedback.status === FeedbackStatus.OPEN) {
      throw new BadRequestException('Feedback is already open');
    }

    const oldStatus = feedback.status;
    feedback.status = FeedbackStatus.OPEN;
    feedback.resolvedAt = null;
    feedback.resolvedBy = null;

    await feedback.save();

    // Log activity
    await this.activitiesService.logActivity(
      adminUserId,
      ActionType.UPDATED,
      EntityType.FEEDBACK,
      feedback._id.toString(),
      feedback.title,
    );

    // Notify feedback author about status change
    try {
      const feedbackAuthorId = feedback.userId.toString();
      if (feedbackAuthorId !== adminUserId) {
        await this.notificationsService.notifyFeedbackStatusChanged(
          feedbackAuthorId,
          feedback._id.toString(),
          feedback.title,
          oldStatus,
          FeedbackStatus.OPEN,
          adminUserId,
        );
      }
    } catch (error) {
      console.error('[NOTIFICATION] Error notifying feedback status changed:', error);
    }

    return this.findOne(id);
  }

  async inProgress(id: string, adminUserId: string): Promise<FeedbackDocument> {
    const feedback = await this.feedbackModel.findById(id).exec();

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    if (feedback.status === FeedbackStatus.IN_PROGRESS) {
      throw new BadRequestException('Feedback is already marked as in progress');
    }

    const oldStatus = feedback.status;
    feedback.status = FeedbackStatus.IN_PROGRESS;

    await feedback.save();

    // Log activity
    await this.activitiesService.logActivity(
      adminUserId,
      ActionType.UPDATED,
      EntityType.FEEDBACK,
      feedback._id.toString(),
      feedback.title,
    );

    // Notify feedback author about status change
    try {
      const feedbackAuthorId = feedback.userId.toString();
      if (feedbackAuthorId !== adminUserId) {
        await this.notificationsService.notifyFeedbackStatusChanged(
          feedbackAuthorId,
          feedback._id.toString(),
          feedback.title,
          oldStatus,
          FeedbackStatus.IN_PROGRESS,
          adminUserId,
        );
      }
    } catch (error) {
      console.error('[NOTIFICATION] Error notifying feedback status changed:', error);
    }

    return this.findOne(id);
  }

  async toTest(id: string, adminUserId: string): Promise<FeedbackDocument> {
    const feedback = await this.feedbackModel.findById(id).exec();

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    if (feedback.status === FeedbackStatus.TO_TEST) {
      throw new BadRequestException('Feedback is already marked as to test');
    }

    const oldStatus = feedback.status;
    feedback.status = FeedbackStatus.TO_TEST;

    await feedback.save();

    // Log activity
    await this.activitiesService.logActivity(
      adminUserId,
      ActionType.UPDATED,
      EntityType.FEEDBACK,
      feedback._id.toString(),
      feedback.title,
    );

    // Notify feedback author about status change
    try {
      const feedbackAuthorId = feedback.userId.toString();
      if (feedbackAuthorId !== adminUserId) {
        await this.notificationsService.notifyFeedbackStatusChanged(
          feedbackAuthorId,
          feedback._id.toString(),
          feedback.title,
          oldStatus,
          FeedbackStatus.TO_TEST,
          adminUserId,
        );
      }
    } catch (error) {
      console.error('[NOTIFICATION] Error notifying feedback status changed:', error);
    }

    return this.findOne(id);
  }

  async close(id: string, adminUserId: string): Promise<FeedbackDocument> {
    const feedback = await this.feedbackModel.findById(id).exec();

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    if (feedback.status === FeedbackStatus.CLOSED) {
      throw new BadRequestException('Feedback is already closed');
    }

    const oldStatus = feedback.status;
    feedback.status = FeedbackStatus.CLOSED;
    feedback.closedAt = new Date();
    feedback.closedBy = new Types.ObjectId(adminUserId);

    await feedback.save();

    // Log activity
    await this.activitiesService.logActivity(
      adminUserId,
      ActionType.UPDATED,
      EntityType.FEEDBACK,
      feedback._id.toString(),
      feedback.title,
    );

    // Notify feedback author about status change
    try {
      const feedbackAuthorId = feedback.userId.toString();
      if (feedbackAuthorId !== adminUserId) {
        await this.notificationsService.notifyFeedbackStatusChanged(
          feedbackAuthorId,
          feedback._id.toString(),
          feedback.title,
          oldStatus,
          FeedbackStatus.CLOSED,
          adminUserId,
        );
      }
    } catch (error) {
      console.error('[NOTIFICATION] Error notifying feedback status changed:', error);
    }

    return this.findOne(id);
  }

  async getStats(): Promise<{
    totalFeedback: number;
    openFeedback: number;
    resolvedFeedback: number;
    byType: { [key: string]: number };
  }> {
    const [total, open, resolved, byType] = await Promise.all([
      this.feedbackModel.countDocuments(),
      this.feedbackModel.countDocuments({ status: FeedbackStatus.OPEN }),
      this.feedbackModel.countDocuments({ status: FeedbackStatus.RESOLVED }),
      this.feedbackModel.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const byTypeObj: { [key: string]: number } = {};
    byType.forEach((item) => {
      byTypeObj[item._id] = item.count;
    });

    return {
      totalFeedback: total,
      openFeedback: open,
      resolvedFeedback: resolved,
      byType: byTypeObj,
    };
  }

  // Comment methods
  async createComment(
    feedbackId: string,
    userId: string,
    createCommentDto: CreateFeedbackCommentDto,
  ): Promise<FeedbackCommentDocument> {
    // Verify feedback exists
    const feedback = await this.feedbackModel.findById(feedbackId)
      .populate({ path: 'userId', select: 'firstName lastName email avatar', model: 'User' })
      .exec();
    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    const comment = new this.feedbackCommentModel({
      feedbackId: new Types.ObjectId(feedbackId),
      userId: new Types.ObjectId(userId),
      content: createCommentDto.content,
    });

    const savedComment = await comment.save();

    // Notify feedback author if someone else commented
    try {
      const feedbackAuthorId = typeof feedback.userId === 'object' && feedback.userId !== null
        ? (feedback.userId as any)._id.toString()
        : String(feedback.userId);

      if (feedbackAuthorId !== userId) {
        await this.notificationsService.notifyFeedbackCommented(
          feedbackAuthorId,
          feedbackId,
          feedback.title,
          userId,
          createCommentDto.content,
        );
      }
    } catch (error) {
      console.error('[NOTIFICATION] Error notifying feedback commented:', error);
    }

    // Detect mentions in comment and notify mentioned users
    try {
      const mentionRegex = /@(\w+)(\w+)/g;
      const mentions = createCommentDto.content.match(mentionRegex);

      if (mentions && mentions.length > 0) {
        for (const mention of mentions) {
          // Extract firstName and lastName from @FirstNameLastName
          const nameWithoutAt = mention.substring(1); // Remove @

          // Find user by matching firstName+lastName
          const users = await this.userModel.find().select('_id firstName lastName').exec();
          const mentionedUser = users.find(u =>
            `${u.firstName}${u.lastName}`.toLowerCase() === nameWithoutAt.toLowerCase()
          );

          if (mentionedUser && mentionedUser._id.toString() !== userId.toString()) {
            await this.notificationsService.notifyFeedbackCommentMention(
              mentionedUser._id.toString(),
              feedbackId,
              savedComment._id.toString(),
              feedback.title,
              userId,
            );
          }
        }
      }
    } catch (error) {
      console.error('[NOTIFICATION] Error notifying mentions in feedback comment:', error);
    }

    // Populate user data before returning
    return this.feedbackCommentModel
      .findById(savedComment._id)
      .populate({ path: 'userId', select: 'firstName lastName email avatar', model: 'User' })
      .exec();
  }

  async getCommentsByFeedback(feedbackId: string): Promise<FeedbackCommentDocument[]> {
    return this.feedbackCommentModel
      .find({ feedbackId: new Types.ObjectId(feedbackId) })
      .populate({ path: 'userId', select: 'firstName lastName email avatar', model: 'User' })
      .sort({ createdAt: 1 }) // Oldest first
      .exec();
  }

  async updateComment(
    commentId: string,
    userId: string,
    updateCommentDto: UpdateFeedbackCommentDto,
  ): Promise<FeedbackCommentDocument> {
    const comment = await this.feedbackCommentModel.findById(commentId).exec();

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check ownership
    if (comment.userId.toString() !== userId.toString()) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    comment.content = updateCommentDto.content;
    comment.isEdited = true;
    comment.editedAt = new Date();

    await comment.save();

    return this.feedbackCommentModel
      .findById(commentId)
      .populate({ path: 'userId', select: 'firstName lastName email avatar', model: 'User' })
      .exec();
  }

  async deleteComment(commentId: string, userId: string, isAdmin: boolean): Promise<void> {
    const comment = await this.feedbackCommentModel.findById(commentId).exec();

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Allow deletion if owner or admin
    if (comment.userId.toString() !== userId.toString() && !isAdmin) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.feedbackCommentModel.findByIdAndDelete(commentId).exec();
  }

  async getCommentsCount(feedbackId: string): Promise<number> {
    return this.feedbackCommentModel
      .countDocuments({ feedbackId: new Types.ObjectId(feedbackId) })
      .exec();
  }

  async uploadImage(file: Express.Multer.File): Promise<FeedbackImage> {
    const cloudinary = getCloudinary();

    // Upload image to Cloudinary
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'feedback-images',
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' }, // Limit max dimensions
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        },
      );
      uploadStream.end(file.buffer);
    });

    return {
      url: result.secure_url,
      cloudinaryId: result.public_id,
      fileName: file.originalname,
    };
  }

  // Reaction methods for feedback comments
  async addCommentReaction(
    commentId: string,
    userId: string,
    reaction: string,
  ): Promise<FeedbackCommentDocument> {
    const comment = await this.feedbackCommentModel.findById(commentId).exec();

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if user already reacted
    const existingReaction = comment.reactions?.find(
      (r) => r.userId.toString() === userId.toString(),
    );

    if (existingReaction) {
      // Update existing reaction
      existingReaction.reaction = reaction;
    } else {
      // Add new reaction
      if (!comment.reactions) {
        comment.reactions = [];
      }
      comment.reactions.push({
        userId: new Types.ObjectId(userId),
        reaction,
      });
    }

    await comment.save();

    // Notify comment author about the reaction (if not self-reacting)
    try {
      const commentAuthorId = comment.userId.toString();
      if (commentAuthorId !== userId) {
        // Get feedback title for the notification
        const feedback = await this.feedbackModel.findById(comment.feedbackId).exec();
        if (feedback) {
          await this.notificationsService.notifyFeedbackCommentReaction(
            commentAuthorId,
            comment.feedbackId.toString(),
            commentId,
            feedback.title,
            userId,
            reaction,
          );
        }
      }
    } catch (error) {
      console.error('[NOTIFICATION] Error notifying feedback comment reaction:', error);
    }

    return this.feedbackCommentModel
      .findById(commentId)
      .populate({ path: 'userId', select: 'firstName lastName email avatar', model: 'User' })
      .exec();
  }

  async removeCommentReaction(
    commentId: string,
    userId: string,
  ): Promise<FeedbackCommentDocument> {
    const comment = await this.feedbackCommentModel.findById(commentId).exec();

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.reactions) {
      comment.reactions = comment.reactions.filter(
        (r) => r.userId.toString() !== userId.toString(),
      );
    }

    await comment.save();

    return this.feedbackCommentModel
      .findById(commentId)
      .populate({ path: 'userId', select: 'firstName lastName email avatar', model: 'User' })
      .exec();
  }
}
