import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Achievement,
  AchievementDocument,
  AchievementCategory,
} from './schemas/achievement.schema';
import {
  UserAchievement,
  UserAchievementDocument,
} from './schemas/user-achievement.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AchievementsService {
  constructor(
    @InjectModel(Achievement.name)
    private achievementModel: Model<AchievementDocument>,
    @InjectModel(UserAchievement.name)
    private userAchievementModel: Model<UserAchievementDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private notificationsService: NotificationsService,
  ) {}

  // Get all available achievements
  async getAllAchievements(): Promise<AchievementDocument[]> {
    return this.achievementModel.find().sort({ points: 1 }).exec();
  }

  // Get user's achievements with progress
  async getUserAchievements(userId: string | Types.ObjectId): Promise<any[]> {
    const userIdObj = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    const userAchievements = await this.userAchievementModel
      .find({ userId: userIdObj })
      .populate('achievementId')
      .sort({ unlockedAt: -1 })
      .exec();

    return userAchievements.map((ua) => ({
      achievementId: ua.achievementId,
      unlocked: ua.unlocked,
      unlockedAt: ua.unlockedAt,
      progress: ua.progress,
      viewed: ua.viewed,
    }));
  }

  // Get newly unlocked achievements (not viewed yet)
  async getNewlyUnlockedAchievements(
    userId: string | Types.ObjectId,
  ): Promise<UserAchievementDocument[]> {
    const userIdObj = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    return this.userAchievementModel
      .find({
        userId: userIdObj,
        unlocked: true,
        viewed: false,
      })
      .populate('achievementId')
      .exec();
  }

  // Mark achievement as viewed
  async markAsViewed(userId: string | Types.ObjectId, achievementId: string): Promise<void> {
    const userIdObj = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    await this.userAchievementModel
      .updateOne(
        {
          userId: userIdObj,
          achievementId: new Types.ObjectId(achievementId),
        },
        { $set: { viewed: true } },
      )
      .exec();
  }

  // Check and unlock achievements after issue completion
  async checkIssueCompletionAchievements(
    userId: string,
    issueType: string,
    issueId: string,
  ): Promise<UserAchievementDocument[]> {
    const unlockedAchievements: UserAchievementDocument[] = [];

    // Update user stats
    const user = await this.userModel.findById(userId).exec();
    if (!user) return unlockedAchievements;

    // Anti-cheating: Check if this issue has already been counted
    const issueObjectId = new Types.ObjectId(issueId);
    if (!user.completedIssuesForAchievements) {
      user.completedIssuesForAchievements = [];
    }

    const alreadyCounted = user.completedIssuesForAchievements.some(
      (completedIssueId) => completedIssueId.toString() === issueObjectId.toString()
    );

    if (alreadyCounted) {
      // This issue has already been counted, skip to prevent cheating
      return unlockedAchievements;
    }

    // Add this issue to the completed issues list
    user.completedIssuesForAchievements.push(issueObjectId);

    // Increment stats
    user.stats.issuesCompleted = (user.stats.issuesCompleted || 0) + 1;
    if (issueType === 'bug') {
      user.stats.bugsFixed = (user.stats.bugsFixed || 0) + 1;
    }
    await user.save();

    const issuesCompleted = user.stats.issuesCompleted;

    // Check task completion achievements
    const taskAchievements = await this.achievementModel
      .find({ category: AchievementCategory.TASK_COMPLETION })
      .exec();

    for (const achievement of taskAchievements) {
      const criteria = achievement.criteria;

      // Skip sprint and daily achievements for now (we'll handle those separately)
      if (
        criteria.type === 'sprint_completion' ||
        criteria.type === 'daily_completion'
      ) {
        continue;
      }

      if (criteria.type === 'issue_completion' && criteria.count) {
        if (issuesCompleted >= criteria.count) {
          const unlocked = await this.unlockAchievement(userId, achievement._id.toString());
          if (unlocked) {
            unlockedAchievements.push(unlocked);
          }
        } else {
          // Update progress
          await this.updateProgress(
            userId,
            achievement._id.toString(),
            issuesCompleted,
            criteria.count,
          );
        }
      }
    }

    // Check Marathon Runner (5 issues in one day)
    await this.checkMarathonRunner(userId);

    return unlockedAchievements;
  }

  // Check Marathon Runner achievement (5 issues completed today)
  private async checkMarathonRunner(userId: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count issues completed today (we'd need to track this in activities or issues)
    // For now, we'll add this logic later when we have completion timestamps
  }

  // Unlock an achievement for a user
  private async unlockAchievement(
    userId: string,
    achievementId: string,
  ): Promise<UserAchievementDocument | null> {
    // Check if already unlocked
    const existing = await this.userAchievementModel
      .findOne({
        userId: new Types.ObjectId(userId),
        achievementId: new Types.ObjectId(achievementId),
        unlocked: true,
      })
      .exec();

    if (existing) {
      return null; // Already unlocked
    }

    const achievement = await this.achievementModel.findById(achievementId).exec();
    if (!achievement) return null;

    // Create or update user achievement
    const userAchievement = await this.userAchievementModel
      .findOneAndUpdate(
        {
          userId: new Types.ObjectId(userId),
          achievementId: new Types.ObjectId(achievementId),
        },
        {
          $set: {
            unlocked: true,
            unlockedAt: new Date(),
            progress: {
              current: achievement.criteria.count || 1,
              target: achievement.criteria.count || 1,
            },
          },
        },
        { upsert: true, new: true },
      )
      .populate('achievementId')
      .exec();

    // Add points to user
    await this.userModel
      .findByIdAndUpdate(userId, {
        $inc: { 'stats.totalPoints': achievement.points },
      })
      .exec();

    // Send notification
    try {
      await this.notificationsService.notifyAchievementUnlocked(
        userId,
        achievementId,
        achievement.name,
        achievement.points,
      );
    } catch (error) {
      console.error('[ACHIEVEMENTS] Error sending notification:', error);
    }

    return userAchievement;
  }

  // Update progress for an achievement
  private async updateProgress(
    userId: string,
    achievementId: string,
    current: number,
    target: number,
  ): Promise<void> {
    await this.userAchievementModel
      .findOneAndUpdate(
        {
          userId: new Types.ObjectId(userId),
          achievementId: new Types.ObjectId(achievementId),
        },
        {
          $set: {
            progress: { current, target },
          },
        },
        { upsert: true },
      )
      .exec();
  }

  // Initialize user achievements (create progress trackers for all achievements)
  async initializeUserAchievements(userId: string): Promise<void> {
    const achievements = await this.achievementModel.find().exec();

    for (const achievement of achievements) {
      const exists = await this.userAchievementModel
        .findOne({
          userId: new Types.ObjectId(userId),
          achievementId: achievement._id,
        })
        .exec();

      if (!exists) {
        await this.userAchievementModel.create({
          userId: new Types.ObjectId(userId),
          achievementId: achievement._id,
          unlocked: false,
          progress: {
            current: 0,
            target: achievement.criteria.count || 1,
          },
        });
      }
    }
  }

  // Check collaboration achievements when user comments on an issue
  async checkCommentAchievements(
    userId: string,
    issueId: string,
    commentContent: string,
  ): Promise<UserAchievementDocument[]> {
    const unlockedAchievements: UserAchievementDocument[] = [];
    const user = await this.userModel.findById(userId).exec();
    if (!user) return unlockedAchievements;

    // Increment total comments posted
    user.stats.commentsPosted = (user.stats.commentsPosted || 0) + 1;

    // Track unique issues commented on (for Social Butterfly)
    const issueObjectId = new Types.ObjectId(issueId);
    if (!user.commentedIssues) {
      user.commentedIssues = [];
    }

    const alreadyCommented = user.commentedIssues.some(
      (commentedIssue) => commentedIssue.toString() === issueObjectId.toString()
    );

    if (!alreadyCommented) {
      user.commentedIssues.push(issueObjectId);
      user.stats.uniqueIssuesCommented = user.commentedIssues.length;
    }

    await user.save();

    // Check Communicator achievement (50 comments)
    const communicatorAchievement = await this.achievementModel
      .findOne({ key: 'communicator' })
      .exec();
    if (communicatorAchievement && user.stats.commentsPosted >= 50) {
      const unlocked = await this.unlockAchievement(userId, communicatorAchievement._id.toString());
      if (unlocked) unlockedAchievements.push(unlocked);
    }

    // Check Social Butterfly achievement (25 unique issues commented)
    const socialButterflyAchievement = await this.achievementModel
      .findOne({ key: 'social_butterfly' })
      .exec();
    if (socialButterflyAchievement && user.stats.uniqueIssuesCommented >= 25) {
      const unlocked = await this.unlockAchievement(userId, socialButterflyAchievement._id.toString());
      if (unlocked) unlockedAchievements.push(unlocked);
    }

    return unlockedAchievements;
  }

  // Check mention achievements when user is mentioned in a comment
  async checkMentionAchievements(userId: string): Promise<UserAchievementDocument[]> {
    const unlockedAchievements: UserAchievementDocument[] = [];
    const user = await this.userModel.findById(userId).exec();
    if (!user) return unlockedAchievements;

    // Increment mentions received
    user.stats.mentionsReceived = (user.stats.mentionsReceived || 0) + 1;
    await user.save();

    // Check Mentor achievement (10 mentions)
    const mentorAchievement = await this.achievementModel
      .findOne({ key: 'mentor' })
      .exec();
    if (mentorAchievement && user.stats.mentionsReceived >= 10) {
      const unlocked = await this.unlockAchievement(userId, mentorAchievement._id.toString());
      if (unlocked) unlockedAchievements.push(unlocked);
    }

    return unlockedAchievements;
  }

  // Check project assignment achievement
  async checkProjectAssignmentAchievements(userId: string): Promise<UserAchievementDocument[]> {
    const unlockedAchievements: UserAchievementDocument[] = [];
    const user = await this.userModel.findById(userId).exec();
    if (!user) return unlockedAchievements;

    // Increment projects assigned
    user.stats.projectsAssigned = (user.stats.projectsAssigned || 0) + 1;
    await user.save();

    // Check Team Player achievement (first project)
    const teamPlayerAchievement = await this.achievementModel
      .findOne({ key: 'team_player' })
      .exec();
    if (teamPlayerAchievement && user.stats.projectsAssigned >= 1) {
      const unlocked = await this.unlockAchievement(userId, teamPlayerAchievement._id.toString());
      if (unlocked) unlockedAchievements.push(unlocked);
    }

    return unlockedAchievements;
  }

  // Check helpful hand achievement when issue is completed with non-assignee contributors
  async checkHelpfulHandAchievements(
    userId: string,
    issueId: string,
  ): Promise<UserAchievementDocument[]> {
    const unlockedAchievements: UserAchievementDocument[] = [];
    const user = await this.userModel.findById(userId).exec();
    if (!user) return unlockedAchievements;

    // Track issues where user helped (but wasn't assigned)
    const issueObjectId = new Types.ObjectId(issueId);
    if (!user.helpedIssues) {
      user.helpedIssues = [];
    }

    const alreadyHelped = user.helpedIssues.some(
      (helpedIssue) => helpedIssue.toString() === issueObjectId.toString()
    );

    if (!alreadyHelped) {
      user.helpedIssues.push(issueObjectId);
      user.stats.helpedOthersIssues = user.helpedIssues.length;
      await user.save();
    }

    // Check Helpful Hand achievement (helped with 5 issues)
    const helpfulHandAchievement = await this.achievementModel
      .findOne({ key: 'helpful_hand' })
      .exec();
    if (helpfulHandAchievement && user.stats.helpedOthersIssues >= 5) {
      const unlocked = await this.unlockAchievement(userId, helpfulHandAchievement._id.toString());
      if (unlocked) unlockedAchievements.push(unlocked);
    }

    return unlockedAchievements;
  }

  // Debug method to get user stats
  async getUserStats(userId: string | Types.ObjectId): Promise<any> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userIdObj = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;
    const userAchievements = await this.userAchievementModel
      .find({ userId: userIdObj })
      .populate('achievementId')
      .exec();

    return {
      userId: user._id,
      email: user.email,
      stats: user.stats,
      achievements: userAchievements.map(ua => ({
        achievement: (ua.achievementId as any).name,
        unlocked: ua.unlocked,
        progress: ua.progress,
        unlockedAt: ua.unlockedAt,
      })),
    };
  }

  // Debug method to reset user achievements
  async resetUserAchievements(userId: string | Types.ObjectId): Promise<void> {
    const userIdObj = typeof userId === 'string' ? new Types.ObjectId(userId) : userId;

    // Delete all user achievements
    await this.userAchievementModel.deleteMany({ userId: userIdObj }).exec();

    // Reset user stats and clear all tracking arrays
    await this.userModel
      .findByIdAndUpdate(userIdObj, {
        $set: {
          'stats.issuesCompleted': 0,
          'stats.bugsFixed': 0,
          'stats.totalPoints': 0,
          'stats.commentsPosted': 0,
          'stats.uniqueIssuesCommented': 0,
          'stats.helpedOthersIssues': 0,
          'stats.mentionsReceived': 0,
          'stats.projectsAssigned': 0,
          completedIssuesForAchievements: [],
          commentedIssues: [],
          helpedIssues: [],
        },
      })
      .exec();
  }
}
