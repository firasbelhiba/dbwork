const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';

// Pattern-based categorization rules for Talent AI
function categorizeByTitle(title) {
  const lowerTitle = title.toLowerCase();

  // Explicit prefixes
  if (lowerTitle.includes('[backend]')) return 'backend';
  if (lowerTitle.includes('[frontend]')) return 'frontend';
  if (lowerTitle.includes('[architecture]')) return 'backend';
  if (lowerTitle.includes('[ai & backend]')) return 'backend';
  if (lowerTitle.includes('[ai / backend]')) return 'backend';
  if (lowerTitle.includes('[ai/backend]')) return 'backend';
  if (lowerTitle.includes('[refactor]')) return 'backend';
  if (lowerTitle.includes('[consume api]')) return 'frontend';
  if (lowerTitle.includes('[consume  api]')) return 'frontend';
  if (lowerTitle.includes('consume api')) return 'frontend';

  // Content-based patterns for frontend
  if (lowerTitle.includes('ui ') || lowerTitle.includes(' ui')) return 'frontend';
  if (lowerTitle.includes('component')) return 'frontend';
  if (lowerTitle.includes('page ') || lowerTitle.includes(' page')) return 'frontend';
  if (lowerTitle.includes('form ') || lowerTitle.includes(' form')) return 'frontend';
  if (lowerTitle.includes('display')) return 'frontend';
  if (lowerTitle.includes('button')) return 'frontend';
  if (lowerTitle.includes('dialog')) return 'frontend';
  if (lowerTitle.includes('modal')) return 'frontend';
  if (lowerTitle.includes('navbar')) return 'frontend';
  if (lowerTitle.includes('dashboard') && !lowerTitle.includes('[backend]')) return 'frontend';
  if (lowerTitle.includes('landing page')) return 'frontend';
  if (lowerTitle.includes('responsive')) return 'frontend';
  if (lowerTitle.includes('styling')) return 'frontend';
  if (lowerTitle.includes('enhance') && (lowerTitle.includes('component') || lowerTitle.includes('ui'))) return 'frontend';
  if (lowerTitle.includes('pagination') && !lowerTitle.includes('[backend]')) return 'frontend';
  if (lowerTitle.includes('refactor') && lowerTitle.includes('component')) return 'frontend';
  if (lowerTitle.includes('create') && lowerTitle.includes('page')) return 'frontend';
  if (lowerTitle.includes('revamp') && !lowerTitle.includes('[backend]')) return 'frontend';
  if (lowerTitle.includes('placeholder')) return 'frontend';
  if (lowerTitle.includes('countdown')) return 'frontend';
  if (lowerTitle.includes('toast')) return 'frontend';
  if (lowerTitle.includes('popup')) return 'frontend';
  if (lowerTitle.includes('blur')) return 'frontend';

  // Content-based patterns for backend
  if (lowerTitle.includes('api ') || lowerTitle.includes(' api')) return 'backend';
  if (lowerTitle.includes('endpoint')) return 'backend';
  if (lowerTitle.includes('database') || lowerTitle.includes('db ')) return 'backend';
  if (lowerTitle.includes('model ') || lowerTitle.includes(' model')) return 'backend';
  if (lowerTitle.includes('schema')) return 'backend';
  if (lowerTitle.includes('validation') && !lowerTitle.includes('ui')) return 'backend';
  if (lowerTitle.includes('cron')) return 'backend';
  if (lowerTitle.includes('middleware')) return 'backend';
  if (lowerTitle.includes('token')) return 'backend';
  if (lowerTitle.includes('authentication') || lowerTitle.includes('auth ')) return 'backend';
  if (lowerTitle.includes('socket')) return 'backend';
  if (lowerTitle.includes('transcription')) return 'backend';
  if (lowerTitle.includes('crud')) return 'backend';
  if (lowerTitle.includes('matching algorithm')) return 'backend';
  if (lowerTitle.includes('swagger')) return 'backend';
  if (lowerTitle.includes('stripe')) return 'backend';
  if (lowerTitle.includes('payment') && !lowerTitle.includes('ui')) return 'backend';
  if (lowerTitle.includes('hedera')) return 'backend';
  if (lowerTitle.includes('multer')) return 'backend';
  if (lowerTitle.includes('mongoose')) return 'backend';
  if (lowerTitle.includes('mongodb')) return 'backend';
  if (lowerTitle.includes('prompt')) return 'backend';
  if (lowerTitle.includes('ai ') && !lowerTitle.includes('talent ai')) return 'backend';
  if (lowerTitle.includes('interview') && lowerTitle.includes('save')) return 'backend';
  if (lowerTitle.includes('quota')) return 'backend';
  if (lowerTitle.includes('agentconfig')) return 'backend';
  if (lowerTitle.includes('config') && lowerTitle.includes('creation')) return 'backend';

  // Bug fixes - try to categorize based on context
  if (lowerTitle.includes('fix') && lowerTitle.includes('ui')) return 'frontend';
  if (lowerTitle.includes('fix') && lowerTitle.includes('display')) return 'frontend';
  if (lowerTitle.includes('fix') && lowerTitle.includes('appear')) return 'frontend';

  // Default - return null for manual review
  return null;
}

async function analyzeAndUpdate() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    const Issue = mongoose.connection.collection('issues');

    // Get all TAI issues
    const issues = await Issue.find({ key: { $regex: /^TAI-/ } })
      .project({ key: 1, title: 1, category: 1 })
      .toArray();

    console.log(`Found ${issues.length} Talent AI issues\n`);

    const updates = [];
    const uncategorized = [];

    for (const issue of issues) {
      if (issue.category) {
        // Already categorized
        continue;
      }

      const category = categorizeByTitle(issue.title || '');
      if (category) {
        updates.push({ key: issue.key, category, title: issue.title });
      } else {
        uncategorized.push({ key: issue.key, title: issue.title });
      }
    }

    console.log(`Auto-categorized: ${updates.length} issues`);
    console.log(`Needs manual review: ${uncategorized.length} issues\n`);

    // Apply updates
    const counts = { frontend: 0, backend: 0 };
    let updatedCount = 0;

    for (const update of updates) {
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
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`Updated: ${updatedCount} issues`);
    console.log(`  Frontend: ${counts.frontend}`);
    console.log(`  Backend: ${counts.backend}`);

    if (uncategorized.length > 0) {
      console.log(`\n⚠️  ${uncategorized.length} issues need manual review:`);
      for (const issue of uncategorized.slice(0, 20)) {
        console.log(`  ${issue.key}: ${(issue.title || '').substring(0, 50)}...`);
      }
      if (uncategorized.length > 20) {
        console.log(`  ... and ${uncategorized.length - 20} more`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed.');
  }
}

analyzeAndUpdate();
