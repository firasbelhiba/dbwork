const { MongoClient } = require('mongodb');

async function findTache2() {
  const client = new MongoClient('mongodb+srv://voodooooboy_db_user:3WtPNaCOrk0q0BVO@cluster0.lpetngj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('dar-pm');
    const issues = db.collection('issues');

    // Find the issue with title containing "Tâche 2"
    const issue = await issues.findOne({ title: /Tâche 2/i });

    if (issue) {
      console.log('\n=== Found "Tâche 2" Issue ===');
      console.log('ID:', issue._id);
      console.log('Title:', issue.title);
      console.log('Status:', issue.status);
      console.log('Status Type:', typeof issue.status);
      console.log('Project ID:', issue.projectId);
      console.log('Is Archived:', issue.isArchived);
      console.log('\nFull Issue:');
      console.log(JSON.stringify(issue, null, 2));

      // Now check if this status exists in the project's custom statuses
      const projects = db.collection('projects');
      const project = await projects.findOne({ _id: issue.projectId });

      if (project) {
        console.log('\n=== Project Custom Statuses ===');
        console.log('Project Name:', project.name);
        console.log('Custom Statuses:', JSON.stringify(project.customStatuses, null, 2));

        const statusExists = project.customStatuses?.some(s => s.id === issue.status);
        console.log('\n⚠️  Status Exists in Project:', statusExists);

        if (!statusExists) {
          console.log('❌ PROBLEM: Issue has status "' + issue.status + '" but this column does not exist in the project!');
          console.log('Available column IDs:', project.customStatuses?.map(s => s.id).join(', '));
        }
      }
    } else {
      console.log('❌ Issue "Tâche 2" not found');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

findTache2();
