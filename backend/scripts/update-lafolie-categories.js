const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';

// Category assignments for La Folie project
const CATEGORY_UPDATES = [
  { key: 'LFI-2', category: 'design' },
  { key: 'LFI-3', category: 'design' },
];

async function updateCategories() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    const Issue = mongoose.connection.collection('issues');

    console.log('Updating La Folie project categories...\n');

    let updatedCount = 0;

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
      } else {
        console.log(`  ❌ ${update.key} not found`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`Updated: ${updatedCount} issues`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
}

updateCategories();
