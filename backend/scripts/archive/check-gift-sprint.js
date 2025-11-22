const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dbwork';

async function checkGiftSprint() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const db = client.db();

    // Find GIFT project
    const projectsCollection = db.collection('projects');
    const project = await projectsCollection.findOne({
      name: { $regex: /gift/i }
    });

    if (!project) {
      console.log('❌ GIFT project not found');
      const allProjects = await projectsCollection.find({}).toArray();
      console.log('\nAll projects:');
      allProjects.forEach(p => console.log(`- ${p.name} (ID: ${p._id})`));
      return;
    }

    console.log('✅ Found GIFT project:');
    console.log('Project ID:', project._id);
    console.log('Project ID type:', typeof project._id);
    console.log('Project Name:', project.name);

    // Check for 'test sprint'
    const sprintsCollection = db.collection('sprints');

    const testSprint = await sprintsCollection.findOne({
      name: { $regex: /test.*sprint/i }
    });

    if (testSprint) {
      console.log('\n✅ Found "test sprint":');
      console.log('Sprint ID:', testSprint._id);
      console.log('Sprint Name:', testSprint.name);
      console.log('Project ID in sprint:', testSprint.projectId);
      console.log('Project ID type:', typeof testSprint.projectId);
      console.log('Is ObjectId?', testSprint.projectId instanceof ObjectId);
      console.log('Is String?', typeof testSprint.projectId === 'string');

      console.log('\n--- Comparison ---');
      console.log('GIFT project._id:', project._id);
      console.log('Sprint projectId:', testSprint.projectId);
      console.log('Are they equal (===)?', project._id === testSprint.projectId);
      console.log('Are they equal (.equals())?', project._id.equals ? project._id.equals(testSprint.projectId) : 'N/A');
      console.log('String comparison:', project._id.toString() === testSprint.projectId.toString());
    } else {
      console.log('\n❌ "test sprint" not found');
    }

    // Try to find ALL sprints for GIFT project
    console.log('\n--- Query Tests ---');

    const byObjectId = await sprintsCollection.find({
      projectId: project._id
    }).toArray();

    const byString = await sprintsCollection.find({
      projectId: project._id.toString()
    }).toArray();

    console.log('Sprints found (query by ObjectId):', byObjectId.length);
    if (byObjectId.length > 0) {
      byObjectId.forEach(s => console.log(`  - ${s.name}`));
    }

    console.log('Sprints found (query by string):', byString.length);
    if (byString.length > 0) {
      byString.forEach(s => console.log(`  - ${s.name}`));
    }

    // Show ALL sprints
    const allSprints = await sprintsCollection.find({}).toArray();
    console.log(`\nTotal sprints in database: ${allSprints.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkGiftSprint();
