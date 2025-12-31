const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // Get all conversations
  const conversations = await db.collection('conversations').find({}).toArray();

  console.log('All conversations:\n');
  for (const c of conversations) {
    const participants = await db.collection('users').find({
      _id: { $in: c.participants }
    }).project({ firstName: 1, lastName: 1, email: 1 }).toArray();

    console.log('Conversation:', c._id.toString());
    console.log('  Type:', c.type);
    console.log('  Name:', c.name || '(DM)');
    console.log('  Participants:');
    participants.forEach(p => console.log('    -', p.firstName, p.lastName, '-', p.email));
    console.log('');
  }

  await mongoose.disconnect();
}
run();
