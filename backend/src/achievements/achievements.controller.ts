import { Controller, Get, Param, Put, Post, Body, UseGuards, Req } from '@nestjs/common';
import { Types } from 'mongoose';
import { AchievementsService } from './achievements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('achievements')
@UseGuards(JwtAuthGuard)
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  @Get()
  async getAllAchievements() {
    return this.achievementsService.getAllAchievements();
  }

  @Get('user/:userId')
  async getUserAchievements(@Param('userId') userId: string) {
    return this.achievementsService.getUserAchievements(userId);
  }

  @Get('my-achievements')
  async getMyAchievements(@Req() req: any) {
    return this.achievementsService.getUserAchievements(req.user._id);
  }

  @Get('newly-unlocked')
  async getNewlyUnlockedAchievements(@Req() req: any) {
    return this.achievementsService.getNewlyUnlockedAchievements(
      req.user._id,
    );
  }

  @Put('mark-viewed/:achievementId')
  async markAsViewed(@Req() req: any, @Param('achievementId') achievementId: string) {
    await this.achievementsService.markAsViewed(req.user._id, achievementId);
    return { success: true };
  }

  @Get('debug/check-my-achievements')
  async debugCheckAchievements(@Req() req: any) {
    // Generate a unique fake issue ID for testing to avoid cheating detection
    const fakeIssueId = new Types.ObjectId().toString();
    const result = await this.achievementsService.checkIssueCompletionAchievements(
      req.user._id,
      'task', // Generic issue type
      fakeIssueId, // Use a unique ID each time for testing
    );
    return {
      message: 'Achievement check completed',
      newlyUnlocked: result,
      userId: req.user._id,
    };
  }

  @Get('debug/my-stats')
  async debugGetMyStats(@Req() req: any) {
    return this.achievementsService.getUserStats(req.user._id);
  }

  @Post('debug/reset-my-achievements')
  async debugResetMyAchievements(@Req() req: any) {
    await this.achievementsService.resetUserAchievements(req.user._id);
    return {
      message: 'Your achievements and stats have been reset',
      userId: req.user._id,
    };
  }

  @Post('admin/grant')
  async grantAchievement(@Body() body: { email: string; achievementKey: string }) {
    const { email, achievementKey } = body;

    if (!email || !achievementKey) {
      return {
        success: false,
        message: 'Email and achievementKey are required',
      };
    }

    const result = await this.achievementsService.grantAchievementByEmail(email, achievementKey);
    return result;
  }

  @Post('admin/sync-my-stats')
  async syncMyStats(@Req() req: any) {
    return this.achievementsService.syncUserAchievementStats(req.user._id);
  }

  @Post('admin/sync-all-stats')
  async syncAllStats() {
    return this.achievementsService.syncAllUsersAchievementStats();
  }
}
