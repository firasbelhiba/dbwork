const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://firasbelhiba:09Darblockchain09@cluster0.mongodb.net/dar-blockchain-pm?retryWrites=true&w=majority';

async function testNotificationCreation() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB\n');

    const db = client.db('dar-blockchain-pm');

    // Get a test user
    const users = await db.collection('users').find({}).limit(2).toArray();

    if (users.length < 2) {
      console.log('❌ Need at least 2 users to test. Found:', users.length);
      return;
    }

    console.log('Found users:');
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.firstName} ${user.lastName} (${user._id})`);
    });

    // Create a test notification manually
    const testNotification = {
      userId: users[0]._id,
      type: 'issue_assigned',
      title: 'Test Notification',
      message: 'This is a test notification to verify the system works',
      link: '/issues/test',
      read: false,
      metadata: {
        issueKey: 'TEST-1',
        assignedBy: users[1]._id.toString(),
      },
      createdAt: new Date(),
    };

    console.log('\n📝 Creating test notification...');
    const result = await db.collection('notifications').insertOne(testNotification);
    console.log('✓ Notification created with ID:', result.insertedId);

    // Verify it was created
    const notification = await db.collection('notifications').findOne({ _id: result.insertedId });
    console.log('\n✓ Notification retrieved from database:');
    console.log('  User ID:', notification.userId.toString());
    console.log('  Type:', notification.type);
    console.log('  Title:', notification.title);
    console.log('  Message:', notification.message);
    console.log('  Read:', notification.read);

    // Count notifications for this user
    const count = await db.collection('notifications').countDocuments({ userId: users[0]._id });
    console.log(`\n📊 Total notifications for user ${users[0].firstName}:`, count);

    console.log('\n✅ Test completed successfully!');
    console.log('\nNow try fetching notifications from the API:');
    console.log(`GET https://dbwork-bovr.onrender.com/notifications (with auth token for ${users[0].firstName})`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

testNotificationCreation();
