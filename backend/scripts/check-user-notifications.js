// Script to check notifications for a specific user
const mongoose = require('mongoose');
require('dotenv').config();

async function checkUserNotifications() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Find Firas user
    const user = await db.collection('users').findOne({
      $or: [
        { firstName: /firas/i },
        { lastName: /belhiba/i },
        { email: /firas/i }
      ]
    });

    if (!user) {
      console.log('User Firas not found');
      return;
    }

    console.log(`\n=== User: ${user.firstName} ${user.lastName} (${user._id}) ===`);

    // Get notifications for this user
    const notifications = await db.collection('notifications')
      .find({ userId: user._id.toString() })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    console.log(`\nTotal notifications: ${notifications.length}`);

    // Group by type
    const byType = {};
    notifications.forEach(n => {
      byType[n.type] = (byType[n.type] || 0) + 1;
    });
    console.log('\nBy type:', byType);

    // Show mention notifications specifically
    const mentionNotifications = notifications.filter(n =>
      n.type === 'mention' || n.type === 'comment_mention'
    );
    console.log(`\n=== Mention notifications for ${user.firstName}: ${mentionNotifications.length} ===`);
    mentionNotifications.forEach(n => {
      console.log(`- ${n.createdAt}: ${n.title} - ${n.message?.substring(0, 60)}...`);
    });

    // Check if there are any notifications in the db with this user's ID stored differently
    console.log('\n=== Checking for notifications with ObjectId userId ===');
    const objectIdNotifications = await db.collection('notifications')
      .find({ userId: user._id })
      .limit(5)
      .toArray();
    console.log(`Found ${objectIdNotifications.length} notifications with ObjectId userId`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkUserNotifications();
