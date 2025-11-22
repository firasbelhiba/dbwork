const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dbwork';

async function fixParentIssueTypes() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const db = client.db();
    const issuesCollection = db.collection('issues');

    // Find all issues with parentIssue as a string
    const issuesWithStringParent = await issuesCollection.find({
      parentIssue: { $type: 'string' }
    }).toArray();

    console.log(`Found ${issuesWithStringParent.length} issues with parentIssue as string\n`);

    if (issuesWithStringParent.length === 0) {
      console.log('✅ No issues to fix!');
      return;
    }

    console.log('Issues to fix:');
    issuesWithStringParent.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.key}: ${issue.title}`);
      console.log(`   parentIssue (string): ${issue.parentIssue}`);
    });

    console.log('\n=== FIXING ISSUES ===\n');

    let fixed = 0;
    let errors = 0;

    for (const issue of issuesWithStringParent) {
      try {
        // Convert string to ObjectId
        const parentObjectId = new ObjectId(issue.parentIssue);

        const result = await issuesCollection.updateOne(
          { _id: issue._id },
          { $set: { parentIssue: parentObjectId } }
        );

        if (result.modifiedCount === 1) {
          console.log(`✅ Fixed ${issue.key}: converted "${issue.parentIssue}" to ObjectId`);
          fixed++;
        } else {
          console.log(`⚠️  ${issue.key}: no modification (already correct?)`);
        }
      } catch (error) {
        console.error(`❌ Error fixing ${issue.key}:`, error.message);
        errors++;
      }
    }

    console.log(`\n=== SUMMARY ===`);
    console.log(`Fixed: ${fixed}`);
    console.log(`Errors: ${errors}`);

    // Verify
    const remaining = await issuesCollection.countDocuments({
      parentIssue: { $type: 'string' }
    });

    console.log(`\nRemaining issues with string parentIssue: ${remaining}`);

    if (remaining === 0) {
      console.log('✅ All parentIssue fields are now ObjectIds!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

fixParentIssueTypes();
