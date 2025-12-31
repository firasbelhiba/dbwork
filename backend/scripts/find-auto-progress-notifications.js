/**
 * Find "Next ticket started automatically" notifications
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function findAutoProgressNotifications() {
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

    // Find "Next ticket started" notifications
    const notifications = await db.collection('notifications').find({
      title: 'Next ticket started automatically'
    }).toArray();

    console.log(`Found ${notifications.length} "Next ticket started automatically" notifications:\n`);

    notifications.forEach((n, i) => {
      console.log(`${i + 1}. ID: ${n._id}`);
      console.log(`   Title: ${n.title}`);
      console.log(`   Message: ${n.message}`);
      console.log(`   Link: ${n.link}`);
      console.log(`   Created: ${n.createdAt}`);
      console.log(`   Metadata: ${JSON.stringify(n.metadata)}`);
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

findAutoProgressNotifications();
