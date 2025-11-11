const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './backend/.env' });

const uri = process.env.MONGODB_URI;
const dbName = 'dar-pm';

async function testAssigneesData() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    const db = client.db(dbName);
    const issuesCollection = db.collection('issues');

    // Sample a few issues to check their assignees field
    console.log('\n=== Checking Issues Assignees Field ===\n');

    const sampleIssues = await issuesCollection
      .find({})
      .limit(10)
      .toArray();

    console.log(`Found ${sampleIssues.length} sample issues:\n`);

    sampleIssues.forEach((issue, index) => {
      console.log(`${index + 1}. Issue ${issue.key}:`);
      console.log(`   - assignees field exists: ${issue.assignees !== undefined}`);
      console.log(`   - assignees is array: ${Array.isArray(issue.assignees)}`);
      console.log(`   - assignees length: ${issue.assignees?.length || 0}`);
      if (issue.assignees && issue.assignees.length > 0) {
        console.log(`   - assignees IDs: ${issue.assignees.map(id => id.toString()).join(', ')}`);
      }
      console.log('');
    });

    // Check if any issues still have the old 'assignee' field
    const issuesWithOldField = await issuesCollection.countDocuments({
      assignee: { $exists: true }
    });

    console.log(`\n=== Old Field Check ===`);
    console.log(`Issues with old 'assignee' field: ${issuesWithOldField}`);

    // Count issues with assignees
    const withAssignees = await issuesCollection.countDocuments({
      assignees: { $exists: true, $ne: [] }
    });

    const withoutAssignees = await issuesCollection.countDocuments({
      $or: [
        { assignees: { $exists: false } },
        { assignees: [] }
      ]
    });

    console.log(`\n=== Summary ===`);
    console.log(`Issues with assignees: ${withAssignees}`);
    console.log(`Issues without assignees (empty array): ${withoutAssignees}`);
    console.log(`Total issues: ${sampleIssues.length > 0 ? await issuesCollection.countDocuments({}) : 0}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nConnection closed');
  }
}

testAssigneesData()
  .then(() => {
    console.log('\nDiagnostic completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nDiagnostic failed:', error);
    process.exit(1);
  });
