// Script to check mention notifications in the database
const mongoose = require('mongoose');
require('dotenv').config();

async function checkMentionNotifications() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Get all notification types in the database
    const notificationTypes = await db.collection('notifications').distinct('type');
    console.log('\n=== All notification types in database ===');
    console.log(notificationTypes);

    // Count notifications by type
    console.log('\n=== Notification counts by type ===');
    for (const type of notificationTypes) {
      const count = await db.collection('notifications').countDocuments({ type });
      console.log(`${type}: ${count}`);
    }

    // Check for mention-related notifications
    console.log('\n=== Mention-related notifications ===');
    const mentionNotifications = await db.collection('notifications')
      .find({ type: { $in: ['mention', 'comment_mention', 'MENTION', 'COMMENT_MENTION'] } })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    console.log(`Found ${mentionNotifications.length} mention notifications`);
    mentionNotifications.forEach(n => {
      console.log(`- Type: ${n.type}, Title: ${n.title}, Message: ${n.message?.substring(0, 50)}...`);
    });

    // Check recent comments with mentions
    console.log('\n=== Recent comments with mentions ===');
    const commentsWithMentions = await db.collection('comments')
      .find({ mentions: { $exists: true, $ne: [] } })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    console.log(`Found ${commentsWithMentions.length} comments with mentions`);
    commentsWithMentions.forEach(c => {
      console.log(`- Mentions: ${JSON.stringify(c.mentions)}, Content: ${c.content?.substring(0, 50)}...`);
    });

    // Get sample user to check notification preferences
    console.log('\n=== Sample user notification preferences ===');
    const sampleUser = await db.collection('users').findOne({}, { projection: { firstName: 1, lastName: 1, preferences: 1 } });
    if (sampleUser) {
      console.log(`User: ${sampleUser.firstName} ${sampleUser.lastName}`);
      console.log('Notification Preferences:', JSON.stringify(sampleUser.preferences?.notificationPreferences, null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkMentionNotifications();
