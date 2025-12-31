// Script to debug user workload - check why tickets aren't showing
const mongoose = require('mongoose');
require('dotenv').config();

async function debugUserWorkload() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Get all users for selection
    const users = await db.collection('users')
      .find({})
      .project({ _id: 1, firstName: 1, lastName: 1, email: 1 })
      .toArray();

    console.log('=== All Users ===');
    users.forEach((u, i) => {
      console.log(`${i + 1}. ${u.firstName} ${u.lastName} (${u.email}) - ID: ${u._id}`);
    });

    // For each user, check their assigned tickets
    console.log('\n=== Checking User Workloads ===\n');

    for (const user of users) {
      // Get all issues assigned to this user (not just in_progress)
      const allIssues = await db.collection('issues')
        .find({
          assignees: user._id,
          isArchived: { $ne: true }
        })
        .project({ key: 1, title: 1, status: 1, projectId: 1 })
        .toArray();

      // Get only in_progress issues
      const inProgressIssues = allIssues.filter(i => i.status === 'in_progress');

      // Get issues that are NOT done/todo (might be custom status)
      const activeIssues = allIssues.filter(i =>
        i.status !== 'done' && i.status !== 'todo'
      );

      if (allIssues.length > 0) {
        console.log(`\n--- ${user.firstName} ${user.lastName} ---`);
        console.log(`Total assigned: ${allIssues.length}`);
        console.log(`In Progress (status='in_progress'): ${inProgressIssues.length}`);
        console.log(`Active (not done/todo): ${activeIssues.length}`);

        if (activeIssues.length > inProgressIssues.length) {
          console.log('\n⚠️ MISMATCH: Some active issues have custom status!');
          console.log('Active issues not showing in workload:');
          const notShowingIssues = activeIssues.filter(i => i.status !== 'in_progress');
          for (const issue of notShowingIssues) {
            // Get project info
            const project = await db.collection('projects').findOne({ _id: issue.projectId });
            const customStatus = project?.customStatuses?.find(s => s.id === issue.status);
            console.log(`  - ${issue.key}: "${issue.title.substring(0, 40)}..." - Status: "${issue.status}" ${customStatus ? `(Custom: "${customStatus.name}")` : ''}`);
          }
        }

        // Show status breakdown
        const statusCounts = {};
        allIssues.forEach(i => {
          statusCounts[i.status] = (statusCounts[i.status] || 0) + 1;
        });
        console.log('\nStatus breakdown:', statusCounts);
      }
    }

    // Check all unique statuses in the system
    console.log('\n\n=== All Unique Status Values in Issues ===');
    const allStatuses = await db.collection('issues').distinct('status');
    console.log(allStatuses);

    // Check projects with custom statuses
    console.log('\n\n=== Projects with Custom Statuses ===');
    const projectsWithCustom = await db.collection('projects')
      .find({ 'customStatuses.0': { $exists: true } })
      .project({ name: 1, key: 1, customStatuses: 1 })
      .toArray();

    for (const project of projectsWithCustom) {
      console.log(`\n${project.key} - ${project.name}:`);
      project.customStatuses.forEach(s => {
        console.log(`  - ${s.id}: "${s.name}" (order: ${s.order})`);
      });
    }

    await mongoose.disconnect();
    console.log('\n\nDone!');
  } catch (error) {
    console.error('Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

debugUserWorkload();
