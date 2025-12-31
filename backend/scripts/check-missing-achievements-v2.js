const mongoose = require('mongoose');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';

async function checkMissingAchievements() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    // Get all collections
    const User = mongoose.connection.collection('users');
    const Issue = mongoose.connection.collection('issues');
    const Comment = mongoose.connection.collection('comments');
    const Achievement = mongoose.connection.collection('achievements');
    const UserAchievement = mongoose.connection.collection('userachievements');
    const Project = mongoose.connection.collection('projects');
    const Activity = mongoose.connection.collection('activities');

    const users = await User.find({}).toArray();
    const achievements = await Achievement.find({}).toArray();
    const allProjects = await Project.find({}).toArray();

    // Build a comprehensive map of done status IDs across all projects
    const doneStatusIds = new Set();
    const projectDoneStatuses = new Map(); // projectId -> [doneStatusIds]

    for (const project of allProjects) {
      const projectDoneIds = [];
      if (project.customStatuses) {
        for (const status of project.customStatuses) {
          if (status.category === 'done' ||
              status.name?.toLowerCase() === 'done' ||
              status.name?.toLowerCase() === 'completed') {
            doneStatusIds.add(status._id.toString());
            projectDoneIds.push(status._id.toString());
          }
        }
      }
      projectDoneStatuses.set(project._id.toString(), projectDoneIds);
    }

    console.log('Found done statuses:', doneStatusIds.size);
    console.log('Done status IDs:', [...doneStatusIds].slice(0, 5), '...\n');

    console.log('='.repeat(80));
    console.log('DETAILED USER ANALYSIS');
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

      // Get all issues assigned to user
      const userIssues = await Issue.find({
        assignees: { $in: [userId] }
      }).toArray();

      // Count completed issues by checking status against done statuses
      let completedIssuesCount = 0;
      const completedIssuesList = [];

      for (const issue of userIssues) {
        const statusStr = issue.status?.toString();
        if (doneStatusIds.has(statusStr)) {
          completedIssuesCount++;
          completedIssuesList.push({
            key: issue.key,
            title: issue.title,
            status: statusStr
          });
        }
      }

      // Also check activities for issue completions (more accurate)
      const completionActivities = await Activity.find({
        userId: userId,
        action: 'completed'
      }).toArray();

      // Count comments by user
      const commentsCount = await Comment.countDocuments({ userId: userId });

      // Count unique issues commented on
      const commentsWithIssues = await Comment.distinct('issueId', { userId: userId });
      const uniqueIssuesCommented = commentsWithIssues.length;

      // Count projects user is member of
      const projectsAssigned = await Project.countDocuments({
        'members.userId': userId
      });

      // Get user's stored stats
      const storedStats = user.stats || {};

      // Determine the best count for completed issues
      // Use maximum of: actual done status count, activity count, stored stats
      const actualCompleted = Math.max(
        completedIssuesCount,
        completionActivities.length,
        storedStats.issuesCompleted || 0
      );

      // Current streak from user stats
      const currentStreak = storedStats.currentStreak || 0;
      const longestStreak = storedStats.longestStreak || 0;

      // Check which achievements should be unlocked
      const missing = [];

      // Task completion achievements
      if (actualCompleted >= 1 && !unlockedKeys.has('first_steps')) {
        missing.push({ key: 'first_steps', name: 'First Steps', points: 10, reason: `Completed ${actualCompleted} issues (need 1)` });
      }
      if (actualCompleted >= 5 && !unlockedKeys.has('getting_started')) {
        missing.push({ key: 'getting_started', name: 'Getting Started', points: 25, reason: `Completed ${actualCompleted} issues (need 5)` });
      }
      if (actualCompleted >= 10 && !unlockedKeys.has('productive')) {
        missing.push({ key: 'productive', name: 'Productive', points: 50, reason: `Completed ${actualCompleted} issues (need 10)` });
      }
      if (actualCompleted >= 25 && !unlockedKeys.has('workhorse')) {
        missing.push({ key: 'workhorse', name: 'Workhorse', points: 100, reason: `Completed ${actualCompleted} issues (need 25)` });
      }
      if (actualCompleted >= 50 && !unlockedKeys.has('power_user')) {
        missing.push({ key: 'power_user', name: 'Power User', points: 200, reason: `Completed ${actualCompleted} issues (need 50)` });
      }
      if (actualCompleted >= 100 && !unlockedKeys.has('legendary_contributor')) {
        missing.push({ key: 'legendary_contributor', name: 'Legendary Contributor', points: 500, reason: `Completed ${actualCompleted} issues (need 100)` });
      }

      // Collaboration achievements
      if (projectsAssigned >= 1 && !unlockedKeys.has('team_player')) {
        missing.push({ key: 'team_player', name: 'Team Player', points: 10, reason: `Assigned to ${projectsAssigned} projects (need 1)` });
      }
      if (commentsCount >= 50 && !unlockedKeys.has('communicator')) {
        missing.push({ key: 'communicator', name: 'Communicator', points: 75, reason: `Posted ${commentsCount} comments (need 50)` });
      }
      if (uniqueIssuesCommented >= 25 && !unlockedKeys.has('social_butterfly')) {
        missing.push({ key: 'social_butterfly', name: 'Social Butterfly', points: 50, reason: `Commented on ${uniqueIssuesCommented} unique issues (need 25)` });
      }

      // Streak achievements
      const bestStreak = Math.max(currentStreak, longestStreak);
      if (bestStreak >= 3 && !unlockedKeys.has('daily_driver')) {
        missing.push({ key: 'daily_driver', name: 'Daily Driver', points: 50, reason: `Best streak: ${bestStreak} days (need 3)` });
      }
      if (bestStreak >= 7 && !unlockedKeys.has('week_warrior')) {
        missing.push({ key: 'week_warrior', name: 'Week Warrior', points: 100, reason: `Best streak: ${bestStreak} days (need 7)` });
      }
      if (bestStreak >= 30 && !unlockedKeys.has('monthly_grind')) {
        missing.push({ key: 'monthly_grind', name: 'Monthly Grind', points: 500, reason: `Best streak: ${bestStreak} days (need 30)` });
      }

      if (missing.length > 0 || actualCompleted > 0 || userIssues.length > 0) {
        missingByUser.push({
          user: userName,
          email: user.email,
          userId: userId.toString(),
          stats: {
            totalIssuesAssigned: userIssues.length,
            completedIssuesByStatus: completedIssuesCount,
            completedIssuesByActivity: completionActivities.length,
            storedIssuesCompleted: storedStats.issuesCompleted || 0,
            actualCompleted,
            comments: commentsCount,
            uniqueIssuesCommented,
            projectsAssigned,
            currentStreak,
            longestStreak,
          },
          currentAchievements: unlockedKeys.size,
          unlockedAchievements: [...unlockedKeys],
          missing: missing,
          completedIssues: completedIssuesList.slice(0, 5) // Show first 5
        });
      }
    }

    // Sort by number of missing achievements (most missing first)
    missingByUser.sort((a, b) => b.missing.length - a.missing.length);

    // Print results
    console.log(`Analyzed ${users.length} users\n`);

    let totalMissing = 0;
    let totalMissingPoints = 0;
    const usersWithMissing = missingByUser.filter(u => u.missing.length > 0);

    if (usersWithMissing.length === 0) {
      console.log('✅ All users have their achievements correctly assigned!');
    } else {
      console.log(`Found ${usersWithMissing.length} users with missing achievements:\n`);

      for (const entry of usersWithMissing) {
        console.log('-'.repeat(70));
        console.log(`👤 ${entry.user} (${entry.email})`);
        console.log(`   User ID: ${entry.userId}`);
        console.log(`   Stats from DB:`);
        console.log(`     - Total Issues Assigned: ${entry.stats.totalIssuesAssigned}`);
        console.log(`     - Completed (by status): ${entry.stats.completedIssuesByStatus}`);
        console.log(`     - Completed (by activity): ${entry.stats.completedIssuesByActivity}`);
        console.log(`     - Completed (stored): ${entry.stats.storedIssuesCompleted}`);
        console.log(`     - ACTUAL COMPLETED: ${entry.stats.actualCompleted}`);
        console.log(`     - Comments: ${entry.stats.comments}`);
        console.log(`     - Unique Issues Commented: ${entry.stats.uniqueIssuesCommented}`);
        console.log(`     - Projects: ${entry.stats.projectsAssigned}`);
        console.log(`     - Streak: ${entry.stats.currentStreak} current / ${entry.stats.longestStreak} longest`);

        if (entry.completedIssues.length > 0) {
          console.log(`   Sample completed issues:`);
          for (const issue of entry.completedIssues) {
            console.log(`     - ${issue.key}: ${issue.title?.substring(0, 40)}...`);
          }
        }

        console.log(`   Current Achievements (${entry.currentAchievements}): ${entry.unlockedAchievements.join(', ') || 'none'}`);
        console.log(`   MISSING Achievements (${entry.missing.length}):`);

        for (const m of entry.missing) {
          console.log(`     🏆 ${m.name} (${m.key}) - ${m.points} pts`);
          console.log(`        → ${m.reason}`);
          totalMissing++;
          totalMissingPoints += m.points;
        }
        console.log('');
      }
    }

    console.log('='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total users analyzed: ${users.length}`);
    console.log(`Users with missing achievements: ${usersWithMissing.length}`);
    console.log(`Total missing achievements to grant: ${totalMissing}`);
    console.log(`Total missing points: ${totalMissingPoints}`);
    console.log('');

    // Group by achievement type
    const missingByAchievement = {};
    for (const entry of usersWithMissing) {
      for (const m of entry.missing) {
        if (!missingByAchievement[m.key]) {
          missingByAchievement[m.key] = { users: [], points: m.points };
        }
        missingByAchievement[m.key].users.push(entry.user);
      }
    }

    if (Object.keys(missingByAchievement).length > 0) {
      console.log('Missing by achievement type:');
      for (const [key, data] of Object.entries(missingByAchievement)) {
        console.log(`  ${key} (${data.points} pts): ${data.users.length} users`);
        for (const userName of data.users) {
          console.log(`    - ${userName}`);
        }
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
