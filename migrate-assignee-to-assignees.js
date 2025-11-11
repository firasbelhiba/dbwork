const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './backend/.env' });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = 'dar-pm';

async function migrateAssigneeToAssignees() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db(dbName);
    const issues = db.collection('issues');

    // Count documents that need migration
    const countWithAssignee = await issues.countDocuments({
      assignee: { $exists: true }
    });

    console.log(`Found ${countWithAssignee} issues with 'assignee' field`);

    if (countWithAssignee === 0) {
      console.log('No issues to migrate. Migration may have already been run.');
      return;
    }

    // Convert assignee to assignees array
    // If assignee is null, set assignees to empty array
    // If assignee has a value, set assignees to array with that value
    const result = await issues.updateMany(
      { assignee: { $exists: true } },
      [
        {
          $set: {
            assignees: {
              $cond: {
                if: { $ne: ['$assignee', null] },
                then: ['$assignee'],
                else: []
              }
            }
          }
        }
      ]
    );

    console.log(`Migration completed: ${result.modifiedCount} issues updated`);

    // Remove the old assignee field
    const removeResult = await issues.updateMany(
      { assignee: { $exists: true } },
      { $unset: { assignee: '' } }
    );

    console.log(`Removed 'assignee' field from ${removeResult.modifiedCount} issues`);

    // Verify migration
    const countWithAssignees = await issues.countDocuments({
      assignees: { $exists: true }
    });

    const countWithOldField = await issues.countDocuments({
      assignee: { $exists: true }
    });

    console.log('\nMigration verification:');
    console.log(`  Issues with 'assignees' field: ${countWithAssignees}`);
    console.log(`  Issues with 'assignee' field: ${countWithOldField}`);

    // Sample a few documents to verify structure
    console.log('\nSample documents after migration:');
    const samples = await issues.find({}).limit(3).toArray();
    samples.forEach((issue, index) => {
      console.log(`\n  Issue ${index + 1} (${issue.key}):`);
      console.log(`    assignees: ${JSON.stringify(issue.assignees)}`);
      console.log(`    assignee (should not exist): ${issue.assignee || 'not present'}`);
    });

  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\nConnection closed');
  }
}

// Run migration
migrateAssigneeToAssignees()
  .then(() => {
    console.log('\nMigration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration script failed:', error);
    process.exit(1);
  });
