const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';

async function findMaxIssue() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const issuesCollection = db.collection('issues');

    // Find all issues with 4HKX prefix
    const issues = await issuesCollection
      .find({ key: /^4HKX-/ })
      .toArray();

    // Extract numbers and find max
    const numbers = issues.map(issue => {
      const num = parseInt(issue.key.split('-')[1]);
      return { key: issue.key, num };
    });

    numbers.sort((a, b) => b.num - a.num);

    console.log('📋 Top 10 issues by number:');
    numbers.slice(0, 10).forEach(item => {
      console.log(`  ${item.key} (${item.num})`);
    });

    console.log(`\n🔢 Highest issue number: ${numbers[0].num}`);
    console.log(`🔢 Next issue should be: 4HKX-${numbers[0].num + 1}`);
    console.log(`📊 Total 4HKX issues: ${issues.length}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed.');
  }
}

findMaxIssue();
