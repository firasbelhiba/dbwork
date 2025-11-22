const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dbwork';

async function checkTalentAISprints() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const db = client.db();

    // Find Talent AI project
    const projectsCollection = db.collection('projects');
    const project = await projectsCollection.findOne({
      name: { $regex: /talent.*ai/i }
    });

    if (!project) {
      console.log('❌ Talent AI project not found');

      // List all projects
      const allProjects = await projectsCollection.find({}).toArray();
      console.log('\nAll projects in database:');
      allProjects.forEach(p => {
        console.log(`- ${p.name} (ID: ${p._id})`);
      });
      return;
    }

    console.log('✅ Found Talent AI project:');
    console.log('Project ID:', project._id);
    console.log('Project Name:', project.name);
    console.log('Project Key:', project.key);

    // Check sprints for this project
    const sprintsCollection = db.collection('sprints');

    // Try both string and ObjectId
    const sprintsByString = await sprintsCollection.find({
      projectId: project._id.toString()
    }).toArray();

    const sprintsByObjectId = await sprintsCollection.find({
      projectId: project._id
    }).toArray();

    console.log('\n--- Sprint Query Results ---');
    console.log('Sprints found (projectId as string):', sprintsByString.length);
    console.log('Sprints found (projectId as ObjectId):', sprintsByObjectId.length);

    if (sprintsByObjectId.length > 0) {
      console.log('\n✅ Sprints found for Talent AI:');
      sprintsByObjectId.forEach(sprint => {
        console.log(`\n- Sprint: ${sprint.name}`);
        console.log(`  ID: ${sprint._id}`);
        console.log(`  Status: ${sprint.status}`);
        console.log(`  Project ID: ${sprint.projectId}`);
        console.log(`  Project ID type: ${typeof sprint.projectId}`);
        console.log(`  Is ObjectId? ${sprint.projectId instanceof ObjectId}`);
        console.log(`  Start: ${sprint.startDate}`);
        console.log(`  End: ${sprint.endDate}`);
      });
    } else {
      console.log('\n❌ No sprints found for Talent AI project');

      // Check all sprints
      const allSprints = await sprintsCollection.find({}).toArray();
      console.log(`\nTotal sprints in database: ${allSprints.length}`);

      if (allSprints.length > 0) {
        console.log('\nAll sprints:');
        allSprints.forEach(sprint => {
          console.log(`- ${sprint.name} (projectId: ${sprint.projectId}, type: ${typeof sprint.projectId})`);
        });
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkTalentAISprints();
