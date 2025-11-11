import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { IssuesService } from './issues.service';
import { IssuesController } from './issues.controller';
import { Issue, IssueSchema } from './schemas/issue.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { UsersModule } from '../users/users.module';
import { ActivitiesModule } from '../activities/activities.module';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Issue.name, schema: IssueSchema },
      { name: User.name, schema: UserSchema }, // Register User model in same module for populate
    ]),
    UsersModule,
    ActivitiesModule,
    forwardRef(() => ProjectsModule),
  ],
  controllers: [IssuesController],
  providers: [IssuesService],
  exports: [IssuesService],
})
export class IssuesModule {}
