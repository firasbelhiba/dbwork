/**
 * Check for conversations with null projectId
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('conversations');

    // Find all conversations with null projectId
    const nullProjectIdConvos = await collection.find({ projectId: null }).toArray();

    console.log(`\nFound ${nullProjectIdConvos.length} conversations with projectId: null`);

    nullProjectIdConvos.forEach((convo, i) => {
      console.log(`\n${i + 1}. ID: ${convo._id}`);
      console.log(`   Type: ${convo.type}`);
      console.log(`   Participants: ${convo.participants?.length || 0}`);
      console.log(`   Created: ${convo.createdAt}`);
    });

    // Also check for DM conversations
    const dmConvos = await collection.find({ type: 'direct' }).toArray();
    console.log(`\n\nTotal DM conversations: ${dmConvos.length}`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

check();
