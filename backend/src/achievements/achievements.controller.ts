import { Controller, Get, Param, Put, UseGuards, Req } from '@nestjs/common';
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
    return this.achievementsService.getUserAchievements(req.user.userId);
  }

  @Get('newly-unlocked')
  async getNewlyUnlockedAchievements(@Req() req: any) {
    return this.achievementsService.getNewlyUnlockedAchievements(
      req.user.userId,
    );
  }

  @Put('mark-viewed/:achievementId')
  async markAsViewed(@Req() req: any, @Param('achievementId') achievementId: string) {
    await this.achievementsService.markAsViewed(req.user.userId, achievementId);
    return { success: true };
  }

  @Get('debug/check-my-achievements')
  async debugCheckAchievements(@Req() req: any) {
    console.log('[DEBUG] Manually checking achievements for user:', req.user.userId);
    const result = await this.achievementsService.checkIssueCompletionAchievements(
      req.user.userId,
      'task', // Generic issue type
    );
    return {
      message: 'Achievement check completed',
      newlyUnlocked: result,
      userId: req.user.userId,
    };
  }

  @Get('debug/my-stats')
  async debugGetMyStats(@Req() req: any) {
    return this.achievementsService.getUserStats(req.user.userId);
  }
}
