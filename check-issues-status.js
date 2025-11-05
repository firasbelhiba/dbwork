const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';

async function checkIssues() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const issuesCollection = db.collection('issues');

    // Get total count
    const total = await issuesCollection.countDocuments({});
    console.log(`📊 TOTAL ISSUES IN DATABASE: ${total}\n`);

    // Get archived count
    const archived = await issuesCollection.countDocuments({ isArchived: true });
    console.log(`📦 Archived issues: ${archived}`);

    // Get non-archived count
    const active = await issuesCollection.countDocuments({ isArchived: false });
    console.log(`✅ Active (non-archived) issues: ${active}`);

    // Get issues without isArchived field
    const noField = await issuesCollection.countDocuments({ isArchived: { $exists: false } });
    console.log(`❓ Issues without isArchived field: ${noField}\n`);

    // Show first 20 issues
    console.log('📋 First 20 issues:\n');
    const issues = await issuesCollection
      .find({})
      .limit(20)
      .toArray();

    issues.forEach((issue, index) => {
      const archivedStatus = issue.isArchived ? '📦 ARCHIVED' : '✅ ACTIVE';
      console.log(`${index + 1}. ${issue.key}: ${issue.title.substring(0, 50)}`);
      console.log(`   Status: ${archivedStatus}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed.');
  }
}

checkIssues();
