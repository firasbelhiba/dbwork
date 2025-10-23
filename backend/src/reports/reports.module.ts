import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Issue, IssueSchema } from '@issues/schemas/issue.schema';
import { Sprint, SprintSchema } from '@sprints/schemas/sprint.schema';
import { Project, ProjectSchema } from '@projects/schemas/project.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Issue.name, schema: IssueSchema },
      { name: Sprint.name, schema: SprintSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
