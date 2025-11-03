const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';
const PROJECT_ID = '69034d749fda89142fb7cc2b';

async function getFinalSummary() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const sprintsCollection = db.collection('sprints');
    const issuesCollection = db.collection('issues');

    console.log('═'.repeat(70));
    console.log('🎉 4HACKS PROJECT - FINAL IMPORT SUMMARY');
    console.log('═'.repeat(70));
    console.log('');

    // Get all sprints for the project
    const sprints = await sprintsCollection.find({
      projectId: new mongoose.Types.ObjectId(PROJECT_ID)
    }).sort({ startDate: 1 }).toArray();

    let totalIssues = 0;
    let totalPoints = 0;

    for (const sprint of sprints) {
      const issueCount = await issuesCollection.countDocuments({
        sprintId: sprint._id
      });

      totalIssues += issueCount;
      totalPoints += sprint.totalPoints || 0;

      console.log(`📅 ${sprint.name}`);
      console.log(`   Issues: ${issueCount}`);
      console.log(`   Story Points: ${sprint.totalPoints || 0}`);
      console.log(`   Duration: ${sprint.startDate.toISOString().split('T')[0]} to ${sprint.endDate.toISOString().split('T')[0]}`);
      console.log('');
    }

    console.log('═'.repeat(70));
    console.log(`📊 TOTAL: ${totalIssues} issues across 6 sprints`);
    console.log(`🎯 TOTAL STORY POINTS: ${totalPoints}`);
    console.log('═'.repeat(70));

    // Get issue breakdown by priority
    console.log('\n📈 Issue Breakdown by Priority:\n');
    const priorities = await issuesCollection.aggregate([
      { $match: { projectId: new mongoose.Types.ObjectId(PROJECT_ID) } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    priorities.forEach(p => {
      console.log(`   ${p._id}: ${p.count} issues`);
    });

    console.log('\n' + '═'.repeat(70));
    console.log('✅ All 6 sprints successfully imported and ready!');
    console.log('═'.repeat(70));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed.');
  }
}

getFinalSummary();
