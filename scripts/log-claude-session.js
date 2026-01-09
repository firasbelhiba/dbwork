/**
 * Script to log Claude Code session work as a ticket in Dar Blockchain project
 *
 * Usage: node scripts/log-claude-session.js
 *
 * Before running, update the SESSION object with the current session details.
 */

const mongoose = require('mongoose');
require('dotenv').config();

// ============================================================
// SESSION DETAILS - UPDATE THESE FOR EACH SESSION
// ============================================================
const SESSION = {
  title: 'Fix Achievements Display on User Profile Page',
  description: `## Summary
Fix the achievements section on the detailed user profile page (/users/[id]) - achievements are showing as empty boxes without content.

## Issue
The achievements grid shows 9 achievements but they appear as empty bordered boxes without any content (icon, title, rarity).

## Root Cause
Need to investigate how achievements data is returned from the API and ensure proper rendering.

## Acceptance Criteria
- [ ] Achievements display with icon emoji
- [ ] Achievement title is visible
- [ ] Achievement rarity is shown with proper color coding
- [ ] Hover/tooltip shows achievement description`,

  timeSpentMinutes: 0,
  assigneeEmail: 'firasbenhiba49@gmail.com', // Santa Admin
  projectKey: 'DBWR', // DB Work
  type: 'bug',
  priority: 'medium',
  status: 'in_progress', // Can be: todo, in_progress, in_review, done
  category: 'development',
  labels: ['bug', 'profile', 'achievements'],
};
// ============================================================

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Find project
    const project = await db.collection('projects').findOne({ key: SESSION.projectKey });
    if (!project) {
      throw new Error(`Project with key "${SESSION.projectKey}" not found`);
    }
    console.log(`Found project: ${project.name} (${project.key})`);

    // Find user
    const user = await db.collection('users').findOne({ email: SESSION.assigneeEmail });
    if (!user) {
      throw new Error(`User with email "${SESSION.assigneeEmail}" not found`);
    }
    console.log(`Found user: ${user.firstName} ${user.lastName}`);

    // Get next issue number for project (extract from key field as issueNumber may not be set)
    const allIssues = await db.collection('issues')
      .find({ projectId: project._id })
      .toArray();

    let maxIssueNumber = 0;
    for (const issue of allIssues) {
      if (issue.key) {
        const num = parseInt(issue.key.split('-')[1]);
        if (!isNaN(num) && num > maxIssueNumber) {
          maxIssueNumber = num;
        }
      }
      if (issue.issueNumber && issue.issueNumber > maxIssueNumber) {
        maxIssueNumber = issue.issueNumber;
      }
    }
    const nextIssueNumber = maxIssueNumber + 1;
    const issueKey = `${SESSION.projectKey}-${nextIssueNumber}`;

    const now = new Date();

    // Create activeTimeEntry if status is in_progress (to start the timer)
    const status = SESSION.status || 'done';
    const activeTimeEntry = status === 'in_progress' ? {
      id: new mongoose.Types.ObjectId().toString(),
      userId: user._id,
      startTime: now,
      lastActivityAt: now,
      isPaused: false,
      accumulatedPausedTime: 0,
    } : null;

    // Create the issue with all required fields
    const issue = {
      projectId: project._id,
      issueNumber: nextIssueNumber,
      key: issueKey,
      title: SESSION.title,
      description: SESSION.description,
      type: SESSION.type,
      priority: SESSION.priority,
      status: status,
      assignees: [user._id],
      labels: SESSION.labels,
      reporter: user._id,
      timeTracking: {
        estimatedHours: Math.round(SESSION.timeSpentMinutes / 60 * 10) / 10,
        loggedHours: 0,
        timeLogs: [],
        timeEntries: [],
        activeTimeEntry: activeTimeEntry,
      },
      attachments: [],
      sprintId: null,
      startDate: now,
      dueDate: null,
      storyPoints: 0,
      watchers: [],
      blockedBy: [],
      blocks: [],
      parentIssue: null,
      order: 0,
      isArchived: false,
      archivedAt: null,
      completedAt: SESSION.status === 'done' ? now : null,
      isVisible: true,
      visibleTo: [],
      category: SESSION.category || 'development',
      createdAt: now,
      updatedAt: now,
      __v: 0,
    };

    const result = await db.collection('issues').insertOne(issue);

    // Create activity for issue creation
    const activity = {
      type: 'issue_created',
      userId: user._id,
      projectId: project._id,
      issueId: result.insertedId,
      details: {
        issueKey: issueKey,
        issueTitle: SESSION.title,
      },
      createdAt: now,
    };
    await db.collection('activities').insertOne(activity);

    console.log('\n========================================');
    console.log('✅ TICKET CREATED SUCCESSFULLY');
    console.log('========================================');
    console.log(`Issue Key:    ${issueKey}`);
    console.log(`Title:        ${SESSION.title}`);
    console.log(`Project:      ${project.name} (${SESSION.projectKey})`);
    console.log(`Assignee:     ${user.firstName} ${user.lastName}`);
    console.log(`Status:       ${status}`);
    console.log(`Timer:        ${activeTimeEntry ? 'Started' : 'Not started'}`);
    console.log(`Type:         ${SESSION.type}`);
    console.log(`Priority:     ${SESSION.priority}`);
    console.log(`Category:     ${SESSION.category}`);
    console.log(`Labels:       ${SESSION.labels.join(', ')}`);
    console.log(`ID:           ${result.insertedId}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

main();
