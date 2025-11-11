const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: './backend/.env' });

const uri = process.env.MONGODB_URI;
const dbName = 'dar-pm';

async function fixAssigneesObjectIds() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas\n');

    const db = client.db(dbName);
    const issues = db.collection('issues');

    // Find all issues with non-empty assignees
    const issuesWithAssignees = await issues.find({
      assignees: { $exists: true, $ne: [] }
    }).toArray();

    console.log(`Found ${issuesWithAssignees.length} issues with assignees\n`);

    let fixed = 0;
    let errors = 0;

    for (const issue of issuesWithAssignees) {
      try {
        // Check if any assignee is a string
        const hasStringAssignees = issue.assignees.some(a => typeof a === 'string');

        if (hasStringAssignees) {
          // Convert all string IDs to ObjectIds
          const objectIdAssignees = issue.assignees.map(a => {
            if (typeof a === 'string') {
              return new ObjectId(a);
            }
            return a;
          });

          // Update the document
          await issues.updateOne(
            { _id: issue._id },
            { $set: { assignees: objectIdAssignees } }
          );

          console.log(`✓ Fixed ${issue.key}: converted ${issue.assignees.length} assignee(s) to ObjectId`);
          fixed++;
        }
      } catch (error) {
        console.error(`✗ Error fixing ${issue.key}:`, error.message);
        errors++;
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Fixed: ${fixed} issues`);
    console.log(`Errors: ${errors} issues`);

    // Verify
    console.log(`\n=== Verification ===`);
    const sample = await issues.findOne({ assignees: { $ne: [] } });
    if (sample) {
      console.log(`Sample issue ${sample.key}:`);
      console.log(`  assignees:`, sample.assignees);
      console.log(`  first assignee type:`, typeof sample.assignees[0]);
    }

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('\nConnection closed');
  }
}

fixAssigneesObjectIds()
  .then(() => {
    console.log('\nFix completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nFix failed:', error);
    process.exit(1);
  });
