const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dbwork';

async function testSubIssuesFix() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const db = client.db();
    const issuesCollection = db.collection('issues');

    const parentIssueId = '690dc8943d7e74aa144446b3'; // TAI-122

    console.log('=== TEST 1: Get all sub-issues (including archived) ===');
    const allSubIssues = await issuesCollection.find({
      parentIssue: new ObjectId(parentIssueId)
    }).toArray();
    console.log(`Found ${allSubIssues.length} sub-issues total:`);
    allSubIssues.forEach(s => {
      console.log(`- ${s.key}: ${s.title} (isArchived: ${s.isArchived})`);
    });

    console.log('\n=== TEST 2: Get only non-archived sub-issues ===');
    const activeSubIssues = await issuesCollection.find({
      parentIssue: new ObjectId(parentIssueId),
      isArchived: false
    }).toArray();
    console.log(`Found ${activeSubIssues.length} active sub-issues:`);
    activeSubIssues.forEach(s => {
      console.log(`- ${s.key}: ${s.title}`);
    });

    if (activeSubIssues.length === 0) {
      console.log('⚠️  All sub-issues are archived! Users won\'t see any by default.');
      console.log('This is expected for this particular issue.');
    }

    console.log('\n=== TEST 3: Verify parentIssue types ===');
    const stringParents = await issuesCollection.countDocuments({
      parentIssue: { $type: 'string' }
    });
    const objectIdParents = await issuesCollection.countDocuments({
      parentIssue: { $type: 'objectId' }
    });

    console.log(`Issues with parentIssue as string: ${stringParents}`);
    console.log(`Issues with parentIssue as ObjectId: ${objectIdParents}`);

    if (stringParents === 0) {
      console.log('✅ All parentIssue fields are ObjectIds!');
    } else {
      console.log('❌ Still have string parentIssue fields!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

testSubIssuesFix();
