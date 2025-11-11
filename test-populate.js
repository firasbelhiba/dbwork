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

    // Find one issue with assignees
    const issue = await issuesCollection.findOne({
      assignees: { $exists: true, $ne: [] }
    });

    if (!issue) {
      console.log('No issues with assignees found');
      return;
    }

    console.log('Issue key:', issue.key);
    console.log('Assignees field:', issue.assignees);
    console.log('Assignees type:', Array.isArray(issue.assignees) ? 'Array' : typeof issue.assignees);
    console.log('First assignee:', issue.assignees[0]);
    console.log('First assignee type:', typeof issue.assignees[0]);

    // Try to fetch the user
    if (issue.assignees[0]) {
      const userId = typeof issue.assignees[0] === 'string'
        ? new ObjectId(issue.assignees[0])
        : issue.assignees[0];

      console.log('\nLooking up user with ID:', userId);
      const user = await usersCollection.findOne({ _id: userId });

      if (user) {
        console.log('✓ User found:', user.firstName, user.lastName);
      } else {
        console.log('✗ User NOT found in database');
      }
    }

    // Check the actual ref in schema by looking at a few issues
    const sampleIssues = await issuesCollection.find({}).limit(3).toArray();
    console.log('\n=== Sample Issues ===');
    sampleIssues.forEach(i => {
      console.log(`${i.key}: assignees =`, i.assignees?.map(a => a?.toString()));
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testPopulate();
