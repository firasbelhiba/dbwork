/**
 * Find Santa admin user info from database
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function findSantaUser() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('MONGODB_URI environment variable is not set');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Find user with firstName containing "Santa" or "Firas"
    const users = await db.collection('users').find({
      $or: [
        { firstName: { $regex: /santa/i } },
        { firstName: { $regex: /firas/i } },
        { role: 'admin' }
      ]
    }).toArray();

    console.log(`Found ${users.length} matching users:\n`);

    users.forEach((user, i) => {
      console.log(`${i + 1}. User ID: ${user._id}`);
      console.log(`   First Name: ${user.firstName}`);
      console.log(`   Last Name: ${user.lastName}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log('');
    });

    // Also find DAR project
    console.log('\n--- Looking for DAR project ---\n');
    const projects = await db.collection('projects').find({
      $or: [
        { key: { $regex: /dar/i } },
        { name: { $regex: /dar/i } }
      ]
    }).toArray();

    console.log(`Found ${projects.length} matching projects:\n`);

    projects.forEach((project, i) => {
      console.log(`${i + 1}. Project ID: ${project._id}`);
      console.log(`   Name: ${project.name}`);
      console.log(`   Key: ${project.key}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

findSantaUser();
