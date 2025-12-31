const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  const jassemId = new mongoose.Types.ObjectId('68ff7f316d57d8e73e9f82da');

  const allJassemIssues = await db.collection('issues').find({
    assignees: jassemId,
    isArchived: { $ne: true }
  }).project({ key: 1, status: 1, category: 1, sprintId: 1 }).toArray();

  console.log('All Jassem issues by category:');
  const byCategory = {};
  allJassemIssues.forEach(i => {
    const cat = i.category || 'null/undefined';
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(i.key + ' [' + i.status + ']');
  });

  for (const [cat, issues] of Object.entries(byCategory)) {
    console.log('\n' + cat + ' (' + issues.length + '):');
    issues.slice(0, 10).forEach(i => console.log('  - ' + i));
    if (issues.length > 10) console.log('  ... and ' + (issues.length - 10) + ' more');
  }

  // Check TAI-390 specifically
  console.log('\n\n=== TAI-390 Details ===');
  const tai390 = await db.collection('issues').findOne({ key: 'TAI-390' });
  console.log('category:', tai390.category);
  console.log('sprintId:', tai390.sprintId);
  console.log('status:', tai390.status);
  console.log('assignees:', tai390.assignees);

  await mongoose.disconnect();
}
check().catch(console.error);
