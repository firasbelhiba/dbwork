const mongoose = require('mongoose');
require('dotenv').config();

async function checkTimers() {
  await mongoose.connect(process.env.MONGODB_URI);

  // Find all issues with active time entries
  const issues = await mongoose.connection.db.collection('issues').find({
    'timeTracking.activeTimeEntry': { $ne: null }
  }).toArray();

  console.log('=== ISSUES WITH ACTIVE TIME ENTRIES ===');
  console.log('Total found:', issues.length);
  console.log('');

  for (const issue of issues) {
    const entry = issue.timeTracking?.activeTimeEntry;
    if (entry) {
      console.log('Issue:', issue.key, '-', issue.title?.substring(0, 40));
      console.log('  Status:', issue.status);
      console.log('  Timer User:', entry.userId);
      console.log('  Start Time:', entry.startTime);
      console.log('  Is Paused:', entry.isPaused);
      console.log('  Paused At:', entry.pausedAt || 'N/A');
      console.log('  Auto Paused EOD:', entry.autoPausedEndOfDay || false);
      console.log('  Is Extra Hours:', entry.isExtraHours || false);
      console.log('  Accumulated Paused Time:', entry.accumulatedPausedTime, 'seconds');
      console.log('');
    }
  }

  // Also check issues in_progress WITHOUT active timer
  const inProgressNoTimer = await mongoose.connection.db.collection('issues').find({
    status: 'in_progress',
    $or: [
      { 'timeTracking.activeTimeEntry': null },
      { 'timeTracking.activeTimeEntry': { $exists: false } }
    ]
  }).toArray();

  console.log('=== IN_PROGRESS ISSUES WITHOUT ACTIVE TIMER ===');
  console.log('Total found:', inProgressNoTimer.length);
  for (const issue of inProgressNoTimer.slice(0, 10)) {
    console.log('  -', issue.key, '-', issue.title?.substring(0, 40));
  }

  await mongoose.disconnect();
}

checkTimers().catch(console.error);
