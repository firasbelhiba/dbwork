const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: './backend/.env' });

const uri = process.env.MONGODB_URI;
const dbName = 'dar-pm';

async function checkInvalidAssignees() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas\n');

    const db = client.db(dbName);
    const issuesCollection = db.collection('issues');
    const usersCollection = db.collection('users');

    // Get all valid user IDs
    const allUsers = await usersCollection.find({}).toArray();
    const validUserIds = new Set(allUsers.map(u => u._id.toString()));

    console.log(`Total valid users in database: ${validUserIds.size}\n`);
    console.log('Valid user IDs:');
    allUsers.forEach(u => {
      console.log(`  - ${u._id.toString()} (${u.firstName} ${u.lastName})`);
    });

    // Get all issues with assignees
    const issuesWithAssignees = await issuesCollection.find({
      assignees: { $exists: true, $ne: [] }
    }).toArray();

    console.log(`\n\nTotal issues with assignees: ${issuesWithAssignees.length}\n`);

    // Check each issue for invalid assignee IDs
    let issuesWithInvalidAssignees = [];
    let totalInvalidReferences = 0;

    for (const issue of issuesWithAssignees) {
      const invalidIds = issue.assignees.filter(
        id => !validUserIds.has(id.toString())
      );

      if (invalidIds.length > 0) {
        issuesWithInvalidAssignees.push({
          key: issue.key,
          title: issue.title,
          invalidIds: invalidIds.map(id => id.toString())
        });
        totalInvalidReferences += invalidIds.length;
      }
    }

    console.log('=== Issues with Invalid Assignee IDs ===\n');

    if (issuesWithInvalidAssignees.length === 0) {
      console.log('✅ All assignee IDs are valid!');
    } else {
      console.log(`⚠️  Found ${issuesWithInvalidAssignees.length} issues with invalid assignee references`);
      console.log(`   Total invalid references: ${totalInvalidReferences}\n`);

      issuesWithInvalidAssignees.slice(0, 20).forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.key} - ${issue.title}`);
        console.log(`   Invalid IDs: ${issue.invalidIds.join(', ')}`);
      });

      if (issuesWithInvalidAssignees.length > 20) {
        console.log(`\n... and ${issuesWithInvalidAssignees.length - 20} more issues`);
      }

      console.log('\n=== Solution ===');
      console.log('These invalid assignee IDs need to be cleaned up.');
      console.log('Options:');
      console.log('1. Remove invalid IDs from assignees arrays');
      console.log('2. Check if these users were deleted and need to be restored');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nConnection closed');
  }
}

checkInvalidAssignees()
  .then(() => {
    console.log('\nCheck completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nCheck failed:', error);
    process.exit(1);
  });
