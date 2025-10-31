const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dar-blockchain-pm';

async function fixActivities() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const activities = db.collection('activities');

    // Find all activities with problematic projectId
    const allActivities = await activities.find({}).toArray();
    console.log(`Found ${allActivities.length} total activities`);

    let fixed = 0;
    let deleted = 0;

    for (const activity of allActivities) {
      let needsUpdate = false;
      const updates = {};

      // Fix userId if it's a string
      if (activity.userId && typeof activity.userId === 'string') {
        try {
          updates.userId = new ObjectId(activity.userId);
          needsUpdate = true;
          console.log(`Fixing userId for activity ${activity._id}`);
        } catch (e) {
          console.error(`Cannot fix userId for activity ${activity._id}:`, e.message);
        }
      }

      // Fix projectId if it exists and is problematic
      if (activity.projectId) {
        const projectIdStr = activity.projectId.toString();

        // Check if it's a stringified object (contains newlines or braces)
        if (projectIdStr.includes('{') || projectIdStr.includes('\n') || projectIdStr.includes('_id')) {
          console.log(`Found corrupted projectId in activity ${activity._id}: ${projectIdStr.slice(0, 50)}...`);

          // Try to extract ObjectId from the stringified object
          const match = projectIdStr.match(/ObjectId\('([a-f0-9]{24})'\)/);
          if (match && match[1]) {
            updates.projectId = new ObjectId(match[1]);
            needsUpdate = true;
            console.log(`  -> Extracted and fixed to: ${match[1]}`);
          } else {
            // If we can't extract, delete this activity as it's corrupted
            await activities.deleteOne({ _id: activity._id });
            deleted++;
            console.log(`  -> Deleted corrupted activity ${activity._id}`);
            continue;
          }
        } else if (typeof activity.projectId === 'string') {
          // It's a string but looks like a valid ObjectId
          try {
            updates.projectId = new ObjectId(activity.projectId);
            needsUpdate = true;
            console.log(`Converting string projectId to ObjectId for activity ${activity._id}`);
          } catch (e) {
            console.error(`Cannot convert projectId for activity ${activity._id}:`, e.message);
          }
        }
      }

      // Apply updates if needed
      if (needsUpdate) {
        await activities.updateOne(
          { _id: activity._id },
          { $set: updates }
        );
        fixed++;
        console.log(`Fixed activity ${activity._id}`);
      }
    }

    console.log(`\nSummary:`);
    console.log(`  Total activities: ${allActivities.length}`);
    console.log(`  Fixed: ${fixed}`);
    console.log(`  Deleted (corrupted): ${deleted}`);
    console.log(`  Unchanged: ${allActivities.length - fixed - deleted}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

fixActivities();
