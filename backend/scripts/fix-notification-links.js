/**
 * Fix notification links that use issue keys instead of issue IDs
 * This script finds all notifications with /issues/{KEY} pattern and updates them to /issues/{ID}
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function fixNotificationLinks() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Find all notifications with links that look like /issues/{KEY} (contain alphanumeric + dash pattern like 4HKX-635)
    const notifications = await db.collection('notifications').find({
      link: { $regex: /^\/issues\/[A-Za-z0-9]+-\d+$/ }
    }).toArray();

    console.log(`Found ${notifications.length} notifications with issue key links\n`);

    if (notifications.length === 0) {
      console.log('No notifications to fix!');
      return;
    }

    // Get all unique issue keys from the notifications
    const issueKeys = [...new Set(notifications.map(n => {
      const match = n.link.match(/\/issues\/([A-Za-z0-9]+-\d+)$/);
      return match ? match[1] : null;
    }).filter(Boolean))];

    console.log(`Unique issue keys found: ${issueKeys.join(', ')}\n`);

    // Fetch all issues with these keys
    const issues = await db.collection('issues').find({
      key: { $in: issueKeys }
    }).toArray();

    // Create a map of key -> _id
    const keyToIdMap = {};
    issues.forEach(issue => {
      keyToIdMap[issue.key] = issue._id.toString();
    });

    console.log('Issue key to ID mapping:');
    Object.entries(keyToIdMap).forEach(([key, id]) => {
      console.log(`  ${key} -> ${id}`);
    });
    console.log('');

    // Update each notification
    let updated = 0;
    let skipped = 0;

    for (const notification of notifications) {
      const match = notification.link.match(/\/issues\/([A-Za-z0-9]+-\d+)$/);
      if (!match) continue;

      const issueKey = match[1];
      const issueId = keyToIdMap[issueKey];

      if (!issueId) {
        console.log(`⚠️  Skipping notification ${notification._id}: Issue ${issueKey} not found in database`);
        skipped++;
        continue;
      }

      const newLink = `/issues/${issueId}`;

      await db.collection('notifications').updateOne(
        { _id: notification._id },
        {
          $set: {
            link: newLink,
            // Also update metadata if it exists
            'metadata.issueId': issueId
          }
        }
      );

      console.log(`✅ Updated notification ${notification._id}: ${notification.link} -> ${newLink}`);
      updated++;
    }

    console.log(`\n========================================`);
    console.log(`Summary:`);
    console.log(`  Total notifications found: ${notifications.length}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped (issue not found): ${skipped}`);
    console.log(`========================================`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

fixNotificationLinks();
