const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://firasbelhiba:09Darblockchain09@cluster0.mongodb.net/dar-blockchain-pm?retryWrites=true&w=majority';

async function checkNotifications() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');

    const db = client.db('dar-blockchain-pm');

    // Get all notifications
    const notifications = await db.collection('notifications')
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    console.log(`\n📬 Found ${notifications.length} recent notifications:\n`);

    notifications.forEach((notif, index) => {
      console.log(`${index + 1}. Type: ${notif.type}`);
      console.log(`   User ID: ${notif.userId}`);
      console.log(`   Title: ${notif.title}`);
      console.log(`   Message: ${notif.message}`);
      console.log(`   Read: ${notif.read}`);
      console.log(`   Created: ${notif.createdAt}`);
      console.log('');
    });

    // Count by user
    const byUser = await db.collection('notifications')
      .aggregate([
        {
          $group: {
            _id: '$userId',
            count: { $sum: 1 },
            unread: {
              $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] }
            }
          }
        }
      ])
      .toArray();

    console.log('\n📊 Notifications by user:');
    for (const user of byUser) {
      console.log(`   User ${user._id}: ${user.count} total, ${user.unread} unread`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

checkNotifications();
