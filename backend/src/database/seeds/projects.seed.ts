import { Model } from 'mongoose';
import { Project, ProjectDocument } from '@projects/schemas/project.schema';
import { UserDocument } from '@users/schemas/user.schema';

export async function seedProjects(
  projectModel: Model<ProjectDocument>,
  users: UserDocument[],
): Promise<ProjectDocument[]> {
  console.log('Seeding projects...');

  // Check if projects already exist
  const existingProjects = await projectModel.countDocuments();
  if (existingProjects > 0) {
    console.log('Projects already seeded. Skipping...');
    return projectModel.find().exec();
  }

  const admin = users.find((u) => u.email === 'admin@darblockchain.com');
  const pm = users.find((u) => u.email === 'pm@darblockchain.com');
  const john = users.find((u) => u.email === 'john.dev@darblockchain.com');
  const sarah = users.find((u) => u.email === 'sarah.dev@darblockchain.com');

  const projects = [
    {
      name: 'Dar Blockchain Platform',
      key: 'DBP',
      description: 'Core blockchain platform development for Dar Blockchain Company. Building scalable, secure, and decentralized infrastructure.',
      lead: pm._id,
      members: [
        { userId: pm._id, role: 'Project Manager', joinedAt: new Date() },
        { userId: john._id, role: 'Senior Developer', joinedAt: new Date() },
        { userId: sarah._id, role: 'Developer', joinedAt: new Date() },
      ],
      settings: {
        defaultAssignee: john._id,
        allowAnonymousAccess: false,
      },
      isArchived: false,
    },
    {
      name: 'Smart Contracts Suite',
      key: 'SCS',
      description: 'Development of standardized smart contracts suite for enterprise use cases. Focus on security, efficiency, and interoperability.',
      lead: admin._id,
      members: [
        { userId: admin._id, role: 'Tech Lead', joinedAt: new Date() },
        { userId: john._id, role: 'Blockchain Developer', joinedAt: new Date() },
      ],
      settings: {
        defaultAssignee: john._id,
        allowAnonymousAccess: false,
      },
      isArchived: false,
    },
  ];

  const createdProjects = await projectModel.insertMany(projects);
  console.log(`✓ Seeded ${createdProjects.length} projects`);

  return createdProjects;
}
