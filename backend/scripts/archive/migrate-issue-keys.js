const { MongoClient, ObjectId } = require('mongodb');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dbwork';

async function migrateIssueKeys() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const issuesCollection = db.collection('issues');
    const projectsCollection = db.collection('projects');

    // Find all issues with old ISSUE- format keys
    const oldIssues = await issuesCollection.find({
      key: { $regex: /^ISSUE-\d+$/ }
    }).toArray();

    console.log(`Found ${oldIssues.length} issues with old ISSUE- format`);

    if (oldIssues.length === 0) {
      console.log('No issues to migrate!');
      return;
    }

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Group issues by project
    const issuesByProject = {};
    for (const issue of oldIssues) {
      const projectId = issue.projectId.toString();
      if (!issuesByProject[projectId]) {
        issuesByProject[projectId] = [];
      }
      issuesByProject[projectId].push(issue);
    }

    console.log(`\nFound issues across ${Object.keys(issuesByProject).length} projects`);

    // Process each project
    for (const [projectId, projectIssues] of Object.entries(issuesByProject)) {
      console.log(`\n--- Processing project ${projectId} (${projectIssues.length} issues) ---`);

      // Get project details
      const project = await projectsCollection.findOne({ _id: new ObjectId(projectId) });

      if (!project) {
        console.log(`  ⚠️  Project not found: ${projectId}`);
        errorCount += projectIssues.length;
        continue;
      }

      const projectKey = project.key || 'PROJ';
      console.log(`  Project: ${project.name} (${projectKey})`);

      // Get existing issues with this project's key format to find max number
      const existingProjectIssues = await issuesCollection.find({
        key: { $regex: new RegExp(`^${projectKey}-\\d+$`) }
      }).toArray();

      let maxNumber = 0;
      existingProjectIssues.forEach(issue => {
        const match = issue.key.match(/-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNumber) maxNumber = num;
        }
      });

      console.log(`  Starting from number: ${maxNumber + 1}`);

      // Sort issues by their old number to maintain order
      projectIssues.sort((a, b) => {
        const aNum = parseInt(a.key.match(/ISSUE-(\d+)$/)[1], 10);
        const bNum = parseInt(b.key.match(/ISSUE-(\d+)$/)[1], 10);
        return aNum - bNum;
      });

      // Update each issue
      for (const issue of projectIssues) {
        const oldKey = issue.key;
        maxNumber++;
        const newKey = `${projectKey}-${maxNumber}`;

        try {
          const result = await issuesCollection.updateOne(
            { _id: issue._id },
            { $set: { key: newKey } }
          );

          if (result.modifiedCount > 0) {
            updatedCount++;
            console.log(`  ✓ ${oldKey} -> ${newKey}`);
          } else {
            skippedCount++;
            console.log(`  - Skipped: ${oldKey}`);
          }
        } catch (error) {
          errorCount++;
          console.error(`  ✗ Error updating ${oldKey}: ${error.message}`);
        }
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total issues found: ${oldIssues.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);

    // Now run the notification message fixer
    console.log('\n\n=== Now updating notification messages ===\n');
    await fixNotificationMessages(db);

  } catch (error) {
    console.error('Error migrating issue keys:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

async function fixNotificationMessages(db) {
  const notificationsCollection = db.collection('notifications');
  const issuesCollection = db.collection('issues');

  // Find all notifications with messages containing "ISSUE-"
  const notifications = await notificationsCollection.find({
    message: { $regex: /ISSUE-\d+/ }
  }).toArray();

  console.log(`Found ${notifications.length} notifications with ISSUE- format in messages`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const notification of notifications) {
    const issueKeyMatch = notification.message.match(/ISSUE-(\d+)/);

    if (!issueKeyMatch) {
      skippedCount++;
      continue;
    }

    const oldIssueKey = issueKeyMatch[0];
    let issueId = notification.metadata?.issueId;
    let issue = null;

    if (issueId) {
      issue = await issuesCollection.findOne({ _id: new ObjectId(issueId) });
    } else {
      issue = await issuesCollection.findOne({ key: oldIssueKey });
    }

    if (!issue) {
      skippedCount++;
      continue;
    }

    const newIssueKey = issue.key;

    if (oldIssueKey !== newIssueKey) {
      const updatedMessage = notification.message.replace(new RegExp(oldIssueKey, 'g'), newIssueKey);
      let updatedTitle = notification.title;

      if (notification.title && notification.title.includes(oldIssueKey)) {
        updatedTitle = notification.title.replace(new RegExp(oldIssueKey, 'g'), newIssueKey);
      }

      const updatedMetadata = { ...notification.metadata };
      if (updatedMetadata.issueKey) {
        updatedMetadata.issueKey = newIssueKey;
      }

      const result = await notificationsCollection.updateOne(
        { _id: notification._id },
        {
          $set: {
            message: updatedMessage,
            title: updatedTitle,
            metadata: updatedMetadata
          }
        }
      );

      if (result.modifiedCount > 0) {
        updatedCount++;
        console.log(`  ✓ ${oldIssueKey} -> ${newIssueKey} in notification message`);
      }
    } else {
      skippedCount++;
    }
  }

  console.log('\n=== Notification Update Summary ===');
  console.log(`Total notifications: ${notifications.length}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped: ${skippedCount}`);
}

// Run the migration
migrateIssueKeys();
