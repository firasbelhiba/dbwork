const mongoose = require('mongoose');

// MongoDB connection string - update with your credentials if needed
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';

const changelogSchema = new mongoose.Schema({
  version: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  releaseDate: { type: Date, required: true },
  features: [String],
  improvements: [String],
  bugFixes: [String],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isPublished: { type: Boolean, default: false },
  publishedAt: { type: Date, default: null },
}, { timestamps: true });

const Changelog = mongoose.model('Changelog', changelogSchema);

const changelogData = {
  version: '1.3.1',
  title: 'Activities Analytics & Team Workload Update',
  description: 'Feature update introducing comprehensive activity analytics in Reports, user workload tracking in profile sidebar, category badges on Kanban cards, team filtering tabs, and various bug fixes for improved data accuracy.',
  releaseDate: new Date('2025-12-11'),
  features: [
    'Activities Analytics Tab - New comprehensive Activities tab in Reports with activity breakdown by action type and entity type, daily trends, and project activity breakdown',
    'Most Active Users - View top active users with entity type percentages showing their activity distribution',
    'Least Active Users - Track users with lowest activity (includes users with 0 activity in selected period)',
    'View All Users Modal - See complete activity data for all users with detailed entity breakdowns',
    'User Workload in Profile Sidebar - Click on team member avatars to see their current in-progress tasks grouped by project',
    'User Achievements Modal - View individual user achievements from the admin achievements overview',
    'Category Badges on Kanban Cards - Issue cards now display their category with distinctive colors for quick visual identification',
    'Team Tabs on Project Board - Filter Kanban board by team: All, Dev, Design, Marketing',
    'Timer Action Logs - Detailed timer logs with type indicators for better time tracking visibility',
  ],
  improvements: [
    'Activity Trend visualization changed from vertical bars to horizontal bar list for better readability',
    'Team tabs moved below Team section with cleaner design (no emojis)',
    'Timer resume at 9 AM made more permissive for better user experience',
    'Notification filters now group related notification types together',
  ],
  bugFixes: [
    'Fixed data mismatch in Least Active Users caused by ObjectId vs string type handling',
    'Fixed users with zero activity not appearing in Least Active Users list',
    'Fixed categories filter not working correctly for getByProject and getBySprint endpoints',
    'Fixed undefined entityBreakdown handling in Activities tab causing display errors',
  ],
  createdBy: null, // Will be set to admin user ID when running
  isPublished: false,
};

async function addChangelog() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!');

    // Find an admin user to set as creator
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const adminUser = await User.findOne({ role: 'admin' }).exec();

    if (!adminUser) {
      console.error('No admin user found! Please create an admin user first.');
      process.exit(1);
    }

    changelogData.createdBy = adminUser._id;
    console.log(`Using admin user: ${adminUser.firstName} ${adminUser.lastName} (${adminUser.email})`);

    // Check if version already exists
    const existing = await Changelog.findOne({ version: '1.3.1' }).exec();
    if (existing) {
      console.log('Version 1.3.1 already exists! Updating...');
      await Changelog.findByIdAndUpdate(existing._id, changelogData);
      console.log('\n✅ Changelog v1.3.1 updated successfully!');
      console.log(`\nChangelog ID: ${existing._id}`);
    } else {
      // Create changelog
      const changelog = new Changelog(changelogData);
      await changelog.save();
      console.log('\n✅ Changelog v1.3.1 created successfully!');
      console.log(`\nChangelog ID: ${changelog._id}`);
    }

    console.log(`\nTo publish and notify all users, run:`);
    console.log(`node scripts/publish-changelog-v1.3.1.js`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed.');
  }
}

addChangelog();
