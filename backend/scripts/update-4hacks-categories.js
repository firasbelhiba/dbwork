const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';

// Category assignments for 4Hacks project
const CATEGORY_UPDATES = [
  // Frontend (28 tickets)
  { key: '4HKX-460', category: 'frontend' },
  { key: '4HKX-461', category: 'frontend' },
  { key: '4HKX-462', category: 'frontend' },
  { key: '4HKX-466', category: 'frontend' },
  { key: '4HKX-468', category: 'frontend' },
  { key: '4HKX-484', category: 'frontend' },
  { key: '4HKX-486', category: 'frontend' },
  { key: '4HKX-488', category: 'frontend' },
  { key: '4HKX-504', category: 'frontend' },
  { key: '4HKX-505', category: 'frontend' },
  { key: '4HKX-506', category: 'frontend' },
  { key: '4HKX-507', category: 'frontend' },
  { key: '4HKX-508', category: 'frontend' },
  { key: '4HKX-509', category: 'frontend' },
  { key: '4HKX-513', category: 'frontend' },
  { key: '4HKX-514', category: 'frontend' },
  { key: '4HKX-515', category: 'frontend' },
  { key: '4HKX-516', category: 'frontend' },
  { key: '4HKX-517', category: 'frontend' },
  { key: '4HKX-518', category: 'frontend' },
  { key: '4HKX-519', category: 'frontend' },
  { key: '4HKX-520', category: 'frontend' },
  { key: '4HKX-521', category: 'frontend' },
  { key: '4HKX-524', category: 'frontend' },
  { key: '4HKX-526', category: 'frontend' },
  { key: '4HKX-527', category: 'frontend' },
  { key: '4HKX-528', category: 'frontend' },
  { key: '4HKX-531', category: 'frontend' },

  // Backend (43 tickets)
  { key: '4HKX-463', category: 'backend' },
  { key: '4HKX-464', category: 'backend' },
  { key: '4HKX-465', category: 'backend' },
  { key: '4HKX-467', category: 'backend' },
  { key: '4HKX-470', category: 'backend' },
  { key: '4HKX-471', category: 'backend' },
  { key: '4HKX-472', category: 'backend' },
  { key: '4HKX-473', category: 'backend' },
  { key: '4HKX-474', category: 'backend' },
  { key: '4HKX-475', category: 'backend' },
  { key: '4HKX-476', category: 'backend' },
  { key: '4HKX-477', category: 'backend' },
  { key: '4HKX-478', category: 'backend' },
  { key: '4HKX-479', category: 'backend' },
  { key: '4HKX-480', category: 'backend' },
  { key: '4HKX-481', category: 'backend' },
  { key: '4HKX-482', category: 'backend' },
  { key: '4HKX-483', category: 'backend' },
  { key: '4HKX-485', category: 'backend' },
  { key: '4HKX-489', category: 'backend' },
  { key: '4HKX-490', category: 'backend' },
  { key: '4HKX-491', category: 'backend' },
  { key: '4HKX-492', category: 'backend' },
  { key: '4HKX-493', category: 'backend' },
  { key: '4HKX-494', category: 'backend' },
  { key: '4HKX-495', category: 'backend' },
  { key: '4HKX-496', category: 'backend' },
  { key: '4HKX-497', category: 'backend' },
  { key: '4HKX-498', category: 'backend' },
  { key: '4HKX-499', category: 'backend' },
  { key: '4HKX-500', category: 'backend' },
  { key: '4HKX-501', category: 'backend' },
  { key: '4HKX-502', category: 'backend' },
  { key: '4HKX-503', category: 'backend' },
  { key: '4HKX-510', category: 'backend' },
  { key: '4HKX-511', category: 'backend' },
  { key: '4HKX-512', category: 'backend' },
  { key: '4HKX-522', category: 'backend' },
  { key: '4HKX-523', category: 'backend' },
  { key: '4HKX-525', category: 'backend' },
  { key: '4HKX-529', category: 'backend' },
  { key: '4HKX-530', category: 'backend' },
  { key: '4HKX-532', category: 'backend' },
];

async function updateCategories() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    const Issue = mongoose.connection.collection('issues');

    console.log('Updating 4Hacks project categories...\n');

    let updatedCount = 0;
    let frontendCount = 0;
    let backendCount = 0;

    for (const update of CATEGORY_UPDATES) {
      const result = await Issue.updateOne(
        { key: update.key },
        { $set: { category: update.category } }
      );

      if (result.modifiedCount > 0) {
        console.log(`  ✅ ${update.key} → ${update.category}`);
        updatedCount++;
        if (update.category === 'frontend') frontendCount++;
        if (update.category === 'backend') backendCount++;
      } else if (result.matchedCount > 0) {
        console.log(`  ⏭️  ${update.key} already has category set`);
      } else {
        console.log(`  ❌ ${update.key} not found`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`Updated: ${updatedCount} issues`);
    console.log(`  Frontend: ${frontendCount}`);
    console.log(`  Backend: ${backendCount}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
}

updateCategories();
