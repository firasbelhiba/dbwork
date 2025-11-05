const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';

async function migrateIssueStatuses() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const issuesCollection = db.collection('issues');
    const projectsCollection = db.collection('projects');

    // Find all issues with enum statuses (todo, in_progress, etc.)
    const enumStatuses = ['todo', 'in_progress', 'in_review', 'testing', 'done'];
    const issuesWithEnumStatus = await issuesCollection.find({
      status: { $in: enumStatuses }
    }).toArray();

    console.log(`📋 Found ${issuesWithEnumStatus.length} issues with enum statuses\n`);

    if (issuesWithEnumStatus.length === 0) {
      console.log('✅ No issues to migrate!');
      return;
    }

    // Group issues by project
    const issuesByProject = {};
    issuesWithEnumStatus.forEach(issue => {
      const projectId = issue.projectId.toString();
      if (!issuesByProject[projectId]) {
        issuesByProject[projectId] = [];
      }
      issuesByProject[projectId].push(issue);
    });

    let totalUpdated = 0;

    // Process each project
    for (const [projectId, issues] of Object.entries(issuesByProject)) {
      console.log(`\n📦 Processing project ${projectId}...`);
      console.log(`   Issues to migrate: ${issues.length}`);

      // Get project's custom statuses
      const project = await projectsCollection.findOne({
        _id: new mongoose.Types.ObjectId(projectId)
      });

      if (!project || !project.customStatuses || project.customStatuses.length === 0) {
        console.log('   ⚠️  No custom statuses found, skipping');
        continue;
      }

      // Sort custom statuses by order
      const sortedStatuses = [...project.customStatuses].sort((a, b) => a.order - b.order);

      // Create mapping from enum status to custom status
      const statusMapping = {
        'todo': sortedStatuses[0]?.id, // First column (usually To Do)
        'in_progress': sortedStatuses[1]?.id || sortedStatuses[0]?.id, // Second column or first
        'in_review': sortedStatuses[2]?.id || sortedStatuses[1]?.id || sortedStatuses[0]?.id,
        'testing': sortedStatuses[3]?.id || sortedStatuses[2]?.id || sortedStatuses[0]?.id,
        'done': sortedStatuses[sortedStatuses.length - 1]?.id, // Last column (usually Done)
      };

      console.log('   Status mapping:', statusMapping);

      // Update each issue
      for (const issue of issues) {
        const newStatus = statusMapping[issue.status];
        if (newStatus) {
          await issuesCollection.updateOne(
            { _id: issue._id },
            { $set: { status: newStatus } }
          );
          totalUpdated++;
        }
      }

      console.log(`   ✅ Updated ${issues.length} issues`);
    }

    console.log(`\n${'═'.repeat(60)}`);
    console.log(`✅ Migration completed!`);
    console.log(`📊 Total issues updated: ${totalUpdated}`);
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed.');
  }
}

migrateIssueStatuses();
