const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const userId = '68f979aa2ae284487d1dacca';

  // Get ALL notifications for this user
  const allNotifications = await db.collection('notifications')
    .find({ userId: userId })
    .sort({ createdAt: -1 })
    .toArray();

  console.log('Total notifications for Santa Admin:', allNotifications.length);

  // Group by type
  const byType = {};
  allNotifications.forEach(n => {
    byType[n.type] = (byType[n.type] || 0) + 1;
  });
  console.log('All notifications by type:', JSON.stringify(byType, null, 2));

  // Find mention notifications for this user
  const mentions = allNotifications.filter(n => n.type === 'comment_mention' || n.type === 'mention');
  console.log('\nMention notifications:', mentions.length);
  mentions.forEach(m => {
    const msg = m.message || '';
    console.log('- ' + m.createdAt + ': ' + msg.substring(0, 80) + '...');
  });

  await mongoose.disconnect();
}
run();
