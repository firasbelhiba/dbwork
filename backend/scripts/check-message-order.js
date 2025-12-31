const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // Get the conversation with Aziz
  const conversations = await db.collection('conversations').find({}).toArray();

  console.log('Looking for DM conversations...\n');

  for (const conv of conversations) {
    if (conv.type === 'direct') {
      console.log('Conversation:', conv._id.toString());

      // Get messages for this conversation
      const messages = await db.collection('messages')
        .find({ conversationId: conv._id })
        .sort({ createdAt: 1 }) // Sort by createdAt ascending
        .toArray();

      console.log(`\nMessages (${messages.length} total, sorted by createdAt):`);
      for (const msg of messages) {
        const sender = await db.collection('users').findOne({ _id: msg.senderId });
        console.log(`  [${msg.createdAt?.toISOString() || 'no date'}] ${sender?.firstName || 'Unknown'}: "${msg.content}"`);
        console.log(`    _id: ${msg._id}, createdAt: ${msg.createdAt}`);
      }
      console.log('\n---\n');
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
