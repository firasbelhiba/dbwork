const { MongoClient, ObjectId } = require('mongodb');

async function checkStatusMismatch() {
  const client = new MongoClient('mongodb+srv://voodooooboy_db_user:3WtPNaCOrk0q0BVO@cluster0.lpetngj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('dar-pm');
    const issues = db.collection('issues');
    const projects = db.collection('projects');

    const projectId = '68ff80126d57d8e73e9f839f';

    // Get the project to see custom statuses
    const project = await projects.findOne({ _id: new ObjectId(projectId) });

    if (project && project.customStatuses) {
      console.log('\n--- Project Custom Statuses ---');
      project.customStatuses.forEach(status => {
        console.log(`ID: ${status.id}, Name: ${status.name}`);
      });
    }

    // Get the archived issue
    const archivedIssue = await issues.findOne({
      projectId: new ObjectId(projectId),
      isArchived: true
    });

    if (archivedIssue) {
      console.log('\n--- Archived Issue ---');
      console.log('Key:', archivedIssue.key);
      console.log('Status:', archivedIssue.status);
      console.log('Status Type:', typeof archivedIssue.status);

      // Check if this status matches any custom status
      if (project && project.customStatuses) {
        const matchingStatus = project.customStatuses.find(s => s.id === archivedIssue.status);
        if (matchingStatus) {
          console.log('✓ Status matches custom status:', matchingStatus.name);
        } else {
          console.log('✗ Status does NOT match any custom status!');
          console.log('  This might cause the issue to not appear in any column');
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkStatusMismatch();
