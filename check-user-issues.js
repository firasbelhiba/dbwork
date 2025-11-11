const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: './backend/.env' });

const uri = process.env.MONGODB_URI;
const dbName = 'dar-pm';
const userId = '68ff7f146d57d8e73e9f82d3'; // Med Aziz Ben Ismail

async function checkUserIssues() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas\n');

    const db = client.db(dbName);
    const issues = db.collection('issues');

    // Check with ObjectId
    const userObjectId = new ObjectId(userId);
    const issuesCount = await issues.countDocuments({
      assignees: userObjectId
    });

    console.log(`Issues assigned to user ${userId}:`);
    console.log(`Total count: ${issuesCount}\n`);

    if (issuesCount > 0) {
      // Get some sample issues
      const sampleIssues = await issues.find({
        assignees: userObjectId
      }).limit(5).toArray();

      console.log('Sample issues:');
      sampleIssues.forEach(issue => {
        console.log(`- ${issue.key}: ${issue.title}`);
        console.log(`  Status: ${issue.status}, Type: ${issue.type}, Priority: ${issue.priority}`);
        console.log(`  Archived: ${issue.isArchived || false}`);
        console.log(`  Assignees:`, issue.assignees);
      });

      // Count by archived status
      const activeCount = await issues.countDocuments({
        assignees: userObjectId,
        isArchived: { $ne: true }
      });

      const archivedCount = await issues.countDocuments({
        assignees: userObjectId,
        isArchived: true
      });

      console.log(`\nBreakdown:`);
      console.log(`- Active: ${activeCount}`);
      console.log(`- Archived: ${archivedCount}`);

      // Count by type
      const bugs = await issues.countDocuments({
        assignees: userObjectId,
        isArchived: { $ne: true },
        type: 'bug'
      });

      const stories = await issues.countDocuments({
        assignees: userObjectId,
        isArchived: { $ne: true },
        type: 'story'
      });

      const tasks = await issues.countDocuments({
        assignees: userObjectId,
        isArchived: { $ne: true },
        type: 'task'
      });

      console.log(`\nBy Type (Active only):`);
      console.log(`- Bugs: ${bugs}`);
      console.log(`- Stories: ${stories}`);
      console.log(`- Tasks: ${tasks}`);

    } else {
      console.log('❌ No issues found for this user');
      console.log('\nChecking if user exists...');

      const users = db.collection('users');
      const user = await users.findOne({ _id: userObjectId });

      if (user) {
        console.log(`✓ User found: ${user.firstName} ${user.lastName} (${user.email})`);
      } else {
        console.log('✗ User not found in database!');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nConnection closed');
  }
}

checkUserIssues();
