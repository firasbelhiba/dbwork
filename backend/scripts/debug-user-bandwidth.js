const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function debugUserBandwidth() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    const Issue = mongoose.connection.collection('issues');
    const User = mongoose.connection.collection('users');

    // Find Talel
    const talel = await User.findOne({
      $or: [
        { firstName: { $regex: /talel/i } },
        { lastName: { $regex: /talel/i } }
      ]
    });

    if (!talel) {
      console.log('Could not find user Talel');
      return;
    }

    const userId = talel._id.toString();
    console.log(`Found user: ${talel.firstName} ${talel.lastName} (${userId})\n`);

    // Get today's date range
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    console.log(`Today: ${todayStart.toISOString()} to ${todayEnd.toISOString()}\n`);

    // Get all issues with time entries for this user
    const issues = await Issue.find({
      $or: [
        { 'timeTracking.timeEntries.userId': userId },
        { 'timeTracking.activeTimeEntry.userId': userId },
      ],
    }).toArray();

    console.log(`Found ${issues.length} issues with time tracking for this user\n`);

    let dailySecondsFromCompleted = 0;
    const completedTodayEntries = [];
    const activeTimers = [];

    for (const issue of issues) {
      const timeEntries = issue.timeTracking?.timeEntries || [];

      // Check completed time entries for today
      for (const entry of timeEntries) {
        if (entry.userId !== userId) continue;

        const entryDate = new Date(entry.startTime);
        if (entryDate >= todayStart && entryDate <= todayEnd) {
          const duration = entry.duration || 0;
          dailySecondsFromCompleted += duration;
          completedTodayEntries.push({
            issueKey: issue.key,
            startTime: entry.startTime,
            duration: duration,
            durationHours: (duration / 3600).toFixed(2),
          });
        }
      }

      // Collect active timers
      const activeEntry = issue.timeTracking?.activeTimeEntry;
      if (activeEntry && activeEntry.userId === userId) {
        activeTimers.push({
          issueKey: issue.key,
          issueTitle: issue.title,
          startTime: activeEntry.startTime,
          isPaused: activeEntry.isPaused || false,
          pausedAt: activeEntry.pausedAt,
          accumulatedPausedTime: activeEntry.accumulatedPausedTime || 0,
        });
      }
    }

    console.log('=== COMPLETED TIME ENTRIES FOR TODAY ===');
    if (completedTodayEntries.length === 0) {
      console.log('No completed time entries for today');
    } else {
      for (const entry of completedTodayEntries) {
        console.log(`${entry.issueKey}: ${entry.durationHours}h (${entry.duration}s) - started ${entry.startTime}`);
      }
    }
    console.log(`\nTotal from completed entries: ${(dailySecondsFromCompleted / 3600).toFixed(2)}h\n`);

    console.log('=== ALL ACTIVE TIMERS ===');
    if (activeTimers.length === 0) {
      console.log('No active timers');
    } else {
      for (const timer of activeTimers) {
        console.log(`${timer.issueKey}: ${timer.isPaused ? 'PAUSED' : 'RUNNING'}`);
        console.log(`  Title: ${timer.issueTitle}`);
        console.log(`  Started: ${timer.startTime}`);
        console.log(`  Paused at: ${timer.pausedAt || 'N/A'}`);
        console.log(`  Accumulated pause: ${timer.accumulatedPausedTime}s (${(timer.accumulatedPausedTime / 3600).toFixed(2)}h)`);
      }
    }

    // Apply the new logic: pick ONE timer (running > most recent paused)
    console.log('\n=== APPLYING NEW LOGIC (only count ONE timer) ===');
    if (activeTimers.length > 0) {
      // Sort: running first, then by start time (most recent first)
      activeTimers.sort((a, b) => {
        if (a.isPaused !== b.isPaused) {
          return a.isPaused ? 1 : -1;
        }
        return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
      });

      const selected = activeTimers[0];
      console.log(`Selected timer: ${selected.issueKey} (${selected.isPaused ? 'paused' : 'running'})`);

      // Calculate time for selected timer
      const entryStartTime = new Date(selected.startTime);
      const workStart = new Date(todayStart);
      workStart.setHours(9, 0, 0, 0);

      // Use pausedAt as end time for paused timers, now for running
      const endTime = selected.isPaused && selected.pausedAt
        ? new Date(selected.pausedAt)
        : now;

      const effectiveStart = entryStartTime > workStart ? entryStartTime : workStart;
      const effectiveEnd = endTime < todayEnd ? endTime : todayEnd;

      console.log(`Effective start: ${effectiveStart.toISOString()}`);
      console.log(`Effective end: ${effectiveEnd.toISOString()}`);

      let activeSeconds = 0;
      if (effectiveEnd > effectiveStart) {
        activeSeconds = Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / 1000);
        activeSeconds = Math.max(0, Math.min(activeSeconds, 12 * 3600));
      }

      console.log(`Active seconds for today: ${activeSeconds} (${(activeSeconds / 3600).toFixed(2)}h)`);

      const totalDailySeconds = dailySecondsFromCompleted + activeSeconds;
      console.log(`\n=== FINAL TOTAL (with new logic) ===`);
      console.log(`Completed entries: ${(dailySecondsFromCompleted / 3600).toFixed(2)}h`);
      console.log(`Active timer (ONE only): ${(activeSeconds / 3600).toFixed(2)}h`);
      console.log(`Total daily: ${(totalDailySeconds / 3600).toFixed(2)}h`);
    } else {
      console.log('No active timer to count');
      console.log(`\n=== FINAL TOTAL ===`);
      console.log(`Total daily: ${(dailySecondsFromCompleted / 3600).toFixed(2)}h`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed.');
  }
}

debugUserBandwidth();
