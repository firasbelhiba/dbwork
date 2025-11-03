const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';

// Project ID for 4Hacks
const PROJECT_ID = '69034d749fda89142fb7cc2b';

// Admin user ID (the reporter for all issues)
const ADMIN_USER_ID = process.env.ADMIN_USER_ID || '68f979aa2ae284487d1dacca';

// Sprint 2 details
const SPRINT_2_NAME = 'Sprint 2: Hackathon Creation & Management';

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

const sprintSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  name: { type: String, required: true },
  goal: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String },
  issues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],
  completedPoints: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  completedAt: { type: Date },
}, { timestamps: true });

const Issue = mongoose.model('Issue', issueSchema);
const Sprint = mongoose.model('Sprint', sprintSchema);

async function getNextIssueKey(projectKey) {
  const allIssues = await Issue.find({ key: new RegExp(`^${projectKey}-`) });

  if (allIssues.length === 0) {
    return `${projectKey}-1`;
  }

  // Extract numbers and find max
  const numbers = allIssues.map(issue => parseInt(issue.key.split('-')[1]));
  const maxNumber = Math.max(...numbers);

  return `${projectKey}-${maxNumber + 1}`;
}

async function importSprint2Tickets() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Read the JSON file
    console.log('📖 Reading 4hacks-tickets.json...');
    const jsonData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '4hacks-tickets.json'), 'utf-8')
    );

    const { projectKey, tickets } = jsonData;

    // Filter Sprint 2 tickets
    const sprint2Tickets = tickets.filter(t => t.sprint === SPRINT_2_NAME);

    console.log(`📋 Found ${sprint2Tickets.length} Sprint 2 tickets to import\n`);

    // Get Sprint 2 from database
    const sprint2 = await Sprint.findById(sprint2Tickets[0].sprintId);

    if (!sprint2) {
      console.error('❌ Sprint 2 not found in database!');
      process.exit(1);
    }

    console.log(`📅 Sprint: ${sprint2.name}`);
    console.log(`   ID: ${sprint2._id}\n`);

    // Get starting issue number
    const startKey = await getNextIssueKey(projectKey);
    const startNumber = parseInt(startKey.split('-')[1]);

    console.log(`🚀 Starting import from ${startKey}...\n`);

    const createdIssues = [];
    let issueCounter = startNumber;

    for (const ticket of sprint2Tickets) {
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
        sprintId: new mongoose.Types.ObjectId(ticket.sprintId),
        storyPoints: ticket.storyPoints || 0,
      });

      await issue.save();
      createdIssues.push(issue);

      // Update the sprint's totalPoints
      await Sprint.findByIdAndUpdate(ticket.sprintId, {
        $inc: { totalPoints: ticket.storyPoints || 0 },
        $push: { issues: issue._id }
      });

      issueCounter++;

      // Log progress every 10 issues
      if (issueCounter % 10 === 0) {
        console.log(`  📝 Created ${issueCounter - startNumber} issues...`);
      }
    }

    console.log(`✅ All ${createdIssues.length} Sprint 2 issues created!\n`);

    // Display summary
    console.log('📊 IMPORT SUMMARY:');
    console.log('═'.repeat(50));
    console.log(`Sprint: ${sprint2.name}`);
    console.log(`Issues created: ${createdIssues.length}`);
    console.log(`Issue range: ${startKey} to ${projectKey}-${issueCounter - 1}`);

    // Refresh sprint data
    const updatedSprint = await Sprint.findById(sprint2._id);
    console.log(`Story points: ${updatedSprint.totalPoints}`);

    console.log('\n🎫 Issue Breakdown by Priority:');
    const priorityCounts = {};
    createdIssues.forEach(issue => {
      priorityCounts[issue.priority] = (priorityCounts[issue.priority] || 0) + 1;
    });
    Object.entries(priorityCounts).forEach(([priority, count]) => {
      console.log(`  • ${priority}: ${count} issues`);
    });

    console.log('\n✅ Sprint 2 import completed successfully!');
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
importSprint2Tickets();
