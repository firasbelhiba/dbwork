const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function resumeAllPausedTimers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    const Issue = mongoose.connection.collection('issues');
    const now = new Date();

    // Find all in_progress issues with paused timers
    const pausedIssues = await Issue.find({
      status: 'in_progress',
      isArchived: { $ne: true },
      'timeTracking.activeTimeEntry': { $ne: null },
      'timeTracking.activeTimeEntry.isPaused': true,
    }).toArray();

    console.log(`Found ${pausedIssues.length} in_progress issues with paused timers\n`);

    let resumedCount = 0;
    for (const issue of pausedIssues) {
      const activeEntry = issue.timeTracking?.activeTimeEntry;
      if (!activeEntry) continue;

      // Calculate pause duration
      const pausedAt = new Date(activeEntry.pausedAt || now);
      const pauseDuration = Math.floor((now.getTime() - pausedAt.getTime()) / 1000);
      const newAccumulatedPausedTime = (activeEntry.accumulatedPausedTime || 0) + pauseDuration;

      // Resume the timer
      await Issue.updateOne(
        { _id: issue._id },
        {
          $set: {
            'timeTracking.activeTimeEntry.isPaused': false,
            'timeTracking.activeTimeEntry.pausedAt': null,
            'timeTracking.activeTimeEntry.accumulatedPausedTime': newAccumulatedPausedTime,
            'timeTracking.activeTimeEntry.lastActivityAt': now,
          },
        }
      );

      console.log(`✅ Resumed timer for ${issue.key}`);
      console.log(`   - Was paused for: ${Math.round(pauseDuration / 60)} minutes`);
      console.log(`   - Total paused time: ${Math.round(newAccumulatedPausedTime / 60)} minutes\n`);
      resumedCount++;
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Total resumed: ${resumedCount} timers`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed.');
  }
}

resumeAllPausedTimers();
