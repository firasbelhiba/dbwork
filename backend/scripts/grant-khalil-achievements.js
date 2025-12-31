const mongoose = require('mongoose');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';

const USER_EMAIL = 'troudik033@gmail.com';
const ACHIEVEMENTS_TO_GRANT = ['first_steps', 'team_player'];

async function grantAchievements() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    const User = mongoose.connection.collection('users');
    const Achievement = mongoose.connection.collection('achievements');
    const UserAchievement = mongoose.connection.collection('userachievements');

    // Find the user
    const user = await User.findOne({ email: USER_EMAIL });
    if (!user) {
      console.error(`User ${USER_EMAIL} not found!`);
      process.exit(1);
    }

    console.log(`Found user: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`Current points: ${user.stats?.totalPoints || 0}\n`);

    let totalPointsToAdd = 0;

    for (const achievementKey of ACHIEVEMENTS_TO_GRANT) {
      console.log(`Processing: ${achievementKey}...`);

      // Find the achievement
      const achievement = await Achievement.findOne({ key: achievementKey });
      if (!achievement) {
        console.log(`  ❌ Achievement "${achievementKey}" not found`);
        continue;
      }

      // Check if already unlocked
      const existing = await UserAchievement.findOne({
        userId: user._id,
        achievementId: achievement._id,
        unlocked: true
      });

      if (existing) {
        console.log(`  ⏭️  Already has ${achievement.name}`);
        continue;
      }

      const now = new Date();

      // Check for existing record
      const existingRecord = await UserAchievement.findOne({
        userId: user._id,
        achievementId: achievement._id
      });

      if (existingRecord) {
        await UserAchievement.updateOne(
          { _id: existingRecord._id },
          {
            $set: {
              unlocked: true,
              unlockedAt: now,
              viewed: false,
              progress: { current: 1, target: 1 }
            }
          }
        );
      } else {
        await UserAchievement.insertOne({
          userId: user._id,
          achievementId: achievement._id,
          unlocked: true,
          unlockedAt: now,
          viewed: false,
          progress: { current: 1, target: 1 },
          createdAt: now,
          updatedAt: now
        });
      }

      console.log(`  ✅ ${achievement.name} UNLOCKED! (+${achievement.points} pts)`);
      totalPointsToAdd += achievement.points;
    }

    // Update user's total points
    if (totalPointsToAdd > 0) {
      const currentPoints = user.stats?.totalPoints || 0;
      const newPoints = currentPoints + totalPointsToAdd;

      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            'stats.totalPoints': newPoints,
            'stats.issuesCompleted': 2,
            'stats.projectsAssigned': 2
          }
        }
      );

      console.log(`\n📊 Points updated: ${currentPoints} → ${newPoints} (+${totalPointsToAdd})`);
    }

    console.log('\n✅ Done!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
}

grantAchievements();
