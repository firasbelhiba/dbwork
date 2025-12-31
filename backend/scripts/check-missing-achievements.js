const mongoose = require('mongoose');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';

// Achievement definitions with their criteria
const ACHIEVEMENTS = {
  // Task completion achievements
  first_steps: { key: 'first_steps', name: 'First Steps', criteria: 'issue_completion', count: 1 },
  getting_started: { key: 'getting_started', name: 'Getting Started', criteria: 'issue_completion', count: 5 },
  productive: { key: 'productive', name: 'Productive', criteria: 'issue_completion', count: 10 },
  workhorse: { key: 'workhorse', name: 'Workhorse', criteria: 'issue_completion', count: 25 },
  power_user: { key: 'power_user', name: 'Power User', criteria: 'issue_completion', count: 50 },
  legendary_contributor: { key: 'legendary_contributor', name: 'Legendary Contributor', criteria: 'issue_completion', count: 100 },

  // Collaboration achievements
  team_player: { key: 'team_player', name: 'Team Player', criteria: 'project_assignment', count: 1 },
  social_butterfly: { key: 'social_butterfly', name: 'Social Butterfly', criteria: 'unique_issues_commented', count: 25 },
  mentor: { key: 'mentor', name: 'Mentor', criteria: 'mentions_received', count: 10 },
  communicator: { key: 'communicator', name: 'Communicator', criteria: 'comments_written', count: 50 },

  // Streak achievements
  daily_driver: { key: 'daily_driver', name: 'Daily Driver', criteria: 'consecutive_days', count: 3 },
  week_warrior: { key: 'week_warrior', name: 'Week Warrior', criteria: 'consecutive_days', count: 7 },
  monthly_grind: { key: 'monthly_grind', name: 'Monthly Grind', criteria: 'consecutive_days', count: 30 },
};

async function checkMissingAchievements() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    // Get all users
    const User = mongoose.connection.collection('users');
    const Issue = mongoose.connection.collection('issues');
    const Comment = mongoose.connection.collection('comments');
    const Achievement = mongoose.connection.collection('achievements');
    const UserAchievement = mongoose.connection.collection('userachievements');
    const Project = mongoose.connection.collection('projects');

    const users = await User.find({}).toArray();
    const achievements = await Achievement.find({}).toArray();

    // Create a map of achievement key to _id
    const achievementMap = new Map();
    achievements.forEach(a => {
      achievementMap.set(a.key, a._id);
    });

    console.log('='.repeat(80));
    console.log('MISSING ACHIEVEMENTS ANALYSIS');
    console.log('='.repeat(80));
    console.log('');

    const missingByUser = [];

    for (const user of users) {
      const userId = user._id;
      const userName = `${user.firstName} ${user.lastName}`;

      // Get user's unlocked achievements
      const userAchievements = await UserAchievement.find({
        userId: userId,
        unlocked: true
      }).toArray();

      const unlockedKeys = new Set();
      for (const ua of userAchievements) {
        const achievement = achievements.find(a => a._id.toString() === ua.achievementId.toString());
        if (achievement) {
          unlockedKeys.add(achievement.key);
        }
      }

      // Count completed issues by this user
      const completedIssues = await Issue.countDocuments({
        assignees: userId,
        status: { $in: ['done', 'Done', 'DONE', 'completed', 'Completed', 'COMPLETED'] }
      });

      // Also check issues where user is the single assignee (ObjectId comparison)
      const completedIssuesAlt = await Issue.countDocuments({
        assignees: { $in: [userId] },
        $or: [
          { status: 'done' },
          { status: 'Done' },
          { status: 'completed' },
          { status: 'Completed' }
        ]
      });

      // Count by checking customStatus that might be "done" type
      const allIssuesForUser = await Issue.find({
        assignees: { $in: [userId] }
      }).toArray();

      // Get projects to check custom statuses
      const projectIds = [...new Set(allIssuesForUser.map(i => i.projectId?.toString()).filter(Boolean))];
      const projects = await Project.find({ _id: { $in: projectIds.map(id => new mongoose.Types.ObjectId(id)) } }).toArray();

      // Build a map of project -> done status IDs
      const doneStatusIds = new Set();
      for (const project of projects) {
        if (project.customStatuses) {
          for (const status of project.customStatuses) {
            if (status.category === 'done' || status.name?.toLowerCase() === 'done') {
              doneStatusIds.add(status._id.toString());
            }
          }
        }
      }

      // Count issues in done status
      let actualCompletedCount = 0;
      for (const issue of allIssuesForUser) {
        if (doneStatusIds.has(issue.status?.toString())) {
          actualCompletedCount++;
        }
      }

      // Count comments by user
      const commentsCount = await Comment.countDocuments({ userId: userId });

      // Count unique issues commented on
      const commentsWithIssues = await Comment.distinct('issueId', { userId: userId });
      const uniqueIssuesCommented = commentsWithIssues.length;

      // Count projects user is member of
      const projectsAssigned = await Project.countDocuments({
        'members.userId': userId
      });

      // Count mentions received (rough estimate - search comments for @mentions)
      const mentionsCount = user.stats?.mentionsReceived || 0;

      // Current streak from user stats
      const currentStreak = user.stats?.currentStreak || 0;
      const longestStreak = user.stats?.longestStreak || 0;

      // Check which achievements should be unlocked
      const missing = [];

      // Task completion achievements
      if (actualCompletedCount >= 1 && !unlockedKeys.has('first_steps')) {
        missing.push({ key: 'first_steps', name: 'First Steps', reason: `Completed ${actualCompletedCount} issues (need 1)` });
      }
      if (actualCompletedCount >= 5 && !unlockedKeys.has('getting_started')) {
        missing.push({ key: 'getting_started', name: 'Getting Started', reason: `Completed ${actualCompletedCount} issues (need 5)` });
      }
      if (actualCompletedCount >= 10 && !unlockedKeys.has('productive')) {
        missing.push({ key: 'productive', name: 'Productive', reason: `Completed ${actualCompletedCount} issues (need 10)` });
      }
      if (actualCompletedCount >= 25 && !unlockedKeys.has('workhorse')) {
        missing.push({ key: 'workhorse', name: 'Workhorse', reason: `Completed ${actualCompletedCount} issues (need 25)` });
      }
      if (actualCompletedCount >= 50 && !unlockedKeys.has('power_user')) {
        missing.push({ key: 'power_user', name: 'Power User', reason: `Completed ${actualCompletedCount} issues (need 50)` });
      }
      if (actualCompletedCount >= 100 && !unlockedKeys.has('legendary_contributor')) {
        missing.push({ key: 'legendary_contributor', name: 'Legendary Contributor', reason: `Completed ${actualCompletedCount} issues (need 100)` });
      }

      // Collaboration achievements
      if (projectsAssigned >= 1 && !unlockedKeys.has('team_player')) {
        missing.push({ key: 'team_player', name: 'Team Player', reason: `Assigned to ${projectsAssigned} projects (need 1)` });
      }
      if (commentsCount >= 50 && !unlockedKeys.has('communicator')) {
        missing.push({ key: 'communicator', name: 'Communicator', reason: `Posted ${commentsCount} comments (need 50)` });
      }
      if (uniqueIssuesCommented >= 25 && !unlockedKeys.has('social_butterfly')) {
        missing.push({ key: 'social_butterfly', name: 'Social Butterfly', reason: `Commented on ${uniqueIssuesCommented} unique issues (need 25)` });
      }

      // Streak achievements (based on longest streak since current might have reset)
      const bestStreak = Math.max(currentStreak, longestStreak);
      if (bestStreak >= 3 && !unlockedKeys.has('daily_driver')) {
        missing.push({ key: 'daily_driver', name: 'Daily Driver', reason: `Best streak: ${bestStreak} days (need 3)` });
      }
      if (bestStreak >= 7 && !unlockedKeys.has('week_warrior')) {
        missing.push({ key: 'week_warrior', name: 'Week Warrior', reason: `Best streak: ${bestStreak} days (need 7)` });
      }
      if (bestStreak >= 30 && !unlockedKeys.has('monthly_grind')) {
        missing.push({ key: 'monthly_grind', name: 'Monthly Grind', reason: `Best streak: ${bestStreak} days (need 30)` });
      }

      if (missing.length > 0) {
        missingByUser.push({
          user: userName,
          email: user.email,
          userId: userId.toString(),
          stats: {
            completedIssues: actualCompletedCount,
            comments: commentsCount,
            uniqueIssuesCommented,
            projectsAssigned,
            currentStreak,
            longestStreak,
          },
          currentAchievements: unlockedKeys.size,
          missing: missing
        });
      }
    }

    // Sort by number of missing achievements (most missing first)
    missingByUser.sort((a, b) => b.missing.length - a.missing.length);

    // Print results
    if (missingByUser.length === 0) {
      console.log('✅ All users have their achievements correctly assigned!');
    } else {
      console.log(`Found ${missingByUser.length} users with missing achievements:\n`);

      let totalMissing = 0;

      for (const entry of missingByUser) {
        console.log('-'.repeat(60));
        console.log(`👤 ${entry.user} (${entry.email})`);
        console.log(`   User ID: ${entry.userId}`);
        console.log(`   Current Stats:`);
        console.log(`     - Completed Issues: ${entry.stats.completedIssues}`);
        console.log(`     - Comments Posted: ${entry.stats.comments}`);
        console.log(`     - Unique Issues Commented: ${entry.stats.uniqueIssuesCommented}`);
        console.log(`     - Projects Assigned: ${entry.stats.projectsAssigned}`);
        console.log(`     - Current Streak: ${entry.stats.currentStreak} days`);
        console.log(`     - Longest Streak: ${entry.stats.longestStreak} days`);
        console.log(`   Current Achievements: ${entry.currentAchievements}`);
        console.log(`   Missing Achievements (${entry.missing.length}):`);

        for (const m of entry.missing) {
          console.log(`     🏆 ${m.name} (${m.key})`);
          console.log(`        → ${m.reason}`);
          totalMissing++;
        }
        console.log('');
      }

      console.log('='.repeat(80));
      console.log('SUMMARY');
      console.log('='.repeat(80));
      console.log(`Total users with missing achievements: ${missingByUser.length}`);
      console.log(`Total missing achievements to grant: ${totalMissing}`);
      console.log('');

      // Group by achievement type
      const missingByAchievement = {};
      for (const entry of missingByUser) {
        for (const m of entry.missing) {
          if (!missingByAchievement[m.key]) {
            missingByAchievement[m.key] = [];
          }
          missingByAchievement[m.key].push(entry.user);
        }
      }

      console.log('Missing by achievement type:');
      for (const [key, users] of Object.entries(missingByAchievement)) {
        console.log(`  ${key}: ${users.length} users`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed.');
  }
}

checkMissingAchievements();
