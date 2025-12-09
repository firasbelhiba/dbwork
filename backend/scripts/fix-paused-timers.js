const mongoose = require('mongoose');
require('dotenv').config();

async function fixPausedTimers() {
  await mongoose.connect(process.env.MONGODB_URI);
  const now = new Date();

  console.log('=== FIXING PAUSED TIMERS ===');
  console.log('Current time:', now.toISOString());
  console.log('');

  // Find all issues with paused active time entries where issue is in_progress
  const issues = await mongoose.connection.db.collection('issues').find({
    status: 'in_progress',
    'timeTracking.activeTimeEntry': { $ne: null },
    'timeTracking.activeTimeEntry.isPaused': true
  }).toArray();

  console.log('Found', issues.length, 'in_progress issues with paused timers');
  console.log('');

  for (const issue of issues) {
    const entry = issue.timeTracking?.activeTimeEntry;
    if (!entry) continue;

    // Calculate how long the timer was paused
    const pausedAt = new Date(entry.pausedAt);
    const pauseDuration = Math.floor((now.getTime() - pausedAt.getTime()) / 1000);
    const newAccumulatedPausedTime = (entry.accumulatedPausedTime || 0) + pauseDuration;

    console.log('Resuming timer for:', issue.key);
    console.log('  User:', entry.userId);
    console.log('  Was paused at:', entry.pausedAt);
    console.log('  Pause duration:', pauseDuration, 'seconds (', (pauseDuration / 3600).toFixed(2), 'hours)');
    console.log('  New accumulated paused time:', newAccumulatedPausedTime, 'seconds');

    // Update the issue to unpause the timer
    await mongoose.connection.db.collection('issues').updateOne(
      { _id: issue._id },
      {
        $set: {
          'timeTracking.activeTimeEntry.isPaused': false,
          'timeTracking.activeTimeEntry.pausedAt': null,
          'timeTracking.activeTimeEntry.accumulatedPausedTime': newAccumulatedPausedTime,
          'timeTracking.activeTimeEntry.lastActivityAt': now,
          'timeTracking.activeTimeEntry.autoPausedEndOfDay': false
        }
      }
    );

    console.log('  ✓ Timer resumed!');
    console.log('');
  }

  // Also handle the issue TAI-41 which has status 'todo' but has an active timer
  // This is inconsistent - let's clear that timer
  const todoWithTimer = await mongoose.connection.db.collection('issues').find({
    status: { $ne: 'in_progress' },
    'timeTracking.activeTimeEntry': { $ne: null }
  }).toArray();

  if (todoWithTimer.length > 0) {
    console.log('=== ISSUES WITH TIMER BUT NOT IN_PROGRESS ===');
    console.log('These have timers but are not in_progress status - timer should be paused');
    for (const issue of todoWithTimer) {
      console.log('  -', issue.key, '(status:', issue.status + ')');
      // Ensure these are paused since the issue is not in_progress
      if (!issue.timeTracking?.activeTimeEntry?.isPaused) {
        await mongoose.connection.db.collection('issues').updateOne(
          { _id: issue._id },
          {
            $set: {
              'timeTracking.activeTimeEntry.isPaused': true,
              'timeTracking.activeTimeEntry.pausedAt': now
            }
          }
        );
        console.log('    → Paused (issue not in_progress)');
      }
    }
  }

  console.log('');
  console.log('=== DONE ===');
  console.log('All in_progress timers have been resumed!');
  console.log('Timers will now count. Users can see the running counter on their issue cards.');

  await mongoose.disconnect();
}

fixPausedTimers().catch(console.error);
