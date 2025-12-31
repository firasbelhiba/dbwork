/**
 * Fix conversation participant
 * Adds missing user to conversation participants
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

// Conversation ID from the error
const CONVERSATION_ID = '69530a3d06b30ed1d885ad5c';

async function fixConversation() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Get the conversation
    const conversation = await db.collection('conversations').findOne({
      _id: new mongoose.Types.ObjectId(CONVERSATION_ID)
    });

    if (!conversation) {
      console.log('Conversation not found');
      return;
    }

    console.log('Current conversation:', {
      _id: conversation._id,
      type: conversation.type,
      participants: conversation.participants.map(p => p.toString()),
    });

    // Get the current user (you - Firas)
    const currentUser = await db.collection('users').findOne({
      email: 'firas.belhiba@gmail.com'
    });

    if (!currentUser) {
      console.log('User not found');
      return;
    }

    console.log('Current user:', {
      _id: currentUser._id.toString(),
      email: currentUser.email,
      firstName: currentUser.firstName,
    });

    // Check if user is already a participant
    const isParticipant = conversation.participants.some(
      p => p.toString() === currentUser._id.toString()
    );

    if (isParticipant) {
      console.log('User is already a participant!');
      return;
    }

    console.log('User is NOT a participant. Adding them...');

    // Add user to participants
    await db.collection('conversations').updateOne(
      { _id: conversation._id },
      { 
        $push: { 
          participants: currentUser._id,
          readReceipts: {
            userId: currentUser._id,
            lastReadAt: new Date(),
            unreadCount: 0
          }
        } 
      }
    );

    console.log('User added to conversation successfully!');

    // Verify
    const updated = await db.collection('conversations').findOne({
      _id: new mongoose.Types.ObjectId(CONVERSATION_ID)
    });
    console.log('Updated participants:', updated.participants.map(p => p.toString()));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixConversation();
