const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';

// Project ID for 4Hacks
const PROJECT_ID = '69034d749fda89142fb7cc2b';

// Admin user ID (the reporter for all issues)
const ADMIN_USER_ID = process.env.ADMIN_USER_ID || '68f979aa2ae284487d1dacca'; // Admin: admin@darblockchain.com

// Sprint Status Enum
const SprintStatus = {
  PLANNED: 'planned',
  ACTIVE: 'active',
  COMPLETED: 'completed',
};

// Issue Type Enum
const IssueType = {
  BUG: 'bug',
  TASK: 'task',
  STORY: 'story',
  EPIC: 'epic',
};

// Issue Priority Enum
const IssuePriority = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

// Issue Status Enum
const IssueStatus = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  TESTING: 'testing',
  DONE: 'done',
};

// Define Sprint Schema
const sprintSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  name: { type: String, required: true },
  goal: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: Object.values(SprintStatus), default: SprintStatus.PLANNED },
  issues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],
  completedPoints: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  completedAt: { type: Date },
}, { timestamps: true });

// Define Issue Schema
const issueSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  key: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: Object.values(IssueType), default: IssueType.TASK },
  priority: { type: String, enum: Object.values(IssuePriority), default: IssuePriority.MEDIUM },
  status: { type: String, enum: Object.values(IssueStatus), default: IssueStatus.TODO },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  labels: [{ type: String }],
  customFields: { type: Object, default: {} },
  timeTracking: {
    estimatedHours: { type: Number, default: null },
    loggedHours: { type: Number, default: 0 },
    timeLogs: { type: Array, default: [] }
  },
  attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attachment' }],
  sprintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint', default: null },
  dueDate: { type: Date, default: null },
  storyPoints: { type: Number, default: 0 },
  watchers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],
  blocks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],
  parentIssue: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', default: null },
  order: { type: Number, default: 0 },
}, { timestamps: true });

const Sprint = mongoose.model('Sprint', sprintSchema);
const Issue = mongoose.model('Issue', issueSchema);

async function getNextIssueKey(projectKey) {
  const lastIssue = await Issue.findOne({ key: new RegExp(`^${projectKey}-`) })
    .sort({ key: -1 })
    .limit(1);

  if (!lastIssue) {
    return `${projectKey}-1`;
  }

  const lastNumber = parseInt(lastIssue.key.split('-')[1]);
  return `${projectKey}-${lastNumber + 1}`;
}

async function importData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Read the JSON file
    console.log('📖 Reading 4hacks-tickets.json...');
    const jsonData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '4hacks-tickets.json'), 'utf-8')
    );

    const { projectName, projectKey, sprints: sprintsData, tickets } = jsonData;
    console.log(`📋 Project: ${projectName} (${projectKey})`);
    console.log(`📅 Sprints to create: ${sprintsData.length}`);
    console.log(`🎫 Tickets to create: ${tickets.length}\n`);

    // Step 1: Create all sprints
    console.log('🚀 Step 1: Creating sprints...');
    const sprintMap = new Map(); // Map sprint name to sprint ID

    for (const sprintData of sprintsData) {
      const sprint = new Sprint({
        projectId: new mongoose.Types.ObjectId(PROJECT_ID),
        name: sprintData.name,
        goal: sprintData.goal,
        startDate: new Date(sprintData.startDate),
        endDate: new Date(sprintData.endDate),
        status: sprintData.status,
      });

      await sprint.save();
      sprintMap.set(sprintData.name, sprint._id);
      console.log(`  ✅ Created: ${sprintData.name} (ID: ${sprint._id})`);
    }
    console.log(`✅ All ${sprintsData.length} sprints created!\n`);

    // Step 2: Create all issues
    console.log('🚀 Step 2: Creating issues...');
    let issueCounter = 1;
    const createdIssues = [];

    for (const ticket of tickets) {
      // Get the sprint ID from the map
      const sprintId = sprintMap.get(ticket.sprint);

      if (!sprintId) {
        console.warn(`⚠️  Warning: Sprint not found for ticket "${ticket.title}". Sprint: ${ticket.sprint}`);
      }

      // Generate the issue key
      const issueKey = `${projectKey}-${issueCounter}`;

      // Create the issue
      const issue = new Issue({
        projectId: new mongoose.Types.ObjectId(PROJECT_ID),
        key: issueKey,
        title: ticket.title,
        description: ticket.description,
        type: ticket.type,
        priority: ticket.priority,
        status: ticket.status,
        reporter: new mongoose.Types.ObjectId(ADMIN_USER_ID),
        labels: ticket.labels || [],
        timeTracking: {
          estimatedHours: ticket.estimatedHours || null,
          loggedHours: 0,
          timeLogs: []
        },
        sprintId: sprintId || null,
        storyPoints: ticket.storyPoints || 0,
      });

      await issue.save();
      createdIssues.push(issue);

      // Update the sprint's totalPoints
      if (sprintId) {
        await Sprint.findByIdAndUpdate(sprintId, {
          $inc: { totalPoints: ticket.storyPoints || 0 },
          $push: { issues: issue._id }
        });
      }

      issueCounter++;

      // Log progress every 10 issues
      if (issueCounter % 10 === 0) {
        console.log(`  📝 Created ${issueCounter - 1} issues...`);
      }
    }

    console.log(`✅ All ${createdIssues.length} issues created!\n`);

    // Step 3: Display summary
    console.log('📊 IMPORT SUMMARY:');
    console.log('═'.repeat(50));
    console.log(`Project: ${projectName}`);
    console.log(`Project Key: ${projectKey}`);
    console.log(`Project ID: ${PROJECT_ID}`);
    console.log(`\nSprints created: ${sprintMap.size}`);
    console.log(`Issues created: ${createdIssues.length}`);

    console.log('\n📅 Sprint Breakdown:');
    for (const [sprintName, sprintId] of sprintMap) {
      const sprint = await Sprint.findById(sprintId);
      const issueCount = tickets.filter(t => t.sprint === sprintName).length;
      console.log(`  • ${sprintName}: ${issueCount} issues (${sprint.totalPoints} story points)`);
    }

    console.log('\n🎫 Issue Breakdown by Type:');
    const typeCounts = {};
    createdIssues.forEach(issue => {
      typeCounts[issue.type] = (typeCounts[issue.type] || 0) + 1;
    });
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`  • ${type}: ${count} issues`);
    });

    console.log('\n🎯 Issue Breakdown by Priority:');
    const priorityCounts = {};
    createdIssues.forEach(issue => {
      priorityCounts[issue.priority] = (priorityCounts[issue.priority] || 0) + 1;
    });
    Object.entries(priorityCounts).forEach(([priority, count]) => {
      console.log(`  • ${priority}: ${count} issues`);
    });

    console.log('\n✅ Import completed successfully!');
    console.log('═'.repeat(50));

  } catch (error) {
    console.error('❌ Error during import:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed.');
  }
}

// Run the import
importData();
