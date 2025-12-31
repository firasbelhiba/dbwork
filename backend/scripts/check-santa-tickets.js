const mongoose = require('mongoose');
require('dotenv').config();

const emailArg = process.argv[2] || 'firasbenhiba49@gmail.com';

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;

  // Find user
  const user = await db.collection('users').findOne({ email: emailArg });
  if (!user) {
    console.log('User not found:', emailArg);
    await mongoose.disconnect();
    return;
  }
  console.log('User:', user.firstName, user.lastName);
  console.log('User ID:', user._id);

  // Get user's active tickets
  const tickets = await db.collection('issues').find({
    assignees: user._id,
    status: { $in: ['in_progress', 'in_review'] },
    isArchived: { $ne: true }
  }).project({ key: 1, title: 1, status: 1, projectId: 1 }).toArray();

  console.log('\nSanta active tickets (' + tickets.length + '):');
  for (const t of tickets) {
    const project = await db.collection('projects').findOne({ _id: t.projectId });
    console.log('- ' + t.key + ' [' + t.status + '] - ' + t.title.substring(0, 50) + ' (Project: ' + (project?.name || 'Unknown') + ')');
  }

  await mongoose.disconnect();
}
check().catch(console.error);
