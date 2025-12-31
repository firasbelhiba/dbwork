const mongoose = require('mongoose');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';

// Users who should get the Team Player achievement
const USERS_TO_GRANT = [
  { email: 'medaziz.benismail@gmail.com', name: 'Med Aziz Ben Ismail' },
  { email: 'jassemtalbi2@gmail.com', name: 'Jassem Talbi' },
  { email: 'takouaguetat@gmail.com', name: 'Takwa Guetat' },
  { email: 'mahfoudhbalkis@gmail.com', name: 'Balkis Mahfoudh' },
  { email: 'heditaieb72@gmail.com', name: 'Hedi Taieb' },
  { email: 'rayenharhouri99@gmail.com', name: 'Rayen Harhouri' },
  { email: 'shiranbenabderrazak@gmail.com', name: 'Shirane Abderazak' },
  { email: 'wiem.jebari@esprit.tn', name: 'Wiem Jebari' },
  { email: 'nadhir@darblockchain.io', name: 'Nadhir BenAbedeltif' },
  { email: 'talel.b@darblockchain.io', name: 'Talel Ben Ghorbel' },
];

async function grantTeamPlayerAchievement() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    const User = mongoose.connection.collection('users');
    const Achievement = mongoose.connection.collection('achievements');
    const UserAchievement = mongoose.connection.collection('userachievements');

    // Find the Team Player achievement
    const teamPlayerAchievement = await Achievement.findOne({ key: 'team_player' });

    if (!teamPlayerAchievement) {
      console.error('Team Player achievement not found in database!');
      process.exit(1);
    }

    console.log(`Found Team Player achievement: ${teamPlayerAchievement.name} (${teamPlayerAchievement.points} pts)`);
    console.log(`Achievement ID: ${teamPlayerAchievement._id}\n`);

    let grantedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    for (const userInfo of USERS_TO_GRANT) {
      console.log(`Processing: ${userInfo.name} (${userInfo.email})...`);

      // Find the user
      const user = await User.findOne({ email: userInfo.email });

      if (!user) {
        console.log(`  ❌ User not found in database`);
        notFoundCount++;
        continue;
      }

      // Check if they already have this achievement
      const existingAchievement = await UserAchievement.findOne({
        userId: user._id,
        achievementId: teamPlayerAchievement._id,
        unlocked: true
      });

      if (existingAchievement) {
        console.log(`  ⏭️  Already has Team Player achievement (unlocked: ${existingAchievement.unlockedAt})`);
        skippedCount++;
        continue;
      }

      // Check if there's an existing record that's not unlocked
      const existingRecord = await UserAchievement.findOne({
        userId: user._id,
        achievementId: teamPlayerAchievement._id
      });

      const now = new Date();

      if (existingRecord) {
        // Update existing record to unlock
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
        console.log(`  ✅ Updated existing record - Team Player UNLOCKED!`);
      } else {
        // Create new user achievement record
        await UserAchievement.insertOne({
          userId: user._id,
          achievementId: teamPlayerAchievement._id,
          unlocked: true,
          unlockedAt: now,
          viewed: false,
          progress: { current: 1, target: 1 },
          createdAt: now,
          updatedAt: now
        });
        console.log(`  ✅ Created new record - Team Player UNLOCKED!`);
      }

      // Update user's total points
      const currentPoints = user.stats?.totalPoints || 0;
      const newPoints = currentPoints + teamPlayerAchievement.points;

      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            'stats.totalPoints': newPoints,
            'stats.projectsAssigned': 1 // Ensure this is set
          }
        }
      );
      console.log(`  📊 Updated points: ${currentPoints} → ${newPoints}`);

      grantedCount++;
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Granted: ${grantedCount} users`);
    console.log(`⏭️  Skipped (already had): ${skippedCount} users`);
    console.log(`❌ Not found: ${notFoundCount} users`);
    console.log(`📊 Total processed: ${USERS_TO_GRANT.length} users`);

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed.');
  }
}

grantTeamPlayerAchievement();
