import { Model } from 'mongoose';
import { Sprint, SprintDocument } from '@sprints/schemas/sprint.schema';
import { ProjectDocument } from '@projects/schemas/project.schema';
import { SprintStatus } from '@common/enums';

export async function seedSprints(
  sprintModel: Model<SprintDocument>,
  projects: ProjectDocument[],
): Promise<SprintDocument[]> {
  console.log('Seeding sprints...');

  // Check if sprints already exist
  const existingSprints = await sprintModel.countDocuments();
  if (existingSprints > 0) {
    console.log('Sprints already seeded. Skipping...');
    return sprintModel.find().exec();
  }

  const dbpProject = projects.find((p) => p.key === 'DBP');
  const scsProject = projects.find((p) => p.key === 'SCS');

  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const sprints = [
    {
      projectId: dbpProject._id,
      name: 'Sprint 1 - Foundation',
      goal: 'Set up core infrastructure and authentication system',
      startDate: twoWeeksAgo,
      endDate: oneWeekAgo,
      status: SprintStatus.COMPLETED,
      issues: [],
      completedPoints: 34,
      totalPoints: 40,
      completedAt: oneWeekAgo,
    },
    {
      projectId: dbpProject._id,
      name: 'Sprint 2 - Core Features',
      goal: 'Implement project and issue management features',
      startDate: oneWeekAgo,
      endDate: oneWeekFromNow,
      status: SprintStatus.ACTIVE,
      issues: [],
      completedPoints: 0,
      totalPoints: 0,
    },
    {
      projectId: dbpProject._id,
      name: 'Sprint 3 - Advanced Features',
      goal: 'Add reporting, analytics, and real-time collaboration',
      startDate: oneWeekFromNow,
      endDate: twoWeeksFromNow,
      status: SprintStatus.PLANNED,
      issues: [],
      completedPoints: 0,
      totalPoints: 0,
    },
    {
      projectId: scsProject._id,
      name: 'Sprint 1 - Contract Templates',
      goal: 'Create basic smart contract templates and testing framework',
      startDate: oneWeekAgo,
      endDate: oneWeekFromNow,
      status: SprintStatus.ACTIVE,
      issues: [],
      completedPoints: 0,
      totalPoints: 0,
    },
  ];

  const createdSprints = await sprintModel.insertMany(sprints);
  console.log(`✓ Seeded ${createdSprints.length} sprints`);

  return createdSprints;
}
