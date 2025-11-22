const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dbwork';

async function checkParentIssueType() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const db = client.db();
    const issuesCollection = db.collection('issues');

    const issueId = '690df84523e7121c120a431a';
    const issue = await issuesCollection.findOne({ _id: new ObjectId(issueId) });

    if (!issue) {
      console.log('❌ Issue not found');
      return;
    }

    console.log('Issue:', issue.key);
    console.log('parentIssue value:', issue.parentIssue);
    console.log('parentIssue type:', typeof issue.parentIssue);
    console.log('parentIssue is ObjectId?', issue.parentIssue instanceof ObjectId);
    console.log('parentIssue.constructor.name:', issue.parentIssue?.constructor?.name);

    // Try different query approaches
    console.log('\n=== QUERY TEST 1: Using ObjectId ===');
    const parentId = new ObjectId(issue.parentIssue);
    console.log('Converted to ObjectId:', parentId);
    const siblings1 = await issuesCollection.find({ parentIssue: parentId }).toArray();
    console.log('Results:', siblings1.length);

    console.log('\n=== QUERY TEST 2: Using string ===');
    const siblings2 = await issuesCollection.find({ parentIssue: issue.parentIssue.toString() }).toArray();
    console.log('Results:', siblings2.length);

    console.log('\n=== QUERY TEST 3: Using raw value ===');
    const siblings3 = await issuesCollection.find({ parentIssue: issue.parentIssue }).toArray();
    console.log('Results:', siblings3.length);
    if (siblings3.length > 0) {
      console.log('\nFound sibling sub-issues:');
      siblings3.forEach(s => {
        console.log(`- ${s.key}: ${s.title} (isArchived: ${s.isArchived})`);
      });
    }

    // Check all issues with this parentIssue value (regardless of type)
    console.log('\n=== FINDING ALL SUB-ISSUES OF PARENT ===');
    const allSubIssues = await issuesCollection.find({
      $or: [
        { parentIssue: new ObjectId(issue.parentIssue) },
        { parentIssue: issue.parentIssue.toString() },
        { parentIssue: issue.parentIssue }
      ]
    }).toArray();

    console.log(`Found ${allSubIssues.length} sub-issues using $or query`);
    allSubIssues.forEach(s => {
      console.log(`- ${s.key}: ${s.title}`);
      console.log(`  parentIssue type: ${typeof s.parentIssue}, value: ${s.parentIssue}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

checkParentIssueType();
