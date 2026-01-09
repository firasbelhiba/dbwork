import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AchievementsService } from './achievements.service';
import { AchievementsController } from './achievements.controller';
import {
  Achievement,
  AchievementSchema,
} from './schemas/achievement.schema';
import {
  UserAchievement,
  UserAchievementSchema,
} from './schemas/user-achievement.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Issue, IssueSchema } from '../issues/schemas/issue.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Achievement.name, schema: AchievementSchema },
      { name: UserAchievement.name, schema: UserAchievementSchema },
      { name: User.name, schema: UserSchema },
      { name: Issue.name, schema: IssueSchema },
    ]),
    NotificationsModule,
  ],
  controllers: [AchievementsController],
  providers: [AchievementsService],
  exports: [AchievementsService],
})
export class AchievementsModule {}
