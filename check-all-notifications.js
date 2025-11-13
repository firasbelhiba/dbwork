const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb+srv://firasbelhiba:09Darblockchain09@cluster0.mongodb.net/dar-blockchain-pm?retryWrites=true&w=majority';

async function checkAllNotifications() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB\n');

    const db = client.db('dar-blockchain-pm');

    // Get ALL notifications
    const notifications = await db.collection('notifications')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`📬 Total notifications in database: ${notifications.length}\n`);

    if (notifications.length === 0) {
      console.log('❌ NO NOTIFICATIONS FOUND IN DATABASE');
      console.log('\nLet me check if the collection exists...');

      const collections = await db.listCollections().toArray();
      const notifCollection = collections.find(c => c.name === 'notifications');

      if (notifCollection) {
        console.log('✓ Notifications collection exists but is empty');
      } else {
        console.log('✗ Notifications collection does not exist');
      }
    } else {
      console.log('✓ Found notifications! Here they are:\n');

      notifications.forEach((notif, index) => {
        console.log(`${index + 1}. ID: ${notif._id}`);
        console.log(`   User ID: ${notif.userId}`);
        console.log(`   Type: ${notif.type}`);
        console.log(`   Title: ${notif.title}`);
        console.log(`   Message: ${notif.message}`);
        console.log(`   Read: ${notif.read}`);
        console.log(`   Created: ${notif.createdAt || 'N/A'}`);
        console.log('');
      });

      // Check for the specific user
      const targetUserId = '690b4760ab322a5509315c34';
      const userNotifications = notifications.filter(n => n.userId.toString() === targetUserId);

      console.log(`\n📊 Notifications for user ${targetUserId}: ${userNotifications.length}`);

      if (userNotifications.length > 0) {
        console.log('\nThese notifications should appear for Firas Benhiba:');
        userNotifications.forEach((notif, index) => {
          console.log(`  ${index + 1}. ${notif.title}: ${notif.message}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.close();
  }
}

checkAllNotifications();
