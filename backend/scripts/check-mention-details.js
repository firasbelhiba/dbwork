const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const userId = '68f979aa2ae284487d1dacca';

  // Get mention notifications with all details
  const mentions = await db.collection('notifications')
    .find({ userId: userId, type: 'comment_mention' })
    .sort({ createdAt: -1 })
    .toArray();

  console.log('Mention notifications for Santa Admin:\n');
  mentions.forEach((m, i) => {
    console.log((i + 1) + '. Created:', m.createdAt);
    console.log('   Read:', m.read);
    console.log('   Title:', m.title);
    console.log('   Message:', m.message);
    console.log('   Link:', m.link);
    console.log('');
  });

  // Also check the backend API limit
  console.log('\n=== Backend API returns limit of 50 notifications ===');
  console.log('If you have 392 notifications and mentions are old, they wont show up');

  // Check how many unread notifications exist
  const unreadCount = await db.collection('notifications').countDocuments({
    userId: userId,
    read: false
  });
  console.log('Unread notifications:', unreadCount);

  // Check what the newest and oldest notifications are
  const newest = await db.collection('notifications').findOne(
    { userId: userId },
    { sort: { createdAt: -1 } }
  );
  const oldest50th = await db.collection('notifications')
    .find({ userId: userId })
    .sort({ createdAt: -1 })
    .skip(49)
    .limit(1)
    .toArray();

  console.log('\nNewest notification:', newest?.createdAt);
  console.log('50th newest notification:', oldest50th[0]?.createdAt);
  console.log('\nMention notifications dates range from:');
  console.log('  Oldest mention:', mentions[mentions.length - 1]?.createdAt);
  console.log('  Newest mention:', mentions[0]?.createdAt);

  await mongoose.disconnect();
}
run();
