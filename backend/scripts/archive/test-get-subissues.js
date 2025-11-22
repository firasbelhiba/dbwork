const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dbwork';

async function testGetSubIssues() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const db = client.db();
    const issuesCollection = db.collection('issues');

    // Find parent issue TAI-122
    const parentIssueId = '690dc8943d7e74aa144446b3';

    const parent = await issuesCollection.findOne({ _id: new ObjectId(parentIssueId) });

    if (!parent) {
      console.log('❌ Parent issue not found');
      return;
    }

    console.log('✅ Found parent issue:', parent.key, '-', parent.title);
    console.log('\n=== FINDING SUB-ISSUES ===');

    // Simulate the backend getSubIssues query
    const subIssues = await issuesCollection.find({
      parentIssue: new ObjectId(parentIssueId)
    }).sort({ createdAt: -1 }).toArray();

    console.log(`Found ${subIssues.length} sub-issues total\n`);

    subIssues.forEach((sub, index) => {
      console.log(`${index + 1}. ${sub.key} - ${sub.title}`);
      console.log(`   isArchived: ${sub.isArchived}`);
      console.log(`   status: ${sub.status}`);
      console.log(`   assignees: ${sub.assignees?.length || 0}`);
      console.log('');
    });

    // Count archived vs non-archived
    const archived = subIssues.filter(s => s.isArchived).length;
    const active = subIssues.filter(s => !s.isArchived).length;

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total sub-issues: ${subIssues.length}`);
    console.log(`Active: ${active}`);
    console.log(`Archived: ${archived}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

testGetSubIssues();
