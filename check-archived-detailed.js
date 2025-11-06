const { MongoClient, ObjectId } = require('mongodb');

async function checkArchived() {
  const client = new MongoClient('mongodb+srv://voodooooboy_db_user:3WtPNaCOrk0q0BVO@cluster0.lpetngj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('dar-pm');
    const issues = db.collection('issues');

    // Find the archived issue
    const archivedIssue = await issues.findOne({ isArchived: true });

    if (archivedIssue) {
      console.log('\n--- Archived Issue Details ---');
      console.log('ID:', archivedIssue._id);
      console.log('Key:', archivedIssue.key);
      console.log('Title:', archivedIssue.title);
      console.log('Status:', archivedIssue.status);
      console.log('ProjectId:', archivedIssue.projectId);
      console.log('isArchived:', archivedIssue.isArchived);

      // Check if this project ID matches the one in the logs: 68ff80126d57d8e73e9f839f
      const projectIdFromLogs = '68ff80126d57d8e73e9f839f';
      const matches = archivedIssue.projectId.toString() === projectIdFromLogs;
      console.log('\nDoes this issue belong to project 68ff80126d57d8e73e9f839f?', matches);

      // Count issues for this project
      const projectIssuesCount = await issues.countDocuments({
        projectId: new ObjectId(projectIdFromLogs)
      });
      console.log('Total issues for this project:', projectIssuesCount);

      const projectArchivedCount = await issues.countDocuments({
        projectId: new ObjectId(projectIdFromLogs),
        isArchived: true
      });
      console.log('Archived issues for this project:', projectArchivedCount);
    } else {
      console.log('No archived issues found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkArchived();
