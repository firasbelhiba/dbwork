const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';

async function fixExistingIssues() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const issuesCollection = db.collection('issues');

    // Update all issues that don't have isArchived field
    const result = await issuesCollection.updateMany(
      { isArchived: { $exists: false } },
      { $set: { isArchived: false, archivedAt: null } }
    );

    console.log(`✅ Updated ${result.modifiedCount} issues`);
    console.log(`   Added isArchived: false to all existing issues\n`);

    // Verify
    const active = await issuesCollection.countDocuments({ isArchived: false });
    const total = await issuesCollection.countDocuments({});

    console.log(`📊 Verification:`);
    console.log(`   Total issues: ${total}`);
    console.log(`   Active issues: ${active}`);
    console.log(`   Archived issues: ${await issuesCollection.countDocuments({ isArchived: true })}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed.');
  }
}

fixExistingIssues();
