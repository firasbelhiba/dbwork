import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AffectationsController } from './affectations.controller';
import { AffectationsService } from './affectations.service';
import { Affectation, AffectationSchema } from './schemas/affectation.schema';
import { Issue, IssueSchema } from '../issues/schemas/issue.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Affectation.name, schema: AffectationSchema },
      { name: Issue.name, schema: IssueSchema },
    ]),
  ],
  controllers: [AffectationsController],
  providers: [AffectationsService],
  exports: [AffectationsService, MongooseModule],
})
export class AffectationsModule {}
