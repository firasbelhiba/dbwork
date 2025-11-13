const { MongoClient, ObjectId } = require('mongodb');

const uri = 'mongodb+srv://firasbelhiba:09Darblockchain09@cluster0.mongodb.net/dar-blockchain-pm?retryWrites=true&w=majority';

async function createTestNotifications() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✓ Connected to MongoDB\n');

    const db = client.db('dar-blockchain-pm');

    // Firas Belhiba's user ID
    const firasUserId = new ObjectId('690b4760ab322a5509315c34');

    // Create multiple test notifications
    const testNotifications = [
      {
        userId: firasUserId,
        type: 'issue_assigned',
        title: 'Issue Assigned',
        message: 'You have been assigned to TEST-001: Fix login bug',
        link: '/issues/TEST-001',
        read: false,
        metadata: {
          issueKey: 'TEST-001',
          assignedBy: 'Santa Admin',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId: firasUserId,
        type: 'issue_assigned',
        title: 'Issue Assigned',
        message: 'You have been assigned to TEST-002: Add dark mode support',
        link: '/issues/TEST-002',
        read: false,
        metadata: {
          issueKey: 'TEST-002',
          assignedBy: 'Santa Admin',
        },
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
        updatedAt: new Date(Date.now() - 3600000),
      },
      {
        userId: firasUserId,
        type: 'issue_updated',
        title: 'Issue Updated',
        message: 'TEST-003: Database optimization has been updated',
        link: '/issues/TEST-003',
        read: false,
        metadata: {
          issueKey: 'TEST-003',
          updatedBy: 'Santa Admin',
        },
        createdAt: new Date(Date.now() - 7200000), // 2 hours ago
        updatedAt: new Date(Date.now() - 7200000),
      },
      {
        userId: firasUserId,
        type: 'mention',
        title: 'You were mentioned',
        message: 'You were mentioned in a comment on TEST-004',
        link: '/issues/TEST-004',
        read: false,
        metadata: {
          mentionedBy: 'Santa Admin',
        },
        createdAt: new Date(Date.now() - 10800000), // 3 hours ago
        updatedAt: new Date(Date.now() - 10800000),
      },
      {
        userId: firasUserId,
        type: 'issue_assigned',
        title: 'Issue Assigned',
        message: 'You have been assigned to TEST-005: Implement notifications system',
        link: '/issues/TEST-005',
        read: true,
        readAt: new Date(Date.now() - 3600000),
        metadata: {
          issueKey: 'TEST-005',
          assignedBy: 'Santa Admin',
        },
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        updatedAt: new Date(Date.now() - 3600000),
      },
    ];

    console.log('📝 Creating test notifications for Firas Belhiba...\n');

    // Insert all notifications
    const result = await db.collection('notifications').insertMany(testNotifications);

    console.log(`✓ Created ${result.insertedCount} test notifications\n`);

    // Verify they were created
    const notifications = await db.collection('notifications')
      .find({ userId: firasUserId })
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`📊 Total notifications for Firas Belhiba: ${notifications.length}\n`);

    console.log('Notification details:');
    notifications.forEach((notif, index) => {
      console.log(`  ${index + 1}. ${notif.title}`);
      console.log(`     Message: ${notif.message}`);
      console.log(`     Read: ${notif.read}`);
      console.log(`     Created: ${notif.createdAt}`);
      console.log('');
    });

    console.log('✅ Test notifications created successfully!');
    console.log('\nNow try accessing:');
    console.log('GET https://dbwork-bovr.onrender.com/notifications');
    console.log('(Make sure you are logged in as firasbelhiba@gmail.com)');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.close();
  }
}

createTestNotifications();
