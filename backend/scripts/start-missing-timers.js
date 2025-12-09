const mongoose = require('mongoose');
require('dotenv').config();

async function startMissingTimers() {
  await mongoose.connect(process.env.MONGODB_URI);
  const now = new Date();

  console.log('=== STARTING TIMERS FOR IN_PROGRESS ISSUES WITHOUT TIMER ===');
  console.log('Current time:', now.toISOString());
  console.log('');

  // Find all in_progress issues WITHOUT active timer
  const issues = await mongoose.connection.db.collection('issues').find({
    status: 'in_progress',
    $or: [
      { 'timeTracking.activeTimeEntry': null },
      { 'timeTracking.activeTimeEntry': { $exists: false } },
      { 'timeTracking': null },
      { 'timeTracking': { $exists: false } }
    ]
  }).toArray();

  console.log('Found', issues.length, 'in_progress issues without active timer');
  console.log('');

  for (const issue of issues) {
    // Get the first assignee to be the timer owner, or use a default
    let userId = null;

    if (issue.assignees && issue.assignees.length > 0) {
      // assignees could be ObjectIds or populated objects
      const firstAssignee = issue.assignees[0];
      userId = firstAssignee._id ? firstAssignee._id.toString() : firstAssignee.toString();
    }

    if (!userId) {
      console.log('Skipping', issue.key, '- No assignee to start timer for');
      continue;
    }

    console.log('Starting timer for:', issue.key);
    console.log('  Title:', issue.title?.substring(0, 50));
    console.log('  Assignee (timer owner):', userId);

    // Create new active time entry
    const activeTimeEntry = {
      id: new mongoose.Types.ObjectId().toString(),
      userId: userId,
      startTime: now,
      lastActivityAt: now,
      isPaused: false,
      accumulatedPausedTime: 0,
      isExtraHours: false,
      autoPausedEndOfDay: false
    };

    // Update the issue
    await mongoose.connection.db.collection('issues').updateOne(
      { _id: issue._id },
      {
        $set: {
          'timeTracking.activeTimeEntry': activeTimeEntry
        }
      }
    );

    console.log('  ✓ Timer started!');
    console.log('');
  }

  console.log('=== DONE ===');
  console.log('All in_progress issues now have running timers!');

  await mongoose.disconnect();
}

startMissingTimers().catch(console.error);
