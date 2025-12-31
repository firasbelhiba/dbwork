const mongoose = require('mongoose');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';

// Category assignments for GIFT project
const CATEGORY_UPDATES = [
  { key: 'GIFT-1', category: 'backend' },
  { key: 'GIFT-2', category: 'backend' },
  { key: 'GIFT-3', category: 'infrastructure' },
  { key: 'GIFT-4', category: 'backend' },
  { key: 'GIFT-5', category: 'infrastructure' },
  { key: 'GIFT-6', category: 'backend' },
  { key: 'GIFT-8', category: 'qa' },
  { key: 'GIFT-9', category: 'backend' },
  { key: 'GIFT-10', category: 'backend' },
  { key: 'GIFT-11', category: 'backend' },
  { key: 'GIFT-12', category: 'backend' },
  { key: 'GIFT-13', category: 'backend' },
  { key: 'GIFT-14', category: 'backend' },
  // GIFT-15 already has devops, skip
];

async function updateCategories() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    const Issue = mongoose.connection.collection('issues');

    console.log('Updating GIFT project categories...\n');

    let updatedCount = 0;
    let skippedCount = 0;

    for (const update of CATEGORY_UPDATES) {
      const result = await Issue.updateOne(
        { key: update.key },
        { $set: { category: update.category } }
      );

      if (result.modifiedCount > 0) {
        console.log(`  ✅ ${update.key} → ${update.category}`);
        updatedCount++;
      } else if (result.matchedCount > 0) {
        console.log(`  ⏭️  ${update.key} already has category set`);
        skippedCount++;
      } else {
        console.log(`  ❌ ${update.key} not found`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY');
    console.log('='.repeat(50));
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Total processed: ${CATEGORY_UPDATES.length}`);

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed.');
  }
}

updateCategories();
