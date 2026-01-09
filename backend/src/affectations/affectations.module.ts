import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AffectationsController } from './affectations.controller';
import { AffectationsService } from './affectations.service';
import { Affectation, AffectationSchema } from './schemas/affectation.schema';
import { IssuesModule } from '../issues/issues.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Affectation.name, schema: AffectationSchema },
    ]),
    forwardRef(() => IssuesModule),
  ],
  controllers: [AffectationsController],
  providers: [AffectationsService],
  exports: [AffectationsService, MongooseModule],
})
export class AffectationsModule {}
