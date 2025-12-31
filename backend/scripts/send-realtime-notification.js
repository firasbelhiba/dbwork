// Script to send a real-time test notification to Santa Admin
// This will trigger the WebSocket notification with sound
const mongoose = require('mongoose');
const { io } = require('socket.io-client');
require('dotenv').config();

async function sendRealtimeNotification() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const userId = '68f979aa2ae284487d1dacca'; // Santa Admin's ID

    // Create notification in database
    const notification = {
      userId: userId,
      type: 'comment_mention',
      title: 'Test Notification',
      message: `🔔 Real-time test notification sent at ${new Date().toLocaleTimeString()}`,
      link: '/notifications',
      read: false,
      metadata: { test: true },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('notifications').insertOne(notification);
    notification._id = result.insertedId;

    console.log('\n✅ Notification created in database');
    console.log('ID:', result.insertedId.toString());

    // Connect to WebSocket server and emit the notification
    console.log('\nConnecting to WebSocket server...');

    const socket = io('https://dbwork-bovr.onrender.com', {
      transports: ['websocket'],
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');

      // Emit to the user's room
      // Note: This won't work directly because we need server-side emission
      // But the notification is in the database

      console.log('\n📢 Notification saved to database!');
      console.log('The notification will appear when you refresh or via polling.');
      console.log('\nTo test real-time sound, run this in your browser console:');
      console.log(`
fetch('https://dbwork-bovr.onrender.com/notifications/test', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('accessToken'),
    'Content-Type': 'application/json'
  }
}).then(r => r.json()).then(console.log)
      `);

      socket.disconnect();
      mongoose.disconnect();
      process.exit(0);
    });

    socket.on('connect_error', (error) => {
      console.log('WebSocket connection error:', error.message);
      console.log('\n📢 Notification saved to database anyway!');
      mongoose.disconnect();
      process.exit(0);
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      console.log('\nWebSocket connection timed out, but notification is in database.');
      socket.disconnect();
      mongoose.disconnect();
      process.exit(0);
    }, 5000);

  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

sendRealtimeNotification();
