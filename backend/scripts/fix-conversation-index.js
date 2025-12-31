/**
 * Fix conversation projectId index
 *
 * The unique index on projectId was created without sparse:true,
 * which prevents multiple DM conversations (which have null projectId).
 *
 * This script drops the old index so Mongoose can recreate it with sparse:true.
 *
 * Run with: node scripts/fix-conversation-index.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function fixIndex() {
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

    // Check existing indexes
    console.log('\nCurrent indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}, unique: ${idx.unique}, sparse: ${idx.sparse}`);
    });

    // Check if projectId_1 index exists
    const projectIdIndex = indexes.find(idx => idx.name === 'projectId_1');

    if (projectIdIndex) {
      if (projectIdIndex.sparse) {
        console.log('\n✓ projectId_1 index already has sparse: true');
      } else {
        console.log('\n⚠ projectId_1 index does NOT have sparse: true');
        console.log('Dropping the old index...');

        await collection.dropIndex('projectId_1');
        console.log('✓ Dropped projectId_1 index');

        console.log('Creating new index with sparse: true...');
        await collection.createIndex({ projectId: 1 }, { unique: true, sparse: true });
        console.log('✓ Created new projectId_1 index with sparse: true');
      }
    } else {
      console.log('\n⚠ projectId_1 index does not exist');
      console.log('Creating new index with sparse: true...');
      await collection.createIndex({ projectId: 1 }, { unique: true, sparse: true });
      console.log('✓ Created projectId_1 index with sparse: true');
    }

    // Verify final state
    console.log('\nFinal indexes:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}, unique: ${idx.unique}, sparse: ${idx.sparse}`);
    });

    console.log('\n✓ Done!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixIndex();
