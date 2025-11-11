const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: './backend/.env' });

const uri = process.env.MONGODB_URI;
const dbName = 'dar-pm';

async function getProjectAndTicket() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas\n');

    const db = client.db(dbName);
    const projectsCollection = db.collection('projects');
    const issuesCollection = db.collection('issues');

    // Find Talent AI project (case insensitive search)
    const talentAIProject = await projectsCollection.findOne({
      name: { $regex: /talent.*ai/i }
    });

    if (!talentAIProject) {
      console.log('❌ Talent AI project not found');
      console.log('\nAvailable projects:');
      const allProjects = await projectsCollection.find({}).toArray();
      allProjects.forEach(p => {
        console.log(`  - ${p.name} (ID: ${p._id.toString()}, Key: ${p.key})`);
      });
      return;
    }

    console.log('✅ Found Talent AI Project:');
    console.log(`   Project Name: ${talentAIProject.name}`);
    console.log(`   Project ID: ${talentAIProject._id.toString()}`);
    console.log(`   Project Key: ${talentAIProject.key}`);

    // Find custom statuses for this project
    console.log('\n📊 Custom Statuses:');
    if (talentAIProject.customStatuses && talentAIProject.customStatuses.length > 0) {
      talentAIProject.customStatuses.forEach((status, index) => {
        console.log(`   ${index + 1}. ${status.name} (ID: ${status.id})`);
      });
    } else {
      console.log('   No custom statuses found');
    }

    // Find a ticket in the Done column
    console.log('\n🎫 Looking for tickets in Done status...');

    // Try to find issues with status containing "done" (case insensitive)
    const doneIssues = await issuesCollection.find({
      projectId: talentAIProject._id,
      $or: [
        { status: 'done' },
        { status: /done/i }
      ]
    }).limit(5).toArray();

    if (doneIssues.length > 0) {
      console.log(`\n✅ Found ${doneIssues.length} tickets in Done status:`);
      doneIssues.forEach((issue, index) => {
        console.log(`\n   ${index + 1}. ${issue.key} - ${issue.title}`);
        console.log(`      Status: ${issue.status}`);
        console.log(`      Assignees: ${issue.assignees?.length || 0}`);
        if (issue.assignees && issue.assignees.length > 0) {
          console.log(`      Assignee IDs: ${issue.assignees.map(id => id.toString()).join(', ')}`);
        }
      });

      console.log('\n📋 Use this for testing:');
      console.log(`   Project ID: ${talentAIProject._id.toString()}`);
      console.log(`   Sample Ticket: ${doneIssues[0].key}`);
      console.log(`   Ticket ID: ${doneIssues[0]._id.toString()}`);
    } else {
      console.log('\n⚠️  No tickets found in Done status');
      console.log('   Checking all tickets for this project...');

      const allIssues = await issuesCollection.find({
        projectId: talentAIProject._id
      }).limit(10).toArray();

      console.log(`\n   Found ${allIssues.length} total tickets. Sample statuses:`);
      allIssues.forEach(issue => {
        console.log(`      ${issue.key}: status="${issue.status}"`);
      });
    }

    // Count total issues in project
    const totalIssues = await issuesCollection.countDocuments({
      projectId: talentAIProject._id
    });
    console.log(`\n   Total issues in Talent AI: ${totalIssues}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nConnection closed');
  }
}

getProjectAndTicket()
  .then(() => {
    console.log('\nQuery completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nQuery failed:', error);
    process.exit(1);
  });
