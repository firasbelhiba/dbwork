const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://firasbelhiba:7SLCfDKX7Oa0Pv7V@cluster0.n6adw.mongodb.net/workhole?retryWrites=true&w=majority&appName=Cluster0';

async function resetUserAchievements() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find user by email
    const user = await mongoose.connection.db.collection('users').findOne({
      email: 'ala.rom0311@gmail.com'
    });

    if (!user) {
      console.log('User not found with email: ala.rom0311@gmail.com');
      await mongoose.disconnect();
      return;
    }

    console.log('Found user:', {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    // Delete all user achievements for this user
    const deleteResult = await mongoose.connection.db.collection('userachievements').deleteMany({
      userId: user._id.toString()
    });

    console.log(`Deleted ${deleteResult.deletedCount} user achievement records`);

    // Reset user stats
    const updateResult = await mongoose.connection.db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          'stats.issuesCompleted': 0,
          'stats.bugsFixed': 0,
          'stats.totalPoints': 0,
        }
      }
    );

    console.log('Reset user stats:', updateResult.modifiedCount > 0 ? 'Success' : 'No changes');

    console.log('\n✅ User achievements and stats have been reset!');
    console.log('The user can now unlock achievements again from scratch.');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

resetUserAchievements();
