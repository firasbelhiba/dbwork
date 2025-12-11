// Emergency script to resume ALL paused timers for in_progress issues
// This fixes the issue where timers weren't auto-resumed at 9 AM
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function emergencyResumeAllTimers() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found in environment');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const db = client.db();
    const issues = db.collection('issues');
    const now = new Date();

    // Find ALL in_progress issues with paused timers (regardless of autoPausedEndOfDay flag)
    const pausedTimers = await issues.find({
      status: 'in_progress',
      'timeTracking.activeTimeEntry': { $ne: null },
      'timeTracking.activeTimeEntry.isPaused': true,
    }).toArray();

    console.log(`Found ${pausedTimers.length} in_progress issues with paused timers\n`);

    let resumedCount = 0;
    let errorCount = 0;

    for (const issue of pausedTimers) {
      const entry = issue.timeTracking?.activeTimeEntry;
      if (!entry) continue;

      try {
        // Calculate pause duration and add to accumulated
        const pausedAt = entry.pausedAt ? new Date(entry.pausedAt) : now;
        const pauseDuration = Math.floor((now.getTime() - pausedAt.getTime()) / 1000);
        const newAccumulatedPausedTime = (entry.accumulatedPausedTime || 0) + pauseDuration;

        // Resume the timer
        await issues.updateOne(
          { _id: issue._id },
          {
            $set: {
              'timeTracking.activeTimeEntry.isPaused': false,
              'timeTracking.activeTimeEntry.pausedAt': null,
              'timeTracking.activeTimeEntry.accumulatedPausedTime': newAccumulatedPausedTime,
              'timeTracking.activeTimeEntry.lastActivityAt': now,
              'timeTracking.activeTimeEntry.autoPausedEndOfDay': false,
              'timeTracking.activeTimeEntry.isExtraHours': false,
            },
          }
        );

        resumedCount++;
        console.log(`✓ Resumed timer for ${issue.key} (user: ${entry.userId})`);
      } catch (error) {
        errorCount++;
        console.error(`✗ Failed to resume timer for ${issue.key}: ${error.message}`);
      }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Resumed: ${resumedCount} timers`);
    console.log(`Errors: ${errorCount}`);
    console.log(`\nAll in_progress issues with paused timers have been resumed!`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

emergencyResumeAllTimers();
