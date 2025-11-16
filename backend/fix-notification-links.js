const { MongoClient } = require('mongodb');

// MongoDB connection string - update this with your connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dbwork';

async function fixNotificationLinks() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const notificationsCollection = db.collection('notifications');
    const issuesCollection = db.collection('issues');

    // Find all notifications with links containing /issues/ISSUE-
    const notifications = await notificationsCollection.find({
      link: { $regex: /^\/issues\/ISSUE-/ }
    }).toArray();

    console.log(`Found ${notifications.length} notifications with old link format`);

    let updatedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    for (const notification of notifications) {
      // First try to get issueId from metadata
      let issueId = notification.metadata?.issueId;

      // If not in metadata, extract issueKey from the link and look up the issue
      if (!issueId) {
        const issueKeyMatch = notification.link.match(/\/issues\/(ISSUE-\d+)/);
        if (issueKeyMatch) {
          const issueKey = issueKeyMatch[1];

          // Look up the issue by key to get its _id
          const issue = await issuesCollection.findOne({ key: issueKey });

          if (issue) {
            issueId = issue._id.toString();
            console.log(`Found issue ${issueKey} with _id: ${issueId}`);
          } else {
            notFoundCount++;
            console.log(`Issue not found for key: ${issueKey}`);
            continue;
          }
        } else {
          skippedCount++;
          console.log(`Could not extract issue key from link: ${notification.link}`);
          continue;
        }
      }

      if (issueId) {
        // Update the link to use issueId instead of issueKey
        const result = await notificationsCollection.updateOne(
          { _id: notification._id },
          { $set: { link: `/issues/${issueId}` } }
        );

        if (result.modifiedCount > 0) {
          updatedCount++;
          console.log(`Updated notification ${notification._id}: ${notification.link} -> /issues/${issueId}`);
        }
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total notifications found: ${notifications.length}`);
    console.log(`Successfully updated: ${updatedCount}`);
    console.log(`Issue not found: ${notFoundCount}`);
    console.log(`Skipped (other reasons): ${skippedCount}`);

  } catch (error) {
    console.error('Error fixing notification links:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the migration
fixNotificationLinks();
