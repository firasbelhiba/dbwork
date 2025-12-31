// Script to send a test notification to Santa Admin
const mongoose = require('mongoose');
require('dotenv').config();

async function sendTestNotification() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    const userId = '68f979aa2ae284487d1dacca'; // Santa Admin's ID

    // Create a test notification
    const testNotification = {
      userId: userId,
      type: 'comment_mention',
      title: 'Test Notification',
      message: 'This is a test notification to verify the notification system is working! 🎉',
      link: '/notifications',
      read: false,
      metadata: {
        test: true,
        timestamp: new Date().toISOString()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('notifications').insertOne(testNotification);

    console.log('\n✅ Test notification created successfully!');
    console.log('Notification ID:', result.insertedId);
    console.log('Type:', testNotification.type);
    console.log('Message:', testNotification.message);
    console.log('\nRefresh your notifications page to see it.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

sendTestNotification();
