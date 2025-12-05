import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IssuesService } from './issues.service';
import { TimeTrackingService } from './time-tracking.service';
import { TimeTrackingSchedulerService } from './time-tracking-scheduler.service';
import { IssuesController } from './issues.controller';
import { Issue, IssueSchema } from './schemas/issue.schema';
import { UsersModule } from '../users/users.module';
import { ActivitiesModule } from '../activities/activities.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AchievementsModule } from '../achievements/achievements.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Issue.name, schema: IssueSchema }]),
    UsersModule, // UsersModule exports MongooseModule with User model
    ActivitiesModule,
    NotificationsModule,
    AchievementsModule,
    forwardRef(() => ProjectsModule),
  ],
  controllers: [IssuesController],
  providers: [IssuesService, TimeTrackingService, TimeTrackingSchedulerService],
  exports: [IssuesService, TimeTrackingService],
})
export class IssuesModule {}
