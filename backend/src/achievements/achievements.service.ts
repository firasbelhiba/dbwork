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
import { Issue, IssueDocument } from '../issues/schemas/issue.schema';
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
    @InjectModel(Issue.name)
    private issueModel: Model<IssueDocument>,
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

    // Update streak tracking
    await this.updateStreak(user);

    await user.save();

    const issuesCompleted = user.stats.issuesCompleted;

    // Check task completion achievements
    const taskAchievements = await this.achievementModel
      .find({ category: AchievementCategory.TASK_COMPLETION })
      .exec();

    for (const achievement of taskAchievements) {
      const criteria = achievement.criteria;

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

      // Check daily completion achievements (Marathon Runner)
      if (criteria.type === 'daily_completion' && criteria.count) {
        const todayIssuesCount = await this.countTodayCompletedIssues(userId);
        if (todayIssuesCount >= criteria.count) {
          const unlocked = await this.unlockAchievement(userId, achievement._id.toString());
          if (unlocked) {
            unlockedAchievements.push(unlocked);
          }
        } else {
          // Update progress
          await this.updateProgress(
            userId,
            achievement._id.toString(),
            todayIssuesCount,
            criteria.count,
          );
        }
      }
    }

    // Check streak achievements
    const streakAchievements = await this.checkStreakAchievements(userId);
    unlockedAchievements.push(...streakAchievements);

    // Check time-based achievements (Early Bird / Night Owl)
    const timeAchievements = await this.checkTimeBasedAchievements(userId);
    unlockedAchievements.push(...timeAchievements);

    return unlockedAchievements;
  }

  // Update user's streak based on activity
  private updateStreak(user: any): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!user.stats.lastActivityDate) {
      // First activity ever
      user.stats.currentStreak = 1;
      user.stats.longestStreak = 1;
      user.stats.lastActivityDate = today;
      return;
    }

    const lastActivity = new Date(user.stats.lastActivityDate);
    lastActivity.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      // Same day, no change to streak
      return;
    } else if (daysDiff === 1) {
      // Consecutive day
      user.stats.currentStreak = (user.stats.currentStreak || 0) + 1;
      user.stats.longestStreak = Math.max(
        user.stats.longestStreak || 0,
        user.stats.currentStreak
      );
    } else {
      // Streak broken
      user.stats.currentStreak = 1;
    }

    user.stats.lastActivityDate = today;
  }

  // Count issues completed today by a user
  private async countTodayCompletedIssues(userId: string): Promise<number> {
    const userIdObj = new Types.ObjectId(userId);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const count = await this.issueModel
      .countDocuments({
        assignees: userIdObj,
        status: 'done',
        updatedAt: { $gte: todayStart, $lte: todayEnd },
      })
      .exec();

    return count;
  }

  // Check streak-based achievements
  private async checkStreakAchievements(userId: string): Promise<UserAchievementDocument[]> {
    const unlockedAchievements: UserAchievementDocument[] = [];
    const user = await this.userModel.findById(userId).exec();
    if (!user) return unlockedAchievements;

    const currentStreak = user.stats.currentStreak || 0;

    // Check Daily Driver (3 days)
    const dailyDriverAchievement = await this.achievementModel.findOne({ key: 'daily_driver' }).exec();
    if (dailyDriverAchievement) {
      if (currentStreak >= 3) {
        const unlocked = await this.unlockAchievement(userId, dailyDriverAchievement._id.toString());
        if (unlocked) unlockedAchievements.push(unlocked);
      } else {
        await this.updateProgress(userId, dailyDriverAchievement._id.toString(), currentStreak, 3);
      }
    }

    // Check Week Warrior (7 days)
    const weekWarriorAchievement = await this.achievementModel.findOne({ key: 'week_warrior' }).exec();
    if (weekWarriorAchievement) {
      if (currentStreak >= 7) {
        const unlocked = await this.unlockAchievement(userId, weekWarriorAchievement._id.toString());
        if (unlocked) unlockedAchievements.push(unlocked);
      } else {
        await this.updateProgress(userId, weekWarriorAchievement._id.toString(), currentStreak, 7);
      }
    }

    // Check Monthly Grind (30 days)
    const monthlyGrindAchievement = await this.achievementModel.findOne({ key: 'monthly_grind' }).exec();
    if (monthlyGrindAchievement) {
      if (currentStreak >= 30) {
        const unlocked = await this.unlockAchievement(userId, monthlyGrindAchievement._id.toString());
        if (unlocked) unlockedAchievements.push(unlocked);
      } else {
        await this.updateProgress(userId, monthlyGrindAchievement._id.toString(), currentStreak, 30);
      }
    }

    return unlockedAchievements;
  }

  // Check time-based achievements (Early Bird / Night Owl)
  private async checkTimeBasedAchievements(userId: string): Promise<UserAchievementDocument[]> {
    const unlockedAchievements: UserAchievementDocument[] = [];
    const now = new Date();
    const hour = now.getHours();

    // Check Early Bird (before 9 AM)
    if (hour < 9) {
      const achievement = await this.achievementModel.findOne({ key: 'early_bird' }).exec();
      if (achievement) {
        const unlocked = await this.unlockAchievement(userId, achievement._id.toString());
        if (unlocked) unlockedAchievements.push(unlocked);
      }
    }

    // Check Night Owl (after 10 PM)
    if (hour >= 22) {
      const achievement = await this.achievementModel.findOne({ key: 'night_owl' }).exec();
      if (achievement) {
        const unlocked = await this.unlockAchievement(userId, achievement._id.toString());
        if (unlocked) unlockedAchievements.push(unlocked);
      }
    }

    return unlockedAchievements;
  }

  // Unlock an achievement for a user (can be called manually or automatically)
  async unlockAchievement(
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

  // Get achievement by key
  async getAchievementByKey(key: string) {
    return this.achievementModel.findOne({ key }).exec();
  }

  // Manually grant achievement to user by email
  async grantAchievementByEmail(email: string, achievementKey: string): Promise<any> {
    // Find user by email
    const user = await this.userModel.findOne({ email: email.toLowerCase() }).exec();
    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    // Find achievement by key
    const achievement = await this.getAchievementByKey(achievementKey);
    if (!achievement) {
      throw new NotFoundException(`Achievement with key ${achievementKey} not found`);
    }

    // Unlock the achievement
    const unlocked = await this.unlockAchievement(user._id.toString(), achievement._id.toString());

    return {
      success: true,
      user: {
        id: user._id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
      },
      achievement: {
        id: achievement._id,
        key: achievement.key,
        name: achievement.name,
        points: achievement.points,
      },
      alreadyUnlocked: unlocked === null,
    };
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
          'stats.mentionsReceived': 0,
          'stats.projectsAssigned': 0,
          'stats.currentStreak': 0,
          'stats.longestStreak': 0,
          'stats.lastActivityDate': null,
          completedIssuesForAchievements: [],
          commentedIssues: [],
        },
      })
      .exec();
  }

  // Sync user achievement stats based on actual completed issues
  async syncUserAchievementStats(userId: string): Promise<any> {
    const userIdObj = new Types.ObjectId(userId);
    const user = await this.userModel.findById(userIdObj).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Count completed issues where user is an assignee
    const completedIssues = await this.issueModel
      .find({
        assignees: userIdObj,
        status: 'done',
      })
      .select('_id type')
      .exec();

    const issuesCompleted = completedIssues.length;
    const bugsFixed = completedIssues.filter((i) => i.type === 'bug').length;

    // Update user stats
    user.stats.issuesCompleted = issuesCompleted;
    user.stats.bugsFixed = bugsFixed;
    user.completedIssuesForAchievements = completedIssues.map((i) => i._id) as Types.ObjectId[];
    await user.save();

    // Now check and unlock task completion achievements
    const unlockedAchievements: string[] = [];
    const taskAchievements = await this.achievementModel
      .find({ category: AchievementCategory.TASK_COMPLETION })
      .exec();

    for (const achievement of taskAchievements) {
      const criteria = achievement.criteria;
      if (criteria.type === 'issue_completion' && criteria.count) {
        if (issuesCompleted >= criteria.count) {
          const unlocked = await this.unlockAchievement(userId, achievement._id.toString());
          if (unlocked) {
            unlockedAchievements.push(achievement.name);
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

    return {
      userId,
      email: user.email,
      syncedStats: {
        issuesCompleted,
        bugsFixed,
      },
      unlockedAchievements,
    };
  }

  // Sync all users' achievement stats
  async syncAllUsersAchievementStats(): Promise<any> {
    const users = await this.userModel.find().select('_id email').exec();
    const results = [];

    for (const user of users) {
      try {
        const result = await this.syncUserAchievementStats(user._id.toString());
        results.push(result);
      } catch (error) {
        results.push({
          userId: user._id.toString(),
          email: user.email,
          error: error.message,
        });
      }
    }

    return {
      totalUsers: users.length,
      results,
    };
  }
}
