/**
 * Find notifications with issue key links (like 4HKX-635)
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function findKeyNotifications() {
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

    // Find notifications with "4HKX" in the link or message
    const notifications = await db.collection('notifications').find({
      $or: [
        { link: { $regex: /4HKX/ } },
        { message: { $regex: /4HKX/ } },
        { title: { $regex: /Next ticket started/ } }
      ]
    }).toArray();

    console.log(`Found ${notifications.length} matching notifications:\n`);

    notifications.forEach((n, i) => {
      console.log(`${i + 1}. ID: ${n._id}`);
      console.log(`   Title: ${n.title}`);
      console.log(`   Message: ${n.message}`);
      console.log(`   Link: ${n.link}`);
      console.log(`   Created: ${n.createdAt}`);
      console.log(`   Metadata: ${JSON.stringify(n.metadata)}`);
      console.log('');
    });

    // Also check for any links that are NOT ObjectIds (24 hex chars)
    console.log('\n--- Checking for non-ObjectId links ---\n');

    const badLinks = await db.collection('notifications').find({
      link: {
        $regex: /^\/issues\//,
        $not: /^\/issues\/[a-f0-9]{24}$/
      }
    }).toArray();

    console.log(`Found ${badLinks.length} notifications with non-ObjectId links:\n`);

    badLinks.forEach((n, i) => {
      console.log(`${i + 1}. ID: ${n._id}`);
      console.log(`   Title: ${n.title}`);
      console.log(`   Link: ${n.link}`);
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

findKeyNotifications();
