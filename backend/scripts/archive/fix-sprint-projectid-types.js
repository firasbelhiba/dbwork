const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dbwork';

async function fixSprintProjectIdTypes() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const db = client.db();
    const sprintsCollection = db.collection('sprints');

    // Find all sprints with string projectId
    const sprintsWithStringProjectId = await sprintsCollection.find({
      projectId: { $type: 'string' }
    }).toArray();

    console.log(`Found ${sprintsWithStringProjectId.length} sprints with string projectId\n`);

    if (sprintsWithStringProjectId.length === 0) {
      console.log('✅ All sprints already have ObjectId projectId');
      return;
    }

    let fixed = 0;
    let errors = 0;

    for (const sprint of sprintsWithStringProjectId) {
      try {
        const projectIdString = sprint.projectId;

        // Validate it's a valid ObjectId string
        if (!ObjectId.isValid(projectIdString)) {
          console.log(`⚠️  Sprint "${sprint.name}" (${sprint._id}) has invalid projectId: ${projectIdString}`);
          errors++;
          continue;
        }

        // Convert to ObjectId
        const result = await sprintsCollection.updateOne(
          { _id: sprint._id },
          { $set: { projectId: new ObjectId(projectIdString) } }
        );

        if (result.modifiedCount === 1) {
          console.log(`✅ Fixed sprint "${sprint.name}" - converted projectId from string to ObjectId`);
          fixed++;
        }
      } catch (error) {
        console.error(`❌ Error fixing sprint "${sprint.name}":`, error.message);
        errors++;
      }
    }

    console.log(`\n=== Migration Complete ===`);
    console.log(`Fixed: ${fixed} sprints`);
    console.log(`Errors: ${errors}`);

    // Verify the fix
    const remaining = await sprintsCollection.countDocuments({
      projectId: { $type: 'string' }
    });

    console.log(`\nRemaining sprints with string projectId: ${remaining}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixSprintProjectIdTypes();
