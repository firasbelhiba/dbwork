import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChangelogsController } from './changelogs.controller';
import { ChangelogsService } from './changelogs.service';
import { Changelog, ChangelogSchema } from './schemas/changelog.schema';
import { ActivitiesModule } from '../activities/activities.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Changelog.name, schema: ChangelogSchema },
      { name: User.name, schema: UserSchema },
    ]),
    ActivitiesModule,
    NotificationsModule,
  ],
  controllers: [ChangelogsController],
  providers: [ChangelogsService],
  exports: [ChangelogsService],
})
export class ChangelogsModule {}
