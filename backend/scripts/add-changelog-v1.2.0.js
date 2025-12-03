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
  version: '1.2.0',
  title: 'Image & Media Features Update',
  description: 'Major update bringing comprehensive image upload and display capabilities across the platform. Upload profile pictures, project logos, attach images to comments and feedback, and enjoy a beautiful image gallery with lightbox for issue attachments.',
  releaseDate: new Date('2025-12-03'),
  features: [
    'Profile Picture Upload - Users can now upload profile pictures stored securely in Cloudinary',
    'User Avatars Everywhere - Avatars now display in Header navbar, Kanban board cards, and across all user-related components',
    'Project Logo Upload - Projects can now have custom logos that can be uploaded and removed',
    'Comment Images - Attach inline images to issue and feedback comments with Cloudinary storage',
    'Feedback Screenshots - Attach screenshots to bug reports and feedback submissions with paste support (Ctrl+V)',
    'Issue Attachments Image Gallery - Beautiful grid gallery view for attached images with enhanced lightbox',
    'Lightbox Navigation - Navigate through images with Previous/Next buttons, keyboard arrows, thumbnail strip, and image counter',
    'Admin Database Export - Export complete database backups with sanitized data from admin panel',
    'Admin Grant Achievements - Manually grant achievements to users from admin panel',
    'My Created Tasks Widget - New dashboard widget showing statistics about tasks you created',
    'Chart Carousel - Interactive carousel for charts in the My Created Tasks section',
    'My Tasks Only Filter - Filter Kanban board to show only your assigned tasks',
    'Sub-Issues Progress Display - Visual progress percentage for parent issues with sub-issues',
    'Closed Feedback Status - New "Closed" status option for feedback items',
    'Customizable Notification Preferences - Fine-grained control over which notifications you receive',
    'Update Notification Popup - Get notified when new updates are released with a beautiful modal',
  ],
  improvements: [
    'Dashboard Projects List - Increased displayed projects from 5 to 10',
    'Mobile Responsiveness - Improved responsive design across the entire application',
    'Completed by Day Chart - Changed to histogram style for better data visualization',
    'My Created Tasks Position - Moved section above issues/projects grid for better visibility',
    'Project Filters & Sprint Management - Added filter dropdowns in project detail page',
    'Cloudinary Lazy Loading - Configuration now loads lazily to ensure environment variables are available',
  ],
  bugFixes: [
    'ObjectId Comparison Fixes - Comprehensive fixes across all services for proper ObjectId comparisons',
    'Sprint Creation Fix - Project ID now stored correctly as ObjectId',
    'Sprints View Fix - Fixed sprints not showing in Manage Sprints view',
    'Authorization Checks Fix - Fixed ObjectId comparison in authorization checks',
    'Assignees Serialization - Proper serialization of assignees array in query parameters',
    'Comment Queries Fix - Convert issueId to ObjectId properly in comment queries',
    'Mixed parentIssue Types - Handle mixed types in sub-issue queries correctly',
    'Sub-Issues Visibility - Fixed parentIssue type mismatch bug',
    'Feedback Edit Page - Created missing page to resolve 404 error',
    'Feedback Status Filter - Added "Closed" option to the status filter dropdown',
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
    const existing = await Changelog.findOne({ version: '1.2.0' }).exec();
    if (existing) {
      console.log('Version 1.2.0 already exists! Updating...');
      await Changelog.findByIdAndUpdate(existing._id, changelogData);
      console.log('\n✅ Changelog v1.2.0 updated successfully!');
      console.log(`\nChangelog ID: ${existing._id}`);
    } else {
      // Create changelog
      const changelog = new Changelog(changelogData);
      await changelog.save();
      console.log('\n✅ Changelog v1.2.0 created successfully!');
      console.log(`\nChangelog ID: ${changelog._id}`);
    }

    console.log(`\nTo publish and notify all users, run:`);
    console.log(`POST /changelogs/<id>/publish`);
    console.log(`\nOr set isPublished to true manually in the database.`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed.');
  }
}

addChangelog();
