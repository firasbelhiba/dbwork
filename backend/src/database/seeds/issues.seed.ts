import { Model } from 'mongoose';
import { Issue, IssueDocument } from '@issues/schemas/issue.schema';
import { ProjectDocument } from '@projects/schemas/project.schema';
import { SprintDocument } from '@sprints/schemas/sprint.schema';
import { UserDocument } from '@users/schemas/user.schema';
import { IssueType, IssuePriority, IssueStatus } from '@common/enums';

export async function seedIssues(
  issueModel: Model<IssueDocument>,
  projects: ProjectDocument[],
  sprints: SprintDocument[],
  users: UserDocument[],
): Promise<IssueDocument[]> {
  console.log('Seeding issues...');

  // Check if issues already exist
  const existingIssues = await issueModel.countDocuments();
  if (existingIssues > 0) {
    console.log('Issues already seeded. Skipping...');
    return issueModel.find().exec();
  }

  const dbpProject = projects.find((p) => p.key === 'DBP');
  const scsProject = projects.find((p) => p.key === 'SCS');

  const sprint1 = sprints.find((s) => s.name === 'Sprint 1 - Foundation');
  const sprint2 = sprints.find((s) => s.name === 'Sprint 2 - Core Features');

  const pm = users.find((u) => u.email === 'pm@darblockchain.com');
  const john = users.find((u) => u.email === 'john.dev@darblockchain.com');
  const sarah = users.find((u) => u.email === 'sarah.dev@darblockchain.com');

  const issues = [
    // DBP Project - Sprint 1 (Completed)
    {
      projectId: dbpProject._id,
      sprintId: sprint1._id,
      title: 'Set up NestJS backend with MongoDB',
      description: 'Initialize NestJS project with MongoDB integration, configure environment variables, and set up basic project structure.',
      type: IssueType.TASK,
      status: IssueStatus.DONE,
      priority: IssuePriority.HIGH,
      reporter: pm._id,
      assignee: john._id,
      storyPoints: 8,
      watchers: [pm._id, john._id],
      labels: ['backend', 'setup', 'infrastructure'],
      timeTracking: {
        estimatedHours: 16,
        loggedHours: 14,
        remainingHours: 0,
      },
    },
    {
      projectId: dbpProject._id,
      sprintId: sprint1._id,
      title: 'Implement JWT authentication',
      description: 'Create authentication module with JWT token generation, refresh tokens, and role-based access control.',
      type: IssueType.STORY,
      status: IssueStatus.DONE,
      priority: IssuePriority.CRITICAL,
      reporter: pm._id,
      assignee: john._id,
      storyPoints: 13,
      watchers: [pm._id, john._id],
      labels: ['backend', 'authentication', 'security'],
      timeTracking: {
        estimatedHours: 24,
        loggedHours: 26,
        remainingHours: 0,
      },
    },
    {
      projectId: dbpProject._id,
      sprintId: sprint1._id,
      title: 'Create user management module',
      description: 'Implement CRUD operations for users, profile updates, avatar upload, and user search functionality.',
      type: IssueType.STORY,
      status: IssueStatus.DONE,
      priority: IssuePriority.HIGH,
      reporter: pm._id,
      assignee: sarah._id,
      storyPoints: 13,
      watchers: [pm._id, sarah._id],
      labels: ['backend', 'users', 'crud'],
      timeTracking: {
        estimatedHours: 20,
        loggedHours: 22,
        remainingHours: 0,
      },
    },

    // DBP Project - Sprint 2 (Active)
    {
      projectId: dbpProject._id,
      sprintId: sprint2._id,
      title: 'Implement project management features',
      description: 'Create project CRUD operations, team member management, project archiving, and statistics endpoints.',
      type: IssueType.STORY,
      status: IssueStatus.IN_PROGRESS,
      priority: IssuePriority.HIGH,
      reporter: pm._id,
      assignee: john._id,
      storyPoints: 13,
      watchers: [pm._id, john._id],
      labels: ['backend', 'projects', 'core'],
      timeTracking: {
        estimatedHours: 24,
        loggedHours: 12,
        remainingHours: 12,
      },
    },
    {
      projectId: dbpProject._id,
      sprintId: sprint2._id,
      title: 'Build issue tracking system',
      description: 'Implement comprehensive issue management with filtering, search, time tracking, watchers, and blockers functionality.',
      type: IssueType.EPIC,
      status: IssueStatus.IN_PROGRESS,
      priority: IssuePriority.CRITICAL,
      reporter: pm._id,
      assignee: john._id,
      storyPoints: 21,
      watchers: [pm._id, john._id, sarah._id],
      labels: ['backend', 'issues', 'core', 'epic'],
      timeTracking: {
        estimatedHours: 40,
        loggedHours: 18,
        remainingHours: 22,
      },
    },
    {
      projectId: dbpProject._id,
      sprintId: sprint2._id,
      title: 'Create sprint management module',
      description: 'Implement sprint lifecycle management, velocity tracking, and burndown chart data generation.',
      type: IssueType.STORY,
      status: IssueStatus.TODO,
      priority: IssuePriority.HIGH,
      reporter: pm._id,
      assignee: sarah._id,
      storyPoints: 13,
      watchers: [pm._id, sarah._id],
      labels: ['backend', 'sprints', 'agile'],
      timeTracking: {
        estimatedHours: 24,
        loggedHours: 0,
        remainingHours: 24,
      },
    },
    {
      projectId: dbpProject._id,
      sprintId: sprint2._id,
      title: 'Add commenting system with reactions',
      description: 'Implement issue commenting with threading support, emoji reactions, and edit tracking.',
      type: IssueType.TASK,
      status: IssueStatus.TODO,
      priority: IssuePriority.MEDIUM,
      reporter: pm._id,
      assignee: sarah._id,
      storyPoints: 8,
      watchers: [pm._id, sarah._id],
      labels: ['backend', 'comments', 'social'],
      timeTracking: {
        estimatedHours: 16,
        loggedHours: 0,
        remainingHours: 16,
      },
    },
    {
      projectId: dbpProject._id,
      sprintId: sprint2._id,
      title: 'Implement file attachment system',
      description: 'Create file upload functionality with Multer, support multiple file types, and implement download endpoints.',
      type: IssueType.TASK,
      status: IssueStatus.TODO,
      priority: IssuePriority.MEDIUM,
      reporter: pm._id,
      storyPoints: 5,
      watchers: [pm._id],
      labels: ['backend', 'attachments', 'files'],
      timeTracking: {
        estimatedHours: 12,
        loggedHours: 0,
        remainingHours: 12,
      },
    },

    // DBP Project - Backlog
    {
      projectId: dbpProject._id,
      title: 'Design and implement Kanban board UI',
      description: 'Create drag-and-drop Kanban board with @dnd-kit, swimlanes, and real-time updates via WebSocket.',
      type: IssueType.STORY,
      status: IssueStatus.TODO,
      priority: IssuePriority.HIGH,
      reporter: pm._id,
      storyPoints: 21,
      watchers: [pm._id],
      labels: ['frontend', 'kanban', 'dnd', 'realtime'],
      timeTracking: {
        estimatedHours: 32,
        loggedHours: 0,
        remainingHours: 32,
      },
    },
    {
      projectId: dbpProject._id,
      title: 'Build reporting and analytics dashboard',
      description: 'Create comprehensive dashboard with charts using Recharts - project progress, team performance, burndown, velocity trends.',
      type: IssueType.STORY,
      status: IssueStatus.TODO,
      priority: IssuePriority.MEDIUM,
      reporter: pm._id,
      storyPoints: 13,
      watchers: [pm._id],
      labels: ['frontend', 'reports', 'charts', 'analytics'],
      timeTracking: {
        estimatedHours: 24,
        loggedHours: 0,
        remainingHours: 24,
      },
    },
    {
      projectId: dbpProject._id,
      title: 'Implement real-time notifications',
      description: 'Create notification center with WebSocket integration, toast notifications, and email notifications via NodeMailer.',
      type: IssueType.STORY,
      status: IssueStatus.TODO,
      priority: IssuePriority.MEDIUM,
      reporter: pm._id,
      storyPoints: 8,
      watchers: [pm._id],
      labels: ['backend', 'frontend', 'notifications', 'realtime'],
      timeTracking: {
        estimatedHours: 16,
        loggedHours: 0,
        remainingHours: 16,
      },
    },
    {
      projectId: dbpProject._id,
      title: 'Fix password reset email template',
      description: 'The password reset email is not rendering correctly in Outlook. Need to fix HTML/CSS for better email client compatibility.',
      type: IssueType.BUG,
      status: IssueStatus.TODO,
      priority: IssuePriority.LOW,
      reporter: sarah._id,
      storyPoints: 2,
      watchers: [sarah._id],
      labels: ['backend', 'email', 'bug'],
      timeTracking: {
        estimatedHours: 4,
        loggedHours: 0,
        remainingHours: 4,
      },
    },

    // SCS Project
    {
      projectId: scsProject._id,
      sprintId: sprints.find((s) => s.name === 'Sprint 1 - Contract Templates')._id,
      title: 'Create ERC-20 token contract template',
      description: 'Develop standardized ERC-20 token contract with minting, burning, and pausable functionality.',
      type: IssueType.STORY,
      status: IssueStatus.IN_PROGRESS,
      priority: IssuePriority.HIGH,
      reporter: users.find((u) => u.email === 'admin@darblockchain.com')._id,
      assignee: john._id,
      storyPoints: 13,
      watchers: [john._id],
      labels: ['smart-contracts', 'erc20', 'solidity'],
      timeTracking: {
        estimatedHours: 20,
        loggedHours: 10,
        remainingHours: 10,
      },
    },
    {
      projectId: scsProject._id,
      sprintId: sprints.find((s) => s.name === 'Sprint 1 - Contract Templates')._id,
      title: 'Set up Hardhat testing environment',
      description: 'Configure Hardhat with TypeScript, set up test helpers, and create initial test suite structure.',
      type: IssueType.TASK,
      status: IssueStatus.DONE,
      priority: IssuePriority.HIGH,
      reporter: users.find((u) => u.email === 'admin@darblockchain.com')._id,
      assignee: john._id,
      storyPoints: 5,
      watchers: [john._id],
      labels: ['smart-contracts', 'testing', 'hardhat'],
      timeTracking: {
        estimatedHours: 8,
        loggedHours: 8,
        remainingHours: 0,
      },
    },
    {
      projectId: scsProject._id,
      title: 'Develop NFT marketplace contract',
      description: 'Create NFT marketplace contract with listing, buying, and royalty distribution features.',
      type: IssueType.EPIC,
      status: IssueStatus.TODO,
      priority: IssuePriority.MEDIUM,
      reporter: users.find((u) => u.email === 'admin@darblockchain.com')._id,
      storyPoints: 34,
      watchers: [],
      labels: ['smart-contracts', 'nft', 'marketplace', 'epic'],
      timeTracking: {
        estimatedHours: 60,
        loggedHours: 0,
        remainingHours: 60,
      },
    },
  ];

  const createdIssues = await issueModel.insertMany(issues);
  console.log(`✓ Seeded ${createdIssues.length} issues`);

  // Update sprint issues arrays
  const sprint1Issues = createdIssues
    .filter((i) => i.sprintId?.toString() === sprint1._id.toString())
    .map((i) => i._id);

  const sprint2Issues = createdIssues
    .filter((i) => i.sprintId?.toString() === sprint2._id.toString())
    .map((i) => i._id);

  if (sprint1Issues.length > 0) {
    await sprints[0].updateOne({ issues: sprint1Issues });
  }

  if (sprint2Issues.length > 0) {
    await sprints[1].updateOne({ issues: sprint2Issues });
  }

  return createdIssues;
}
