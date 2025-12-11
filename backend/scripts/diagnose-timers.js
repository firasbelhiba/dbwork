// Diagnostic script to understand why timers aren't auto-resuming at 9 AM
const { MongoClient } = require('mongodb');
require('dotenv').config();

async function diagnoseTimers() {
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

    // 1. Check ALL issues with active time entries (paused or not)
    console.log('=== ALL ISSUES WITH ACTIVE TIMERS ===');
    const allActiveTimers = await issues.find({
      'timeTracking.activeTimeEntry': { $ne: null }
    }).toArray();

    console.log(`Total issues with active timers: ${allActiveTimers.length}\n`);

    for (const issue of allActiveTimers) {
      const entry = issue.timeTracking?.activeTimeEntry;
      console.log(`Issue: ${issue.key}`);
      console.log(`  Status: ${issue.status}`);
      console.log(`  Timer isPaused: ${entry?.isPaused}`);
      console.log(`  Timer autoPausedEndOfDay: ${entry?.autoPausedEndOfDay || false}`);
      console.log(`  Timer isExtraHours: ${entry?.isExtraHours || false}`);
      console.log(`  Timer pausedAt: ${entry?.pausedAt || 'N/A'}`);
      console.log(`  Timer startTime: ${entry?.startTime}`);
      console.log(`  Timer userId: ${entry?.userId}`);
      console.log('');
    }

    // 2. Check specifically for timers that SHOULD be resumed (matching the query)
    console.log('\n=== TIMERS THAT SHOULD BE RESUMED (matching resumeAllTimersStartOfDay query) ===');
    const shouldBeResumed = await issues.find({
      status: 'in_progress',
      'timeTracking.activeTimeEntry': { $ne: null },
      'timeTracking.activeTimeEntry.isPaused': true,
      'timeTracking.activeTimeEntry.autoPausedEndOfDay': true,
    }).toArray();

    console.log(`Timers matching resume query: ${shouldBeResumed.length}`);
    for (const issue of shouldBeResumed) {
      console.log(`  - ${issue.key} (user: ${issue.timeTracking?.activeTimeEntry?.userId})`);
    }

    // 3. Check paused timers that are NOT being resumed and WHY
    console.log('\n=== PAUSED TIMERS NOT MATCHING RESUME QUERY ===');
    const pausedTimers = await issues.find({
      'timeTracking.activeTimeEntry': { $ne: null },
      'timeTracking.activeTimeEntry.isPaused': true,
    }).toArray();

    for (const issue of pausedTimers) {
      const entry = issue.timeTracking?.activeTimeEntry;
      const isInProgress = issue.status === 'in_progress';
      const hasAutoPausedFlag = entry?.autoPausedEndOfDay === true;

      if (!isInProgress || !hasAutoPausedFlag) {
        console.log(`Issue: ${issue.key}`);
        console.log(`  Status: ${issue.status} (${isInProgress ? 'OK' : 'NOT in_progress - PROBLEM!'})`);
        console.log(`  autoPausedEndOfDay: ${entry?.autoPausedEndOfDay || 'undefined/false'} (${hasAutoPausedFlag ? 'OK' : 'NOT TRUE - PROBLEM!'})`);
        console.log(`  Why not resuming:`);
        if (!isInProgress) console.log(`    - Issue status is "${issue.status}", not "in_progress"`);
        if (!hasAutoPausedFlag) console.log(`    - autoPausedEndOfDay flag is not true`);
        console.log('');
      }
    }

    // 4. Check in_progress issues WITHOUT any timer (should they have one?)
    console.log('\n=== IN_PROGRESS ISSUES WITHOUT TIMER ===');
    const inProgressNoTimer = await issues.find({
      status: 'in_progress',
      $or: [
        { 'timeTracking.activeTimeEntry': null },
        { 'timeTracking.activeTimeEntry': { $exists: false } },
      ]
    }).toArray();

    console.log(`In-progress issues without timer: ${inProgressNoTimer.length}`);
    for (const issue of inProgressNoTimer.slice(0, 10)) {
      console.log(`  - ${issue.key}: ${issue.title?.substring(0, 50)}...`);
    }
    if (inProgressNoTimer.length > 10) {
      console.log(`  ... and ${inProgressNoTimer.length - 10} more`);
    }

    // 5. Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Total active timers: ${allActiveTimers.length}`);
    console.log(`  - Running (not paused): ${allActiveTimers.filter(i => !i.timeTracking?.activeTimeEntry?.isPaused).length}`);
    console.log(`  - Paused: ${pausedTimers.length}`);
    console.log(`  - Paused with autoPausedEndOfDay=true: ${pausedTimers.filter(i => i.timeTracking?.activeTimeEntry?.autoPausedEndOfDay === true).length}`);
    console.log(`  - Paused AND in_progress AND autoPausedEndOfDay=true (would be resumed): ${shouldBeResumed.length}`);
    console.log(`In-progress issues without timer: ${inProgressNoTimer.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

diagnoseTimers();
