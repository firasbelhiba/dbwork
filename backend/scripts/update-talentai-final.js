const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';

// Final batch for TAI
const FINAL_CATEGORIES = [
  { key: 'TAI-65', category: 'frontend' },  // sign in error display
  { key: 'TAI-66', category: 'other' },     // azeae - test ticket
  { key: 'TAI-67', category: 'frontend' },  // Can't edit required skills - UI
  { key: 'TAI-68', category: 'frontend' },  // Frontend Infinite Refresh Loop
  { key: 'TAI-69', category: 'backend' },   // session handling
  { key: 'TAI-70', category: 'frontend' },  // first time add technical skill - UI
  { key: 'TAI-71', category: 'frontend' },  // Interview details not visible
  { key: 'TAI-75', category: 'frontend' },  // Frontend High Load Time
  { key: 'TAI-76', category: 'frontend' },  // Frontend High Load Time
  { key: 'TAI-77', category: 'backend' },   // post job takes time - backend performance
  { key: 'TAI-80', category: 'backend' },   // Login process slow - auth performance
];

async function updateFinal() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    const Issue = mongoose.connection.collection('issues');

    console.log('Final Talent AI category updates...\n');

    let updatedCount = 0;

    for (const update of FINAL_CATEGORIES) {
      const result = await Issue.updateOne(
        { key: update.key },
        { $set: { category: update.category } }
      );

      if (result.modifiedCount > 0) {
        console.log(`  ✅ ${update.key} → ${update.category}`);
        updatedCount++;
      } else if (result.matchedCount > 0) {
        console.log(`  ⏭️  ${update.key} already has category`);
      } else {
        console.log(`  ❌ ${update.key} not found`);
      }
    }

    // Final verification
    const stillUncategorized = await Issue.find({
      key: { $regex: /^TAI-/ },
      $or: [{ category: null }, { category: { $exists: false } }]
    }).project({ key: 1 }).toArray();

    console.log('\n' + '='.repeat(50));
    console.log(`Updated: ${updatedCount} issues`);

    if (stillUncategorized.length > 0) {
      console.log(`\n⚠️  Still uncategorized: ${stillUncategorized.length}`);
      for (const issue of stillUncategorized) {
        console.log(`  ${issue.key}`);
      }
    } else {
      console.log('\n✅ ALL Talent AI issues are now categorized!');
    }

    // Get final counts
    const categoryCounts = await Issue.aggregate([
      { $match: { key: { $regex: /^TAI-/ } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    console.log('\nFinal Talent AI category distribution:');
    for (const cat of categoryCounts) {
      console.log(`  ${cat._id || 'null'}: ${cat.count}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed.');
  }
}

updateFinal();
