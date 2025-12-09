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
  version: '1.3.0',
  title: 'Comments & Time Tracking Enhancement Update',
  description: 'Major update featuring enhanced comments with replies and emoji reactions, comprehensive time tracking improvements with extra hours and auto-pause functionality, new issue management features including start dates and categories, plus Google Calendar integration for syncing due dates.',
  releaseDate: new Date('2025-12-09'),
  features: [
    'Reply to Comments - Users can now reply to comments with threaded discussions and expand/collapse functionality',
    'Emoji Reactions - Meta-style emoji reactions (like, love, haha, wow, sad, angry) on comments and replies',
    'Start Date Field - Issues now support a start date in addition to due date for better planning',
    'Category Field - Issues can be categorized (Development, Design, Testing, Documentation, Research, Bug, Feature, Improvement)',
    'Sort by Start Date - Kanban board can be sorted by issue start date with filter toggle',
    'Time Tracking Extra Hours - Track extra hours worked beyond normal schedule with dedicated field',
    'Timer Auto-Pause - Timers automatically pause at end of day instead of stopping, allowing resumption',
    'Project Audits - Upload PDF audit documents to projects with custom audit types and metadata',
    'Admin Reports - Generate and view admin reports with statistics and insights',
    'Google Calendar Integration - Sync issue due dates with Google Calendar events',
    'Changelog X Close Button - Popup notification now has an X button for quick dismissal',
  ],
  improvements: [
    'Timer Ownership Checks - Updated to allow visibility for all users while maintaining edit restrictions',
    'WebSocket Room Management - Prevent duplicate joins and leaves for better real-time performance',
    'Timer Display Logic - Improved timer display with clearer auto-paused state indicators',
    'Comment Sections - Enhanced layout with better spacing and reaction display',
  ],
  bugFixes: [
    'Attachment Thumbnails - Fixed issue with image attachment thumbnail display',
    'Sub-Issue Form Fields - Fixed missing fields in sub-issue creation form',
    'Timer Pause State - Fixed timer state not reflecting correctly after auto-pause',
    'WebSocket Event Handling - Fixed events to properly reflect auto-paused vs auto-stopped state',
    'Timer Resume Functionality - Fixed issues with resuming paused timers from previous day',
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
    const existing = await Changelog.findOne({ version: '1.3.0' }).exec();
    if (existing) {
      console.log('Version 1.3.0 already exists! Updating...');
      await Changelog.findByIdAndUpdate(existing._id, changelogData);
      console.log('\n✅ Changelog v1.3.0 updated successfully!');
      console.log(`\nChangelog ID: ${existing._id}`);
    } else {
      // Create changelog
      const changelog = new Changelog(changelogData);
      await changelog.save();
      console.log('\n✅ Changelog v1.3.0 created successfully!');
      console.log(`\nChangelog ID: ${changelog._id}`);
    }

    console.log(`\nTo publish and notify all users, run:`);
    console.log(`node scripts/publish-changelog-v1.3.0.js`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed.');
  }
}

addChangelog();
