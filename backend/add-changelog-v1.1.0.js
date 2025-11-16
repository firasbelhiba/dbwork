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
  version: '1.1.0',
  title: 'Comprehensive Notification System',
  description: 'Major update introducing a complete notification system across all modules including projects, sprints, feedback, and changelogs. Users now receive real-time notifications for all important events.',
  releaseDate: new Date('2025-11-16'),
  features: [
    '@mention autocomplete in comments - Type @ to mention team members with real-time search dropdown',
    'Project notifications - Get notified when added/removed from projects or when projects are archived/deleted',
    'Sprint notifications - Receive alerts when your issues are added to sprints or when sprints are starting/ending soon',
    'Feedback notifications - Get notified when your feedback is upvoted, commented on, or status changes',
    'Changelog notifications - All users are notified when new versions are published',
    'Comment mention detection - Automatically notifies mentioned users in comments',
    'Comment reply notifications - Get notified when someone replies to your comment',
  ],
  improvements: [
    'Enhanced MentionTextarea component with keyboard navigation (Arrow Up/Down, Enter, Escape)',
    'User mention dropdown shows avatars and formatted usernames',
    'Notification system prevents self-notifications (no alerts for your own actions)',
    'Sprint reminders automatically sent 1-3 days before sprints start or end',
    'Feedback status changes show formatted status names (Open, To Test, Resolved)',
    'All notifications include contextual links to related items',
    'Publish/unpublish functionality for changelogs allows drafting before notifying users',
  ],
  bugFixes: [
    'Fixed import error in MentionTextarea component (default vs named import)',
    'Fixed TypeScript strict null checks in project and sprint notification handlers',
    'Removed debug console.log statements from MentionTextarea component',
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
    const existing = await Changelog.findOne({ version: '1.1.0' }).exec();
    if (existing) {
      console.log('Version 1.1.0 already exists! Skipping...');
      process.exit(0);
    }

    // Create changelog
    const changelog = new Changelog(changelogData);
    await changelog.save();

    console.log('\n✅ Changelog v1.1.0 created successfully!');
    console.log(`\nChangelog ID: ${changelog._id}`);
    console.log(`\nTo publish and notify all users, run:`);
    console.log(`POST /changelogs/${changelog._id}/publish`);
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
