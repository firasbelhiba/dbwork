require('dotenv').config();
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
  version: '1.4.0',
  title: 'Personal Todo Queue & Enhanced Productivity Tools',
  description: 'Major update introducing a personal todo queue with auto-progression, enhanced calendars, improved notifications with sound alerts, ticket visibility controls, feedback reactions, and numerous UX improvements.',
  releaseDate: new Date('2025-12-29'),
  features: [
    'Personal Todo Queue - Order your assigned tickets in a personal queue. When you complete a ticket, the next one automatically starts with timer running',
    'Todo Queue Sidebar Panel - Access your todo queue from the right sidebar for easy management',
    'Developer Sprint Management - Developers can now create and manage sprints, not just admins',
    'Availability Calendar - View your availability calendar in the user profile sidebar',
    'Ticket Calendar - See your assigned tickets on a calendar with project logos in the profile sidebar',
    'Expandable Calendar View - Fullscreen calendar view with expand button',
    'Notification Sound - Audio notification when you receive new notifications with auto-mark as read',
    'No Tickets Warning - Yellow warning banner when you have no tickets in progress',
    'Overtime Warning - Red warning banner for tickets exceeding 10 hours of work',
    'Real-time Notification Badge - Notification count updates instantly via WebSocket',
    'Ticket Visibility Controls - Admin-only restricted access for sensitive tickets',
    'Project Member Assignees - Assignee selection now limited to project members only',
    'Required Dates - Start date and due date are now required when creating tickets',
    'Issue Key URLs - Support for issue keys in URL (e.g., /issues/MKT-4)',
    'Clickable Links - Auto-detection of clickable links in descriptions and comments',
    'Feedback Reactions - Add emoji reactions to feedback comments with notifications',
    'Editable Time Entries - Edit manual time entries with minutes validation',
    'Sprint Editing - Edit sprint name, duration, and description after creation',
  ],
  improvements: [
    'Timer commits to totalTimeSpent when ticket is completed',
    'Increased notification API limit from 50 to 200 for better history',
  ],
  bugFixes: [
    'Fixed achievements API polling - reduced from every 2 seconds to 30 seconds for better performance',
    'Description now required for manual time entries',
    'Overtime hours now formatted as human-readable text (HH:MM)',
    'In-review tasks now included in user workload display',
    'Day detail modal now renders above sidebar using portal',
    'Fixed day number and ticket overlap in expanded calendar view',
    'Fixed cross-environment file paths for audit PDFs',
    'Resolved circular dependency between UsersModule and IssuesModule',
    'Added tooltip to My Created Tasks dashboard section clarifying it shows tasks you reported, not tasks assigned to you',
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
    const existing = await Changelog.findOne({ version: '1.4.0' }).exec();
    if (existing) {
      console.log('Version 1.4.0 already exists! Updating...');
      await Changelog.findByIdAndUpdate(existing._id, changelogData);
      console.log('\n✅ Changelog v1.4.0 updated successfully!');
      console.log(`\nChangelog ID: ${existing._id}`);
    } else {
      // Create changelog
      const changelog = new Changelog(changelogData);
      await changelog.save();
      console.log('\n✅ Changelog v1.4.0 created successfully!');
      console.log(`\nChangelog ID: ${changelog._id}`);
    }

    console.log(`\nTo publish and notify all users, run:`);
    console.log(`node scripts/publish-changelog-v1.4.0.js`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed.');
  }
}

addChangelog();
