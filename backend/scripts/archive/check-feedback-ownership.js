const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dbwork';
const feedbackId = '691c4b78d88c03575bb80346';

async function checkFeedbackOwnership() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const feedbacksCollection = db.collection('feedbacks');

    const feedback = await feedbacksCollection.findOne({
      _id: { $oid: feedbackId }
    });

    if (!feedback) {
      // Try without $oid wrapper
      const ObjectId = require('mongodb').ObjectId;
      const feedback2 = await feedbacksCollection.findOne({
        _id: new ObjectId(feedbackId)
      });

      if (feedback2) {
        console.log('\nFeedback found!');
        console.log('Feedback ID:', feedback2._id);
        console.log('User ID:', feedback2.userId);
        console.log('User ID type:', typeof feedback2.userId);
        console.log('User ID is ObjectId?', feedback2.userId instanceof ObjectId);

        // Try to find the user
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({
          _id: feedback2.userId
        });

        if (user) {
          console.log('\nUser found:');
          console.log('User _id:', user._id);
          console.log('User email:', user.email);
          console.log('User role:', user.role);
        }
      } else {
        console.log('Feedback not found with ID:', feedbackId);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkFeedbackOwnership();
