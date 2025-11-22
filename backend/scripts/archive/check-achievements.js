const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://firasbelhiba:7SLCfDKX7Oa0Pv7V@cluster0.n6adw.mongodb.net/workhole?retryWrites=true&w=majority&appName=Cluster0';

async function checkAchievements() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all users with their stats
    const users = await mongoose.connection.db.collection('users').find({}, {
      projection: { email: 1, firstName: 1, lastName: 1, stats: 1 }
    }).toArray();

    console.log('\n=== USER STATS ===');
    users.forEach(user => {
      console.log(`\nUser: ${user.firstName} ${user.lastName} (${user.email})`);
      console.log(`Issues Completed: ${user.stats?.issuesCompleted || 0}`);
      console.log(`Bugs Fixed: ${user.stats?.bugsFixed || 0}`);
    });

    // Get all achievements
    const achievements = await mongoose.connection.db.collection('achievements').find({}).toArray();
    console.log('\n\n=== ALL ACHIEVEMENTS ===');
    achievements.forEach(ach => {
      console.log(`${ach.icon} ${ach.name} - ${ach.description}`);
      console.log(`  Category: ${ach.category}, Points: ${ach.points}`);
      console.log(`  Criteria: ${JSON.stringify(ach.criteria)}`);
    });

    // Get user achievements for each user
    console.log('\n\n=== USER ACHIEVEMENTS ===');
    for (const user of users) {
      const userAchievements = await mongoose.connection.db.collection('userachievements').find({
        userId: user._id.toString()
      }).toArray();

      console.log(`\n${user.firstName} ${user.lastName}:`);
      if (userAchievements.length === 0) {
        console.log('  No user achievement records found!');
      } else {
        userAchievements.forEach(ua => {
          console.log(`  Achievement ID: ${ua.achievementId}`);
          console.log(`    Unlocked: ${ua.unlocked}, Progress: ${ua.progress || 0}/${ua.maxProgress || '?'}`);
        });
      }
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAchievements();
