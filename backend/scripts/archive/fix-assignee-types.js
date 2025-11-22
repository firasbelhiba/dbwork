const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'your-mongodb-uri-here';

async function fixAssigneeTypes() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const Issue = mongoose.model('Issue', new mongoose.Schema({}, { strict: false }), 'issues');

    // Find all issues where assignees contains strings
    const allIssues = await Issue.find({ assignees: { $exists: true, $ne: [] } });

    console.log(`Found ${allIssues.length} issues with assignees\n`);

    let fixedCount = 0;
    let alreadyCorrect = 0;

    for (const issue of allIssues) {
      let needsfix = false;
      const fixedAssignees = [];

      for (const assignee of issue.assignees) {
        if (typeof assignee === 'string') {
          needsfix = true;
          // Convert string to ObjectId
          fixedAssignees.push(new mongoose.Types.ObjectId(assignee));
        } else {
          fixedAssignees.push(assignee);
        }
      }

      if (needsfix) {
        console.log(`Fixing ${issue.key}: Converting string assignees to ObjectIds`);
        await Issue.updateOne(
          { _id: issue._id },
          { $set: { assignees: fixedAssignees } }
        );
        fixedCount++;
      } else {
        alreadyCorrect++;
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} issues`);
    console.log(`✓ ${alreadyCorrect} issues were already correct`);

    // Verify the fix for Wiem's issue
    console.log('\n=== VERIFYING FIX FOR 4HKX-468 ===');
    const testIssue = await Issue.findOne({ key: '4HKX-468' });
    console.log('assignees:', testIssue.assignees);
    console.log('First assignee type:', typeof testIssue.assignees[0]);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

fixAssigneeTypes();
