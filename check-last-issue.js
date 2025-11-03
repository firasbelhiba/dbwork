const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';

async function checkLastIssue() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const issuesCollection = db.collection('issues');

    // Find last issue with 4HKX prefix
    const lastIssue = await issuesCollection
      .find({ key: /^4HKX-/ })
      .sort({ key: -1 })
      .limit(5)
      .toArray();

    console.log('📋 Last 5 issues:');
    lastIssue.forEach(issue => {
      console.log(`  ${issue.key}: ${issue.title}`);
    });

    if (lastIssue.length > 0) {
      console.log(`\n🔢 Last issue number: ${lastIssue[0].key}`);
      const nextNumber = parseInt(lastIssue[0].key.split('-')[1]) + 1;
      console.log(`🔢 Next issue should be: 4HKX-${nextNumber}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed.');
  }
}

checkLastIssue();
