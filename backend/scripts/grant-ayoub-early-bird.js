const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const ACHIEVEMENT_KEY = 'early_bird';

async function grantAchievement() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    const User = mongoose.connection.collection('users');
    const Achievement = mongoose.connection.collection('achievements');
    const UserAchievement = mongoose.connection.collection('userachievements');

    // Find Ayoub
    const user = await User.findOne({
      $or: [
        { firstName: { $regex: /ayoub/i } },
        { lastName: { $regex: /ayoub/i } },
        { email: { $regex: /ayoub/i } }
      ]
    });

    if (!user) {
      console.error('User Ayoub not found!');
      process.exit(1);
    }

    console.log(`Found user: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`Current points: ${user.stats?.totalPoints || 0}\n`);

    // Find the achievement
    const achievement = await Achievement.findOne({ key: ACHIEVEMENT_KEY });
    if (!achievement) {
      console.error(`Achievement "${ACHIEVEMENT_KEY}" not found!`);
      process.exit(1);
    }

    console.log(`Achievement: ${achievement.name} (${achievement.points} pts)`);

    // Check if already unlocked
    const existing = await UserAchievement.findOne({
      userId: user._id,
      achievementId: achievement._id,
      unlocked: true
    });

    if (existing) {
      console.log(`\n⏭️  ${user.firstName} already has ${achievement.name}`);
      process.exit(0);
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

    // Update user's total points
    const currentPoints = user.stats?.totalPoints || 0;
    const newPoints = currentPoints + achievement.points;

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          'stats.totalPoints': newPoints
        }
      }
    );

    console.log(`\n✅ ${achievement.name} UNLOCKED for ${user.firstName}!`);
    console.log(`📊 Points: ${currentPoints} → ${newPoints} (+${achievement.points})`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed.');
  }
}

grantAchievement();
