import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { IssuesModule } from './issues/issues.module';
import { SprintsModule } from './sprints/sprints.module';
import { CommentsModule } from './comments/comments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { ActivitiesModule } from './activities/activities.module';
import { ReportsModule } from './reports/reports.module';
import { FeedbackModule } from './feedback/feedback.module';
import { ChangelogsModule } from './changelogs/changelogs.module';
import { AchievementsModule } from './achievements/achievements.module';
import { MailModule } from './mail/mail.module';
import { WebSocketModule } from './websocket/websocket.module';
import { AdminModule } from './admin/admin.module';
import { GoogleCalendarModule } from './google-calendar/google-calendar.module';
import { HttpExceptionFilter } from './common/filters';
import { LoggingInterceptor } from './common/interceptors';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    ScheduleModule.forRoot(),
    DatabaseModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    IssuesModule,
    SprintsModule,
    CommentsModule,
    NotificationsModule,
    AttachmentsModule,
    ActivityLogsModule,
    ActivitiesModule,
    ReportsModule,
    FeedbackModule,
    ChangelogsModule,
    AchievementsModule,
    MailModule,
    WebSocketModule,
    AdminModule,
    GoogleCalendarModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
