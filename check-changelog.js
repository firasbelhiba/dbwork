const { MongoClient } = require('mongodb');

async function checkChangelog() {
  const client = new MongoClient('mongodb+srv://voodooooboy_db_user:3WtPNaCOrk0q0BVO@cluster0.lpetngj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('dar-pm');
    const changelogs = db.collection('changelogs');

    // Get all changelogs
    const allChangelogs = await changelogs.find({}).sort({ releaseDate: -1 }).toArray();

    console.log(`\nFound ${allChangelogs.length} changelogs:\n`);

    allChangelogs.forEach((changelog, index) => {
      console.log(`=== Changelog ${index + 1}: Version ${changelog.version} ===`);
      console.log(JSON.stringify(changelog, null, 2));
      console.log('\n');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

checkChangelog();
