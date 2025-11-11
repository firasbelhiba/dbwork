const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: './backend/.env' });

const uri = process.env.MONGODB_URI;
const dbName = 'dar-pm';

async function testPopulate() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas\n');

    const db = client.db(dbName);
    const issuesCollection = db.collection('issues');
    const usersCollection = db.collection('users');

    // Get a sample issue with assignees
    const issueWithAssignees = await issuesCollection.findOne({
      assignees: { $exists: true, $ne: [] }
    });

    if (!issueWithAssignees) {
      console.log('No issues with assignees found');
      return;
    }

    console.log('=== Sample Issue ===');
    console.log(`Key: ${issueWithAssignees.key}`);
    console.log(`Title: ${issueWithAssignees.title}`);
    console.log(`Assignees (raw IDs): ${issueWithAssignees.assignees.map(id => id.toString())}`);

    // Manually populate assignees to simulate what Mongoose does
    console.log('\n=== Populated Assignees ===');
    for (const assigneeId of issueWithAssignees.assignees) {
      const user = await usersCollection.findOne(
        { _id: new ObjectId(assigneeId) },
        { projection: { firstName: 1, lastName: 1, email: 1, avatar: 1 } }
      );

      if (user) {
        console.log(`- ${user.firstName} ${user.lastName} (${user.email})`);
      } else {
        console.log(`- User ${assigneeId} not found in database!`);
      }
    }

    // Check if all user IDs in assignees field are valid
    console.log('\n=== Validation ===');
    const allUsers = await usersCollection.find({}).toArray();
    const userIds = allUsers.map(u => u._id.toString());
    console.log(`Total users in database: ${allUsers.length}`);

    const invalidAssignees = issueWithAssignees.assignees.filter(
      id => !userIds.includes(id.toString())
    );

    if (invalidAssignees.length > 0) {
      console.log(`⚠️  Found ${invalidAssignees.length} invalid assignee IDs!`);
      console.log('Invalid IDs:', invalidAssignees.map(id => id.toString()));
    } else {
      console.log('✅ All assignee IDs are valid');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nConnection closed');
  }
}

testPopulate()
  .then(() => {
    console.log('\nTest completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nTest failed:', error);
    process.exit(1);
  });
