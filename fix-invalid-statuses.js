const { MongoClient } = require('mongodb');

async function fixInvalidStatuses() {
  const client = new MongoClient('mongodb+srv://voodooooboy_db_user:3WtPNaCOrk0q0BVO@cluster0.lpetngj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('dar-pm');
    const issues = db.collection('issues');
    const projects = db.collection('projects');

    // Get all projects
    const allProjects = await projects.find({}).toArray();
    console.log(`\nFound ${allProjects.length} projects`);

    let totalFixed = 0;
    let totalOrphaned = 0;

    for (const project of allProjects) {
      console.log(`\n=== Checking Project: ${project.name} ===`);

      const validStatusIds = project.customStatuses?.map(s => s.id) || [];
      console.log('Valid status IDs:', validStatusIds.join(', '));

      // Find all issues for this project
      const projectIssues = await issues.find({ projectId: project._id }).toArray();
      console.log(`Total issues: ${projectIssues.length}`);

      // Find issues with invalid statuses
      const orphanedIssues = projectIssues.filter(issue => {
        return !validStatusIds.includes(issue.status);
      });

      if (orphanedIssues.length > 0) {
        console.log(`\n⚠️  Found ${orphanedIssues.length} issues with invalid statuses:`);

        for (const issue of orphanedIssues) {
          console.log(`  - ${issue.key}: "${issue.title}" (status: ${issue.status})`);

          // Fix by setting to "todo" (the default first column)
          const todoStatus = validStatusIds[0] || 'todo';

          await issues.updateOne(
            { _id: issue._id },
            {
              $set: { status: todoStatus },
              $currentDate: { updatedAt: true }
            }
          );

          console.log(`    ✅ Fixed! Set status to "${todoStatus}"`);
          totalFixed++;
        }

        totalOrphaned += orphanedIssues.length;
      } else {
        console.log('✅ All issues have valid statuses');
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Total orphaned issues found: ${totalOrphaned}`);
    console.log(`Total issues fixed: ${totalFixed}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

fixInvalidStatuses();
