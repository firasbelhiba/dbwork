const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';

// Manual categorization for remaining TAI issues
const MANUAL_CATEGORIES = [
  // Frontend issues (UI, display, modules)
  { key: 'TAI-12', category: 'frontend' },   // Interview question counter - UI
  { key: 'TAI-20', category: 'frontend' },   // Recommendations section - UI
  { key: 'TAI-21', category: 'frontend' },   // Interview Q&A Details displaying
  { key: 'TAI-184', category: 'frontend' },  // HR Interview Module
  { key: 'TAI-185', category: 'frontend' },  // Technical Interview Module
  { key: 'TAI-186', category: 'frontend' },  // Soft Skills Interview Module
  { key: 'TAI-187', category: 'frontend' },  // Candidate Onboarding Module
  { key: 'TAI-198', category: 'frontend' },  // remove the second line - UI
  { key: 'TAI-199', category: 'frontend' },  // Interview results display
  { key: 'TAI-200', category: 'frontend' },  // Conversation Quality - UI
  { key: 'TAI-208', category: 'frontend' },  // design of result analyse
  { key: 'TAI-216', category: 'frontend' },  // Design for notification system
  { key: 'TAI-219', category: 'frontend' },  // wrong otp error display
  { key: 'TAI-220', category: 'frontend' },  // bid UI issue
  { key: 'TAI-221', category: 'frontend' },  // logout profile display
  { key: 'TAI-223', category: 'frontend' },  // Conversation Quality display
  { key: 'TAI-224', category: 'frontend' },  // onboarding test counts - UI
  { key: 'TAI-225', category: 'frontend' },  // Onboarding test not appearing
  { key: 'TAI-226', category: 'frontend' },  // Profile not being used - UI
  { key: 'TAI-227', category: 'backend' },   // Post creation generating skills
  { key: 'TAI-228', category: 'backend' },   // matching not working
  { key: 'TAI-232', category: 'backend' },   // Include Candidate profile in matching
  { key: 'TAI-233', category: 'backend' },   // Include contract type in post
  { key: 'TAI-234', category: 'backend' },   // Salary validation
  { key: 'TAI-236', category: 'frontend' },  // No Level Confirmed display
  { key: 'TAI-237', category: 'frontend' },  // onboarding test appearing - UI
  { key: 'TAI-238', category: 'backend' },   // Add fields to response
  { key: 'TAI-248', category: 'frontend' },  // Interview Details display
  { key: 'TAI-250', category: 'backend' },   // level not working correctly
  { key: 'TAI-251', category: 'frontend' },  // interview report UI
  { key: 'TAI-258', category: 'frontend' },  // manual bidding UI
  { key: 'TAI-260', category: 'frontend' },  // Integrate interview process
  { key: 'TAI-261', category: 'backend' },   // interview time limit
  { key: 'TAI-262', category: 'frontend' },  // Add candidate info sections
  { key: 'TAI-263', category: 'frontend' },  // Add candidate info sections
  { key: 'TAI-290', category: 'frontend' },  // Send soft skills in save post
  { key: 'TAI-291', category: 'backend' },   // Add candidate fields to GET
  { key: 'TAI-293', category: 'frontend' },  // Update LinkedIn post content
  { key: 'TAI-295', category: 'frontend' },  // Remove Step matchingConfig
  { key: 'TAI-298', category: 'frontend' },  // Recommended opportunity display
  { key: 'TAI-302', category: 'backend' },   // Interview error
  { key: 'TAI-303', category: 'frontend' },  // Create design for hr agent
  { key: 'TAI-310', category: 'frontend' },  // Warning repeatedly appears

  // Backend issues (logic, data, functionality)
  { key: 'TAI-2', category: 'backend' },     // Post interview test not working
  { key: 'TAI-4', category: 'frontend' },    // make links clickable
  { key: 'TAI-5', category: 'frontend' },    // Remove Recommendations section
  { key: 'TAI-13', category: 'backend' },    // session handling
  { key: 'TAI-23', category: 'backend' },    // Python skill showing No Level
  { key: 'TAI-58', category: 'frontend' },   // empty state message
  { key: 'TAI-59', category: 'frontend' },   // Soft skills missing display
  { key: 'TAI-61', category: 'frontend' },   // name field validation
  { key: 'TAI-85', category: 'backend' },    // job Not Removed After Apply
  { key: 'TAI-87', category: 'backend' },    // Fix Bug Manuel Bid
  { key: 'TAI-88', category: 'backend' },    // Fix Bug Manuel Bid
  { key: 'TAI-89', category: 'backend' },    // required skills in job post
  { key: 'TAI-95', category: 'frontend' },   // error boucle when logout
  { key: 'TAI-96', category: 'frontend' },   // Fix logout
  { key: 'TAI-149', category: 'backend' },   // Automatic bid not working
  { key: 'TAI-151', category: 'other' },     // testtest - test ticket
  { key: 'TAI-196', category: 'backend' },   // Skills not added
  { key: 'TAI-201', category: 'backend' },   // Questions similar
  { key: 'TAI-202', category: 'backend' },   // update skill test issue
  { key: 'TAI-206', category: 'backend' },   // Failed to save job
  { key: 'TAI-210', category: 'backend' },   // onboarding test appear twice
  { key: 'TAI-215', category: 'other' },     // Fix some issues in branch
];

async function updateRemaining() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    const Issue = mongoose.connection.collection('issues');

    console.log('Updating remaining Talent AI categories...\n');

    const counts = { frontend: 0, backend: 0, other: 0 };
    let updatedCount = 0;

    for (const update of MANUAL_CATEGORIES) {
      const result = await Issue.updateOne(
        { key: update.key },
        { $set: { category: update.category } }
      );

      if (result.modifiedCount > 0) {
        console.log(`  ✅ ${update.key} → ${update.category}`);
        updatedCount++;
        counts[update.category] = (counts[update.category] || 0) + 1;
      } else if (result.matchedCount > 0) {
        console.log(`  ⏭️  ${update.key} already has category`);
      } else {
        console.log(`  ❌ ${update.key} not found`);
      }
    }

    // Check for any still uncategorized
    const stillUncategorized = await Issue.find({
      key: { $regex: /^TAI-/ },
      $or: [{ category: null }, { category: { $exists: false } }]
    }).project({ key: 1, title: 1 }).toArray();

    console.log('\n' + '='.repeat(50));
    console.log(`Updated: ${updatedCount} issues`);
    for (const [cat, count] of Object.entries(counts)) {
      if (count > 0) console.log(`  ${cat}: ${count}`);
    }

    if (stillUncategorized.length > 0) {
      console.log(`\n⚠️  Still uncategorized: ${stillUncategorized.length}`);
      for (const issue of stillUncategorized) {
        console.log(`  ${issue.key}: ${(issue.title || '').substring(0, 50)}...`);
      }
    } else {
      console.log('\n✅ All Talent AI issues are now categorized!');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed.');
  }
}

updateRemaining();
