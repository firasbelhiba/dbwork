/**
 * Check notification links in the database
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function checkNotificationLinks() {
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

    // Find all notifications with issue links
    const notifications = await db.collection('notifications').find({
      link: { $regex: /\/issues\// }
    }).limit(20).toArray();

    console.log(`Found ${notifications.length} notifications with issue links:\n`);

    notifications.forEach((n, i) => {
      console.log(`${i + 1}. ID: ${n._id}`);
      console.log(`   Title: ${n.title}`);
      console.log(`   Link: ${n.link}`);
      console.log(`   Created: ${n.createdAt}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkNotificationLinks();
