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

async function publishChangelog() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!');

    // Find v1.3.2 changelog
    const changelog = await Changelog.findOne({ version: '1.3.2' }).exec();

    if (!changelog) {
      console.error('Changelog v1.3.2 not found!');
      console.error('Please run add-changelog-v1.3.2.js first.');
      process.exit(1);
    }

    if (changelog.isPublished) {
      console.log('Changelog v1.3.2 is already published!');
      process.exit(0);
    }

    // Publish the changelog
    changelog.isPublished = true;
    changelog.publishedAt = new Date();
    await changelog.save();

    console.log('\n✅ Changelog v1.3.2 published successfully!');
    console.log(`Published at: ${changelog.publishedAt}`);
    console.log('\nAll users will now see the update notification popup when they log in.');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed.');
  }
}

publishChangelog();
