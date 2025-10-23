import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment, CommentDocument } from './schemas/comment.schema';
import { CreateCommentDto, UpdateCommentDto } from './dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
  ) {}

  async create(
    issueId: string,
    userId: string,
    createCommentDto: CreateCommentDto,
  ): Promise<CommentDocument> {
    const comment = new this.commentModel({
      ...createCommentDto,
      issueId,
      userId,
    });

    return (await comment.save()).populate('userId', 'firstName lastName email avatar');
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

    return comment.save();
  }

  async remove(id: string, userId: string, isAdmin: boolean = false): Promise<void> {
    const comment = await this.findOne(id);

    // Only author or admin can delete
    if (comment.userId.toString() !== userId && !isAdmin) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentModel.findByIdAndDelete(id).exec();
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
        userId: userId as any,
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
