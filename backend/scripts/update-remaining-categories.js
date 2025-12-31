const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';

// Category assignments for remaining small projects
const CATEGORY_UPDATES = [
  // Grants & Proposals (1 update)
  { key: 'GRNT-1', category: 'documentation' },

  // Hedera Africa Hackathon (1 update)
  { key: 'HAH-1', category: 'documentation' },

  // Hedera Certification (19 updates)
  { key: 'CERT-2', category: 'frontend' },
  { key: 'CERT-3', category: 'marketing' },
  { key: 'CERT-4', category: 'marketing' },
  { key: 'CERT-5', category: 'marketing' },
  { key: 'CERT-6', category: 'marketing' },
  { key: 'CERT-7', category: 'marketing' },
  { key: 'CERT-8', category: 'marketing' },
  { key: 'CERT-9', category: 'marketing' },
  { key: 'CERT-10', category: 'other' },
  { key: 'CERT-11', category: 'marketing' },
  { key: 'CERT-12', category: 'documentation' },
  { key: 'CERT-13', category: 'marketing' },
  { key: 'CERT-14', category: 'marketing' },
  { key: 'CERT-15', category: 'marketing' },
  { key: 'CERT-16', category: 'marketing' },
  { key: 'CERT-17', category: 'marketing' },
  { key: 'CERT-18', category: 'marketing' },
  { key: 'CERT-19', category: 'marketing' },
  { key: 'CERT-20', category: 'marketing' },

  // Hedera-quest (5 updates)
  { key: 'HQ-3', category: 'frontend' },
  { key: 'HQ-4', category: 'frontend' },
  { key: 'HQ-5', category: 'frontend' },
  { key: 'HQ-6', category: 'backend' },
  { key: 'HQ-7', category: 'frontend' },

  // Marketing coordination (10 updates)
  { key: 'MKT-1', category: 'marketing' },
  { key: 'MKT-2', category: 'marketing' },
  { key: 'MKT-3', category: 'marketing' },
  { key: 'MKT-4', category: 'marketing' },
  { key: 'MKT-5', category: 'marketing' },
  { key: 'MKT-6', category: 'marketing' },
  { key: 'MKT-7', category: 'marketing' },
  { key: 'MKT-8', category: 'marketing' },
  { key: 'MKT-9', category: 'design' },
  { key: 'MKT-10', category: 'marketing' },
];

async function updateCategories() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    const Issue = mongoose.connection.collection('issues');

    console.log('Updating remaining project categories...\n');

    const counts = {
      frontend: 0,
      backend: 0,
      marketing: 0,
      documentation: 0,
      design: 0,
      other: 0,
    };
    let updatedCount = 0;

    for (const update of CATEGORY_UPDATES) {
      const result = await Issue.updateOne(
        { key: update.key },
        { $set: { category: update.category } }
      );

      if (result.modifiedCount > 0) {
        console.log(`  ✅ ${update.key} → ${update.category}`);
        updatedCount++;
        counts[update.category] = (counts[update.category] || 0) + 1;
      } else if (result.matchedCount > 0) {
        console.log(`  ⏭️  ${update.key} already has category set`);
      } else {
        console.log(`  ❌ ${update.key} not found`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`Updated: ${updatedCount} issues`);
    for (const [cat, count] of Object.entries(counts)) {
      if (count > 0) console.log(`  ${cat}: ${count}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
}

updateCategories();
