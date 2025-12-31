/**
 * Fix conversations by removing null projectId fields
 *
 * MongoDB sparse indexes only skip documents where the field DOESN'T EXIST.
 * If the field is explicitly null, it's still indexed and causes duplicate key errors.
 *
 * This script removes the projectId field from DM conversations (where it's null).
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function fix() {
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

    // Find all conversations with projectId: null (DM conversations)
    const nullProjectIdConvos = await collection.find({ projectId: null }).toArray();
    console.log(`\nFound ${nullProjectIdConvos.length} conversations with projectId: null`);

    if (nullProjectIdConvos.length > 0) {
      console.log('\nRemoving projectId field from these conversations...');

      // Update all DM conversations to unset the projectId field
      const result = await collection.updateMany(
        { projectId: null },
        { $unset: { projectId: "" } }
      );

      console.log(`✓ Updated ${result.modifiedCount} conversations`);
    }

    // Verify
    const afterFix = await collection.find({ projectId: null }).toArray();
    console.log(`\nAfter fix: ${afterFix.length} conversations with projectId: null`);

    const withoutProjectId = await collection.find({ projectId: { $exists: false } }).toArray();
    console.log(`Conversations without projectId field: ${withoutProjectId.length}`);

    console.log('\n✓ Done! DM conversations can now be created.');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fix();
