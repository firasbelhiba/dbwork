const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';
const PROJECT_ID = '69034d749fda89142fb7cc2b';
const ADMIN_USER_ID = '68f979aa2ae284487d1dacca';

// Sprints to import
const SPRINTS_TO_IMPORT = [
  'Sprint 3: Registration & Team Management',
  'Sprint 4: Project Submission & Showcase',
  'Sprint 5: Judging System',
  'Sprint 6: Communication & Community'
];

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

  const numbers = allIssues.map(issue => parseInt(issue.key.split('-')[1]));
  const maxNumber = Math.max(...numbers);

  return `${projectKey}-${maxNumber + 1}`;
}

async function importRemainingSprints() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Read the JSON file
    const jsonData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '4hacks-tickets.json'), 'utf-8')
    );

    const { projectKey } = jsonData;

    // Get starting issue number
    const startKey = await getNextIssueKey(projectKey);
    const startNumber = parseInt(startKey.split('-')[1]);
    let issueCounter = startNumber;

    console.log(`🚀 Starting import from ${startKey}...\n`);

    let totalCreated = 0;

    // Process each sprint
    for (const sprintName of SPRINTS_TO_IMPORT) {
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`📅 Processing: ${sprintName}`);
      console.log('═'.repeat(60));

      // Filter tickets for this sprint
      const sprintTickets = jsonData.tickets.filter(t => t.sprint === sprintName);

      if (sprintTickets.length === 0) {
        console.log('  ⚠️  No tickets found for this sprint');
        continue;
      }

      console.log(`  📋 Found ${sprintTickets.length} tickets to import`);

      // Get sprint from database
      const sprint = await Sprint.findById(sprintTickets[0].sprintId);

      if (!sprint) {
        console.error(`  ❌ Sprint not found in database!`);
        continue;
      }

      const createdIssues = [];

      for (const ticket of sprintTickets) {
        const issueKey = `${projectKey}-${issueCounter}`;

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

        // Log progress every 20 issues
        if (createdIssues.length % 20 === 0) {
          console.log(`    📝 Created ${createdIssues.length} issues...`);
        }
      }

      console.log(`  ✅ Created ${createdIssues.length} issues`);
      console.log(`  📊 Range: ${projectKey}-${issueCounter - createdIssues.length} to ${projectKey}-${issueCounter - 1}`);

      // Refresh sprint data
      const updatedSprint = await Sprint.findById(sprint._id);
      console.log(`  🎯 Total Story Points: ${updatedSprint.totalPoints}`);

      totalCreated += createdIssues.length;
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log('📊 IMPORT SUMMARY');
    console.log('═'.repeat(60));
    console.log(`Total issues created: ${totalCreated}`);
    console.log(`Issue range: ${startKey} to ${projectKey}-${issueCounter - 1}`);
    console.log('\n✅ All sprints imported successfully!');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('❌ Error during import:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed.');
  }
}

importRemainingSprints();
