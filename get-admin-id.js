const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';

async function getAdminUserId() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Find admin user
    const adminUser = await usersCollection.findOne({ role: 'admin' });

    if (adminUser) {
      console.log('👤 Admin User Found:');
      console.log('═'.repeat(50));
      console.log(`Name: ${adminUser.firstName} ${adminUser.lastName}`);
      console.log(`Email: ${adminUser.email}`);
      console.log(`User ID: ${adminUser._id.toString()}`);
      console.log(`Role: ${adminUser.role}`);
      console.log('═'.repeat(50));
      console.log(`\n📝 Copy this ID for the import script: ${adminUser._id.toString()}`);
    } else {
      console.log('❌ No admin user found in the database.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed.');
  }
}

getAdminUserId();
