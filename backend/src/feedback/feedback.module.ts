import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { Feedback, FeedbackSchema } from './schemas/feedback.schema';
import { FeedbackComment, FeedbackCommentSchema } from './schemas/feedback-comment.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { Issue, IssueSchema } from '../issues/schemas/issue.schema';
import { ActivitiesModule } from '../activities/activities.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { IssuesModule } from '../issues/issues.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Feedback.name, schema: FeedbackSchema },
      { name: FeedbackComment.name, schema: FeedbackCommentSchema },
      { name: User.name, schema: UserSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Issue.name, schema: IssueSchema },
    ]),
    ActivitiesModule,
    NotificationsModule,
    forwardRef(() => IssuesModule),
  ],
  controllers: [FeedbackController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
