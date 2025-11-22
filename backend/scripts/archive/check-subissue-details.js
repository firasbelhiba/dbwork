const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dbwork';

async function checkSubIssueDetails() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const db = client.db();
    const issuesCollection = db.collection('issues');

    const issueId = '690df84523e7121c120a431a';

    // Find the specific issue
    const issue = await issuesCollection.findOne({ _id: new ObjectId(issueId) });

    if (!issue) {
      console.log('❌ Issue not found with ID:', issueId);
      return;
    }

    console.log('✅ Found issue:', issue.key, '-', issue.title);
    console.log('\n=== ISSUE DETAILS ===');
    console.log('_id:', issue._id);
    console.log('key:', issue.key);
    console.log('title:', issue.title);
    console.log('type:', issue.type);
    console.log('status:', issue.status);
    console.log('projectId:', issue.projectId);
    console.log('parentIssue:', issue.parentIssue);
    console.log('assignees:', issue.assignees);
    console.log('reporter:', issue.reporter);
    console.log('isArchived:', issue.isArchived);

    // If it has a parent issue, fetch parent details
    if (issue.parentIssue) {
      console.log('\n=== PARENT ISSUE ===');
      const parent = await issuesCollection.findOne({ _id: new ObjectId(issue.parentIssue) });
      if (parent) {
        console.log('Parent Key:', parent.key);
        console.log('Parent Title:', parent.title);
        console.log('Parent ProjectId:', parent.projectId);
        console.log('Parent Assignees:', parent.assignees);
      } else {
        console.log('❌ Parent issue not found!');
      }
    }

    // Find sub-issues
    console.log('\n=== SUB-ISSUES ===');
    const subIssues = await issuesCollection.find({ parentIssue: new ObjectId(issueId) }).toArray();
    console.log('Found', subIssues.length, 'sub-issues');

    if (subIssues.length > 0) {
      subIssues.forEach((sub, index) => {
        console.log(`\nSub-issue ${index + 1}:`);
        console.log('  Key:', sub.key);
        console.log('  Title:', sub.title);
        console.log('  Assignees:', sub.assignees);
        console.log('  isArchived:', sub.isArchived);
      });
    }

    // Check project membership
    if (issue.projectId) {
      console.log('\n=== PROJECT DETAILS ===');
      const projectsCollection = db.collection('projects');
      const project = await projectsCollection.findOne({ _id: new ObjectId(issue.projectId) });

      if (project) {
        console.log('Project Name:', project.name);
        console.log('Project Key:', project.key);
        console.log('Project Members:', project.members?.length || 0);

        if (project.members && project.members.length > 0) {
          console.log('\nMembers:');
          project.members.forEach((member, index) => {
            console.log(`  ${index + 1}. userId:`, member.userId, '- role:', member.role);
          });
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

checkSubIssueDetails();
