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
  async getUserAchievements(userId: string): Promise<any[]> {
    const userAchievements = await this.userAchievementModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('achievementId')
      .sort({ unlockedAt: -1 })
      .exec();

    return userAchievements.map((ua) => ({
      achievement: ua.achievementId,
      unlocked: ua.unlocked,
      unlockedAt: ua.unlockedAt,
      progress: ua.progress,
      viewed: ua.viewed,
    }));
  }

  // Get newly unlocked achievements (not viewed yet)
  async getNewlyUnlockedAchievements(
    userId: string,
  ): Promise<UserAchievementDocument[]> {
    return this.userAchievementModel
      .find({
        userId: new Types.ObjectId(userId),
        unlocked: true,
        viewed: false,
      })
      .populate('achievementId')
      .exec();
  }

  // Mark achievement as viewed
  async markAsViewed(userId: string, achievementId: string): Promise<void> {
    await this.userAchievementModel
      .updateOne(
        {
          userId: new Types.ObjectId(userId),
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
  ): Promise<UserAchievementDocument[]> {
    const unlockedAchievements: UserAchievementDocument[] = [];

    // Update user stats
    const user = await this.userModel.findById(userId).exec();
    if (!user) return unlockedAchievements;

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

  // Debug method to get user stats
  async getUserStats(userId: string): Promise<any> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userAchievements = await this.userAchievementModel
      .find({ userId })
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
}
