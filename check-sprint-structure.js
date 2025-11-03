const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';
const PROJECT_ID = '69034d749fda89142fb7cc2b';

async function checkSprintStructure() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const sprintsCollection = db.collection('sprints');

    // Get one sprint to check its structure
    const sprint = await sprintsCollection.findOne({});

    if (!sprint) {
      console.log('⚠️  No sprints found in database!');
      return;
    }

    console.log('📋 Sprint Structure:');
    console.log(JSON.stringify(sprint, null, 2));
    console.log('\n');

    console.log('🔍 projectId type:', typeof sprint.projectId);
    console.log('🔍 projectId value:', sprint.projectId);
    console.log('🔍 Is ObjectId?:', sprint.projectId instanceof mongoose.Types.ObjectId);
    console.log('\n');

    // Try different query methods
    console.log('Testing different query methods:\n');

    // Method 1: String comparison
    const count1 = await sprintsCollection.countDocuments({ projectId: PROJECT_ID });
    console.log(`1. String match (projectId: "${PROJECT_ID}"): ${count1} sprints`);

    // Method 2: ObjectId comparison
    const count2 = await sprintsCollection.countDocuments({
      projectId: new mongoose.Types.ObjectId(PROJECT_ID)
    });
    console.log(`2. ObjectId match (projectId: ObjectId("${PROJECT_ID}")): ${count2} sprints`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed.');
  }
}

checkSprintStructure();
