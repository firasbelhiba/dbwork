const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';
const PROJECT_ID = '69034d749fda89142fb7cc2b';

// The correct sprint IDs to keep (from create-sprints-and-update-json.js)
const CORRECT_SPRINT_IDS = [
  '6908a34f4e02fa9ee678bde9', // Sprint 1
  '6908a34f4e02fa9ee678bdec', // Sprint 2
  '6908a34f4e02fa9ee678bdef', // Sprint 3
  '6908a34f4e02fa9ee678bdf2', // Sprint 4
  '6908a34f4e02fa9ee678bdf5', // Sprint 5
  '6908a34f4e02fa9ee678bdf8', // Sprint 6
];

async function cleanupDuplicateSprints() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const sprintsCollection = db.collection('sprints');
    const issuesCollection = db.collection('issues');

    // Find all sprints for the project
    const allSprints = await sprintsCollection.find({
      projectId: new mongoose.Types.ObjectId(PROJECT_ID)
    }).toArray();

    console.log(`📋 Found ${allSprints.length} total sprints for project\n`);

    // Identify duplicates (sprints NOT in the correct list)
    const duplicateSprints = allSprints.filter(sprint =>
      !CORRECT_SPRINT_IDS.includes(sprint._id.toString())
    );

    console.log(`🗑️  Found ${duplicateSprints.length} duplicate sprints to remove:\n`);

    if (duplicateSprints.length === 0) {
      console.log('✅ No duplicates found! Database is clean.');
      return;
    }

    duplicateSprints.forEach(sprint => {
      console.log(`  - ${sprint.name} (${sprint._id})`);
    });

    console.log('\n📝 Moving issues from duplicate sprints to correct sprints...\n');

    // Map duplicate sprint names to correct sprint IDs
    const sprintNameToCorrectId = {
      'Sprint 1: User Management & Authentication': '6908a34f4e02fa9ee678bde9',
      'Sprint 2: Hackathon Creation & Management': '6908a34f4e02fa9ee678bdec',
      'Sprint 3: Registration & Team Management': '6908a34f4e02fa9ee678bdef',
      'Sprint 4: Project Submission & Showcase': '6908a34f4e02fa9ee678bdf2',
      'Sprint 5: Judging System': '6908a34f4e02fa9ee678bdf5',
      'Sprint 6: Communication & Community': '6908a34f4e02fa9ee678bdf8',
    };

    // For each duplicate sprint, reassign its issues to the correct sprint
    for (const dupSprint of duplicateSprints) {
      const correctSprintId = sprintNameToCorrectId[dupSprint.name];

      if (correctSprintId) {
        // Find issues assigned to the duplicate sprint
        const issues = await issuesCollection.find({
          sprintId: dupSprint._id
        }).toArray();

        console.log(`  Moving ${issues.length} issues from duplicate ${dupSprint.name}...`);

        // Update issues to point to correct sprint
        if (issues.length > 0) {
          await issuesCollection.updateMany(
            { sprintId: dupSprint._id },
            { $set: { sprintId: new mongoose.Types.ObjectId(correctSprintId) } }
          );

          // Update the correct sprint's issues array and totalPoints
          const issueIds = issues.map(i => i._id);
          const totalPoints = issues.reduce((sum, i) => sum + (i.storyPoints || 0), 0);

          await sprintsCollection.updateOne(
            { _id: new mongoose.Types.ObjectId(correctSprintId) },
            {
              $addToSet: { issues: { $each: issueIds } },
              $inc: { totalPoints: totalPoints }
            }
          );
        }
      }
    }

    console.log('\n🗑️  Deleting duplicate sprints...\n');

    // Delete duplicate sprints
    const duplicateIds = duplicateSprints.map(s => s._id);
    const deleteResult = await sprintsCollection.deleteMany({
      _id: { $in: duplicateIds }
    });

    console.log(`✅ Deleted ${deleteResult.deletedCount} duplicate sprints\n`);

    // Verify final state
    console.log('📊 Final Sprint Summary:\n');
    const finalSprints = await sprintsCollection.find({
      projectId: new mongoose.Types.ObjectId(PROJECT_ID)
    }).sort({ startDate: 1 }).toArray();

    for (const sprint of finalSprints) {
      const issueCount = await issuesCollection.countDocuments({
        sprintId: sprint._id
      });

      console.log(`✓ ${sprint.name}`);
      console.log(`  ID: ${sprint._id}`);
      console.log(`  Issues: ${issueCount}`);
      console.log(`  Story Points: ${sprint.totalPoints || 0}`);
      console.log('');
    }

    console.log('═'.repeat(60));
    console.log('✅ Cleanup completed successfully!');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed.');
  }
}

cleanupDuplicateSprints();
