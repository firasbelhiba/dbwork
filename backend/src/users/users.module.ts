import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './schemas/user.schema';
import { Issue, IssueSchema } from '@issues/schemas/issue.schema';
import { IssuesModule } from '@issues/issues.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Issue.name, schema: IssueSchema },
    ]),
    forwardRef(() => IssuesModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [
    UsersService,
    MongooseModule, // Export MongooseModule so other modules can access User model
  ],
})
export class UsersModule {}
