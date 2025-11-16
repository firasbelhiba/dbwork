const { MongoClient } = require('mongodb');

// MongoDB connection string - update this with your connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dbwork';

async function fixNotificationMessages() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const notificationsCollection = db.collection('notifications');
    const issuesCollection = db.collection('issues');

    // Find all notifications with messages containing "ISSUE-"
    const notifications = await notificationsCollection.find({
      message: { $regex: /ISSUE-\d+/ }
    }).toArray();

    console.log(`Found ${notifications.length} notifications with old ISSUE- format in messages`);

    let updatedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    for (const notification of notifications) {
      // Extract the old issue key from the message
      const issueKeyMatch = notification.message.match(/ISSUE-(\d+)/);

      if (!issueKeyMatch) {
        skippedCount++;
        console.log(`Could not extract issue key from message: ${notification.message}`);
        continue;
      }

      const oldIssueKey = issueKeyMatch[0]; // e.g., "ISSUE-563"

      // Try to get issueId from metadata first
      let issueId = notification.metadata?.issueId;
      let issue = null;

      // If we have issueId in metadata, look up the issue
      if (issueId) {
        issue = await issuesCollection.findOne({ _id: new require('mongodb').ObjectId(issueId) });
      } else {
        // Otherwise, try to find the issue by the old key
        issue = await issuesCollection.findOne({ key: oldIssueKey });
      }

      if (!issue) {
        notFoundCount++;
        console.log(`Issue not found for key: ${oldIssueKey}`);
        continue;
      }

      // Get the new issue key from the database
      const newIssueKey = issue.key;

      // Only update if the keys are different
      if (oldIssueKey !== newIssueKey) {
        // Replace all occurrences of the old key with the new key in the message
        const updatedMessage = notification.message.replace(new RegExp(oldIssueKey, 'g'), newIssueKey);

        // Also update the title if it contains the old key
        let updatedTitle = notification.title;
        if (notification.title && notification.title.includes(oldIssueKey)) {
          updatedTitle = notification.title.replace(new RegExp(oldIssueKey, 'g'), newIssueKey);
        }

        // Update the metadata to use the new key
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
          console.log(`Updated notification ${notification._id}:`);
          console.log(`  Old message: ${notification.message}`);
          console.log(`  New message: ${updatedMessage}`);
          console.log(`  Issue key: ${oldIssueKey} -> ${newIssueKey}`);
        }
      } else {
        skippedCount++;
        console.log(`Notification ${notification._id} already has correct key: ${newIssueKey}`);
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total notifications found: ${notifications.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Issue not found: ${notFoundCount}`);
    console.log(`Skipped (already correct or other reasons): ${skippedCount}`);

  } catch (error) {
    console.error('Error fixing notification messages:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the migration
fixNotificationMessages();
