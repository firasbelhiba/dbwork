const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';
const PROJECT_ID = '69034d749fda89142fb7cc2b';

async function checkSprints() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const sprintsCollection = db.collection('sprints');

    // Find all sprints for the project
    const sprints = await sprintsCollection.find({
      projectId: new mongoose.Types.ObjectId(PROJECT_ID)
    }).toArray();

    console.log(`📅 Found ${sprints.length} sprints for project ${PROJECT_ID}\n`);

    if (sprints.length > 0) {
      sprints.forEach((sprint, index) => {
        console.log(`${index + 1}. ${sprint.name}`);
        console.log(`   ID: ${sprint._id}`);
        console.log(`   Status: ${sprint.status}`);
        console.log(`   Start: ${sprint.startDate}`);
        console.log(`   End: ${sprint.endDate}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No sprints found!');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed.');
  }
}

checkSprints();
