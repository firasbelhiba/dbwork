import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { Issue, IssueSchema } from '../issues/schemas/issue.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Affectation, AffectationSchema } from '../affectations/schemas/affectation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Issue.name, schema: IssueSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: User.name, schema: UserSchema },
      { name: Affectation.name, schema: AffectationSchema },
    ]),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
