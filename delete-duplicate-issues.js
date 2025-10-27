// Script to delete all issues with key "ISSUE-1" from MongoDB
// Run this with: node delete-duplicate-issues.js

const { MongoClient } = require('mongodb');

const url = 'mongodb+srv://voodooooboy_db_user:3WtPNaCOrk0q0BVO@cluster0.lpetngj.mongodb.net/dar-pm?retryWrites=true&w=majority&appName=Cluster0';
const dbName = 'dar-pm';

async function deleteDuplicateIssues() {
  const client = new MongoClient(url);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(dbName);
    const issues = db.collection('issues');

    // Find all issues with key ISSUE-1
    const duplicates = await issues.find({ key: 'ISSUE-1' }).toArray();
    console.log(`Found ${duplicates.length} issues with key "ISSUE-1":`);
    duplicates.forEach(issue => {
      console.log(`  - Issue ID: ${issue._id}, Project: ${issue.projectId}, Title: ${issue.title}`);
    });

    // Delete ALL issues with key ISSUE-1
    const result = await issues.deleteMany({ key: 'ISSUE-1' });
    console.log(`\nDeleted ${result.deletedCount} duplicate issues`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

deleteDuplicateIssues();
