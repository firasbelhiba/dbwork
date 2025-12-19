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
  version: '1.3.2',
  title: 'Real-time Online Status & Time Tracking Improvements',
  description: 'Feature update introducing real-time online status indicators on user avatars across the platform, in-app PDF viewer for audit documents, improved time tracking with pause-only functionality, and various bug fixes for better data accuracy.',
  releaseDate: new Date('2025-12-19'),
  features: [
    'Real-time Online Status - Green indicator dots on user avatars across the entire platform showing who is currently online',
    'In-app PDF Viewer - View audit documents directly in the browser without downloading',
    'Ticket Breakdown in Reports - Time & Attendance report now shows detailed ticket-level breakdown',
    'User Bandwidth Display - See team members availability and work capacity at a glance',
    'In Review Dashboard Category - Separate tracking for issues in review status',
    'Issue Category in Sidebar - Category now displayed in issue detail metadata',
    'Expandable Team Members - Collapse/expand team member list when there are many members on a project',
    'Persistent Filters - Filter preferences saved to localStorage and URL for better navigation',
  ],
  improvements: [
    'Daily work target changed from 8h to 7h',
    'Time & Attendance report now grouped by user with expandable daily details',
    'Audit document storage switched from Cloudinary to local file system for better reliability',
    'Removed stop timer functionality - only pause/resume allowed for better time tracking accuracy',
  ],
  bugFixes: [
    'Timer now pauses (instead of stopping) when moving issues to Done, preserving time when moved back',
    'Time & Attendance report now correctly includes currently running timers',
    'Fixed bandwidth calculation showing impossible daily hours',
    'Fixed Google Calendar invalid_grant error handling',
    'Improved PDF upload and viewing reliability',
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
    const existing = await Changelog.findOne({ version: '1.3.2' }).exec();
    if (existing) {
      console.log('Version 1.3.2 already exists! Updating...');
      await Changelog.findByIdAndUpdate(existing._id, changelogData);
      console.log('\n✅ Changelog v1.3.2 updated successfully!');
      console.log(`\nChangelog ID: ${existing._id}`);
    } else {
      // Create changelog
      const changelog = new Changelog(changelogData);
      await changelog.save();
      console.log('\n✅ Changelog v1.3.2 created successfully!');
      console.log(`\nChangelog ID: ${changelog._id}`);
    }

    console.log(`\nTo publish and notify all users, run:`);
    console.log(`node scripts/publish-changelog-v1.3.2.js`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed.');
  }
}

addChangelog();
