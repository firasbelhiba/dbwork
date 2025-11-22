const mongoose = require('mongoose');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'your-mongodb-uri-here';

const userId = '691b45193a2af2f867766c75';

async function checkUserIssues() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const Issue = mongoose.model('Issue', new mongoose.Schema({}, { strict: false }), 'issues');

    // Check if user has any issues assigned
    const issues = await Issue.find({
      assignees: new mongoose.Types.ObjectId(userId),
      isArchived: false
    }).select('key title status assignees');

    console.log(`\nFound ${issues.length} issues assigned to user ${userId}:`);
    issues.forEach(issue => {
      console.log(`- ${issue.key}: ${issue.title}`);
      console.log(`  Status: ${issue.status}`);
      console.log(`  Assignees:`, issue.assignees);
    });

    if (issues.length === 0) {
      console.log('\n❌ No issues found for this user!');
      console.log('Checking if the user exists in any issues at all...');

      const anyIssues = await Issue.find({
        assignees: { $exists: true }
      }).limit(5).select('key assignees');

      console.log('\nSample issues with assignees:');
      anyIssues.forEach(issue => {
        console.log(`- ${issue.key}: assignees =`, issue.assignees);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkUserIssues();
