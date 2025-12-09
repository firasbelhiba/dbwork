const mongoose = require('mongoose');
require('dotenv').config();

async function startAllTimers() {
  await mongoose.connect(process.env.MONGODB_URI);
  const now = new Date();
  console.log('EMERGENCY FIX - Starting all timers at:', now.toISOString());

  // Find ALL in_progress issues
  const issues = await mongoose.connection.db.collection('issues').find({
    status: 'in_progress'
  }).toArray();

  console.log('Found', issues.length, 'in_progress issues');
  console.log('');

  let started = 0;
  let resumed = 0;
  let alreadyRunning = 0;

  for (const issue of issues) {
    const hasTimer = issue.timeTracking?.activeTimeEntry;
    const isPaused = hasTimer?.isPaused;

    // Get first assignee
    let userId = null;
    if (issue.assignees && issue.assignees.length > 0) {
      const first = issue.assignees[0];
      userId = first._id ? first._id.toString() : first.toString();
    }

    if (!userId) {
      console.log('SKIP', issue.key, '- no assignee');
      continue;
    }

    if (!hasTimer) {
      // Start new timer
      const entry = {
        id: new mongoose.Types.ObjectId().toString(),
        userId: userId,
        startTime: now,
        lastActivityAt: now,
        isPaused: false,
        accumulatedPausedTime: 0
      };
      await mongoose.connection.db.collection('issues').updateOne(
        { _id: issue._id },
        { $set: { 'timeTracking.activeTimeEntry': entry } }
      );
      console.log('STARTED', issue.key, '- new timer for user', userId);
      started++;
    } else if (isPaused) {
      // Resume paused timer
      const pausedAt = new Date(hasTimer.pausedAt || now);
      const pauseDuration = Math.floor((now.getTime() - pausedAt.getTime()) / 1000);
      const newAccum = (hasTimer.accumulatedPausedTime || 0) + pauseDuration;

      await mongoose.connection.db.collection('issues').updateOne(
        { _id: issue._id },
        { $set: {
          'timeTracking.activeTimeEntry.isPaused': false,
          'timeTracking.activeTimeEntry.pausedAt': null,
          'timeTracking.activeTimeEntry.accumulatedPausedTime': newAccum,
          'timeTracking.activeTimeEntry.lastActivityAt': now
        }}
      );
      console.log('RESUMED', issue.key, '- was paused for', Math.round(pauseDuration/60), 'minutes');
      resumed++;
    } else {
      console.log('OK', issue.key, '- already running');
      alreadyRunning++;
    }
  }

  console.log('');
  console.log('========================================');
  console.log('DONE!');
  console.log('Started new timers:', started);
  console.log('Resumed paused timers:', resumed);
  console.log('Already running:', alreadyRunning);
  console.log('========================================');
  console.log('All in_progress issue timers are now RUNNING!');

  await mongoose.disconnect();
}

startAllTimers().catch(console.error);
