const { MongoClient } = require('mongodb');

async function checkArchived() {
  const client = new MongoClient('mongodb+srv://voodooooboy_db_user:3WtPNaCOrk0q0BVO@cluster0.lpetngj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('dar-pm');
    const issues = db.collection('issues');

    // Count total issues
    const totalCount = await issues.countDocuments({});
    console.log(`\nTotal issues: ${totalCount}`);

    // Count archived issues
    const archivedCount = await issues.countDocuments({ isArchived: true });
    console.log(`Archived issues: ${archivedCount}`);

    // Count active issues
    const activeCount = await issues.countDocuments({ isArchived: false });
    console.log(`Active issues: ${activeCount}`);

    // Count issues without isArchived field
    const noFieldCount = await issues.countDocuments({ isArchived: { $exists: false } });
    console.log(`Issues without isArchived field: ${noFieldCount}`);

    // Show some archived issues
    if (archivedCount > 0) {
      console.log('\n--- Sample Archived Issues ---');
      const archivedIssues = await issues.find({ isArchived: true }).limit(5).toArray();
      archivedIssues.forEach(issue => {
        console.log(`- ${issue.key}: ${issue.title} (status: ${issue.status})`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkArchived();
