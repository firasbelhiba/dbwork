const { MongoClient } = require('mongodb');
require('dotenv').config({ path: './backend/.env' });

const uri = process.env.MONGODB_URI;
const dbName = 'dar-pm';

async function checkCollections() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas\n');

    const db = client.db(dbName);

    // List all collections
    const collections = await db.listCollections().toArray();

    console.log('=== All Collections in Database ===\n');
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });

    console.log('\n=== Looking for User collection ===');
    const userCollections = collections.filter(c =>
      c.name.toLowerCase().includes('user')
    );

    if (userCollections.length > 0) {
      console.log('Found user-related collections:');
      userCollections.forEach(col => {
        console.log(`  ✓ ${col.name}`);
      });
    } else {
      console.log('❌ No user collection found!');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nConnection closed');
  }
}

checkCollections()
  .then(() => {
    console.log('\nCheck completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nCheck failed:', error);
    process.exit(1);
  });
