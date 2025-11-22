const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dbwork';

const defaultNotificationPreferences = {
  // Issue notifications
  issue_assigned: true,
  issue_updated: true,
  issue_commented: true,
  issue_status_changed: true,
  issue_priority_changed: true,
  issue_due_date_changed: true,
  // Comment notifications
  comment_on_issue: true,
  comment_mention: true,
  comment_reply: true,
  // General mentions
  mention: true,
  // Sprint notifications
  sprint_started: true,
  sprint_completed: true,
  sprint_issue_added: true,
  sprint_starting_soon: true,
  sprint_ending_soon: true,
  // Project notifications
  project_invitation: true,
  project_member_added: true,
  project_member_removed: true,
  project_role_changed: true,
  project_archived: true,
  project_deleted: true,
  // Feedback notifications
  feedback_upvoted: true,
  feedback_status_changed: true,
  feedback_commented: true,
  // Changelog notifications
  new_changelog: true,
};

async function migrateNotificationPreferences() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const db = client.db();
    const usersCollection = db.collection('users');

    // Find all users without notificationPreferences
    const usersWithoutPrefs = await usersCollection.find({
      'preferences.notificationPreferences': { $exists: false }
    }).toArray();

    console.log(`Found ${usersWithoutPrefs.length} users without notification preferences\n`);

    if (usersWithoutPrefs.length === 0) {
      console.log('✅ All users already have notification preferences');
      return;
    }

    let updated = 0;
    let errors = 0;

    for (const user of usersWithoutPrefs) {
      try {
        const currentPreferences = user.preferences || {
          theme: 'system',
          emailNotifications: {
            issueAssigned: true,
            issueUpdated: true,
            issueCommented: true,
            mentions: true,
            sprintUpdates: true,
          },
          language: 'en',
        };

        const result = await usersCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              'preferences.notificationPreferences': defaultNotificationPreferences
            }
          }
        );

        if (result.modifiedCount === 1) {
          console.log(`✅ Updated user: ${user.email}`);
          updated++;
        }
      } catch (error) {
        console.error(`❌ Error updating user ${user.email}:`, error.message);
        errors++;
      }
    }

    console.log(`\n=== Migration Complete ===`);
    console.log(`Updated: ${updated} users`);
    console.log(`Errors: ${errors}`);

    // Verify
    const remaining = await usersCollection.countDocuments({
      'preferences.notificationPreferences': { $exists: false }
    });

    console.log(`\nRemaining users without notification preferences: ${remaining}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

migrateNotificationPreferences();
