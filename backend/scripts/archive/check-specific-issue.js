const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'your-mongodb-uri-here';
const userId = '691b45193a2af2f867766c75'; // Wiem's ID
const issueKey = '4HKX-468'; // The issue we can see in the UI

async function checkIssue() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const Issue = mongoose.model('Issue', new mongoose.Schema({}, { strict: false }), 'issues');

    // Find the specific issue by key
    const issue = await Issue.findOne({ key: issueKey });

    if (!issue) {
      console.log(`❌ Issue ${issueKey} not found in database!`);
      return;
    }

    console.log(`Found issue: ${issue.key} - ${issue.title}`);
    console.log('\n=== DETAILED ANALYSIS ===');
    console.log('assignees field:', issue.assignees);
    console.log('assignees type:', typeof issue.assignees);
    console.log('assignees is Array:', Array.isArray(issue.assignees));
    console.log('assignees length:', issue.assignees?.length);
    console.log('isArchived:', issue.isArchived);
    console.log('\n=== CHECKING EACH ASSIGNEE ===');

    if (issue.assignees && Array.isArray(issue.assignees)) {
      issue.assignees.forEach((assignee, index) => {
        console.log(`\nAssignee ${index}:`);
        console.log('  Value:', assignee);
        console.log('  Type:', typeof assignee);
        console.log('  toString():', assignee.toString());
        console.log('  Matches Wiem?', assignee.toString() === userId);
      });
    }

    // Now try the exact query that the backend uses
    console.log('\n\n=== TESTING BACKEND QUERY ===');
    const query = {
      assignees: { $in: [new mongoose.Types.ObjectId(userId)] },
      isArchived: false
    };
    console.log('Query:', JSON.stringify(query, null, 2));

    const results = await Issue.find(query).select('key title assignees isArchived');
    console.log(`\nQuery returned ${results.length} issues:`);
    results.forEach(r => {
      console.log(`- ${r.key}: ${r.title}`);
      console.log(`  assignees:`, r.assignees);
      console.log(`  isArchived:`, r.isArchived);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n\nDisconnected from MongoDB');
  }
}

checkIssue();
