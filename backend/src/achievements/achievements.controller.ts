import { Controller, Get, Param, Put, Post, UseGuards, Req } from '@nestjs/common';
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
    const result = await this.achievementsService.checkIssueCompletionAchievements(
      req.user._id,
      'task', // Generic issue type
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
}
