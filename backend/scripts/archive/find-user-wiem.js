const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'your-mongodb-uri-here';

async function findUser() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');

    // Find user by name or email containing "wiem"
    const users = await User.find({
      $or: [
        { firstName: /wiem/i },
        { lastName: /wiem/i },
        { email: /wiem/i }
      ]
    }).select('_id firstName lastName email role');

    console.log(`\nFound ${users.length} users matching "wiem":`);
    users.forEach(user => {
      console.log(`\n- ID: ${user._id}`);
      console.log(`  Name: ${user.firstName} ${user.lastName}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
    });

    // Now check if any of these users have issues assigned
    for (const user of users) {
      const Issue = mongoose.model('Issue', new mongoose.Schema({}, { strict: false }), 'issues');
      const issues = await Issue.find({
        assignees: user._id,
        isArchived: false
      }).select('key title status');

      console.log(`\n  Issues assigned to ${user.firstName}: ${issues.length}`);
      if (issues.length > 0) {
        issues.forEach(issue => {
          console.log(`    - ${issue.key}: ${issue.title} (${issue.status})`);
        });
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n\nDisconnected from MongoDB');
  }
}

findUser();
