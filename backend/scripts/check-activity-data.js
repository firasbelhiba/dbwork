// Diagnostic script to check activity data and user matching
const mongoose = require('mongoose');
require('dotenv').config();

async function checkActivityData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    const activitiesCollection = db.collection('activities');

    // Find Rayen Harhouri
    const rayen = await usersCollection.findOne({
      $or: [
        { firstName: { $regex: /rayen/i } },
        { lastName: { $regex: /harhouri/i } },
        { email: { $regex: /rayen/i } }
      ]
    });

    if (rayen) {
      console.log('=== RAYEN HARHOURI ===');
      console.log('User ID:', rayen._id);
      console.log('User ID type:', typeof rayen._id, rayen._id.constructor.name);
      console.log('Name:', rayen.firstName, rayen.lastName);
      console.log('Email:', rayen.email);
      console.log('isActive:', rayen.isActive);

      // Find activities for this user - try both string and ObjectId
      const activitiesByObjectId = await activitiesCollection.find({
        userId: rayen._id
      }).toArray();
      console.log('\nActivities found with ObjectId match:', activitiesByObjectId.length);

      const activitiesByString = await activitiesCollection.find({
        userId: rayen._id.toString()
      }).toArray();
      console.log('Activities found with String match:', activitiesByString.length);

      // Check what type userId is stored as in activities
      if (activitiesByObjectId.length > 0) {
        console.log('\nSample activity userId type:', typeof activitiesByObjectId[0].userId, activitiesByObjectId[0].userId?.constructor?.name);
        console.log('Sample activity:', {
          action: activitiesByObjectId[0].action,
          entityType: activitiesByObjectId[0].entityType,
          entityName: activitiesByObjectId[0].entityName,
          userId: activitiesByObjectId[0].userId,
          createdAt: activitiesByObjectId[0].createdAt
        });
      }

      // Try to find any activity with userId as string
      const allActivitiesForRayen = await activitiesCollection.find({
        $or: [
          { userId: rayen._id },
          { userId: rayen._id.toString() }
        ]
      }).toArray();
      console.log('\nTotal activities (ObjectId OR String):', allActivitiesForRayen.length);
    } else {
      console.log('Rayen Harhouri not found in database');
    }

    // Check a few sample activities to see userId types
    console.log('\n=== SAMPLE ACTIVITIES ===');
    const sampleActivities = await activitiesCollection.find().limit(5).toArray();
    sampleActivities.forEach((act, i) => {
      console.log(`Activity ${i + 1}:`, {
        userIdType: typeof act.userId,
        userIdConstructor: act.userId?.constructor?.name,
        userId: act.userId,
        action: act.action,
        entityType: act.entityType
      });
    });

    // Check total counts
    console.log('\n=== TOTALS ===');
    const totalUsers = await usersCollection.countDocuments({ isActive: { $ne: false } });
    const totalActivities = await activitiesCollection.countDocuments();
    console.log('Total active users:', totalUsers);
    console.log('Total activities:', totalActivities);

    // Check how many activities have userId as ObjectId vs String
    const activitiesWithObjectId = await activitiesCollection.aggregate([
      {
        $match: {
          $expr: { $eq: [{ $type: '$userId' }, 'objectId'] }
        }
      },
      { $count: 'count' }
    ]).toArray();

    const activitiesWithString = await activitiesCollection.aggregate([
      {
        $match: {
          $expr: { $eq: [{ $type: '$userId' }, 'string'] }
        }
      },
      { $count: 'count' }
    ]).toArray();

    console.log('Activities with userId as ObjectId:', activitiesWithObjectId[0]?.count || 0);
    console.log('Activities with userId as String:', activitiesWithString[0]?.count || 0);

    // Now test the actual leastActiveUsers query logic
    console.log('\n=== TESTING LEAST ACTIVE USERS QUERY ===');
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const leastActiveResult = await usersCollection.aggregate([
      { $match: { isActive: { $ne: false } } },
      {
        $lookup: {
          from: 'activities',
          let: { oderId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: [{ $toString: '$userId' }, { $toString: '$$oderId' }] },
                    { $gte: ['$createdAt', start] },
                    { $lte: ['$createdAt', end] },
                  ],
                },
              },
            },
          ],
          as: 'activities',
        },
      },
      {
        $addFields: {
          count: { $size: '$activities' },
        },
      },
      { $sort: { count: 1 } },
      { $limit: 15 },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          count: 1,
        },
      },
    ]).toArray();

    console.log('Least active users (last 7 days):');
    leastActiveResult.forEach((user, i) => {
      console.log(`${i + 1}. ${user.firstName} ${user.lastName}: ${user.count} activities`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

async function checkIsmaeilAndCompareQueries() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');
    const activitiesCollection = db.collection('activities');

    // Find Ismaeil
    const ismaeil = await usersCollection.findOne({
      $or: [
        { firstName: { $regex: /ismaeil/i } },
        { lastName: { $regex: /amara/i } }
      ]
    });

    if (ismaeil) {
      console.log('=== ISMAEIL AMARA ===');
      console.log('User ID:', ismaeil._id.toString());

      // Find ALL activities for Ismaeil
      const allActivities = await activitiesCollection.find({
        userId: ismaeil._id
      }).sort({ createdAt: -1 }).toArray();

      console.log('Total activities:', allActivities.length);
      if (allActivities.length > 0) {
        console.log('Most recent activity:', {
          action: allActivities[0].action,
          entityType: allActivities[0].entityType,
          entityName: allActivities[0].entityName,
          createdAt: allActivities[0].createdAt
        });
        console.log('Oldest activity:', {
          action: allActivities[allActivities.length - 1].action,
          createdAt: allActivities[allActivities.length - 1].createdAt
        });
      }
    }

    // Test with a wider date range (1 month)
    console.log('\n=== COMPARING QUERIES (LAST 30 DAYS) ===');
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    console.log('Date range:', start.toISOString(), 'to', end.toISOString());

    // Query 1: byUser (Most Active Users style - from activities)
    const byUserResults = await activitiesCollection.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$userId',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: 1 } }, // Sort ascending to get least active
      { $limit: 15 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          userName: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
          count: 1,
        },
      },
    ]).toArray();

    console.log('\nFrom ACTIVITIES (byUser style - only users WITH activity):');
    byUserResults.forEach((u, i) => {
      console.log(`${i + 1}. ${u.userName}: ${u.count}`);
    });

    // Query 2: leastActiveUsers (from users with lookup)
    const leastActiveResults = await usersCollection.aggregate([
      { $match: { isActive: { $ne: false } } },
      {
        $lookup: {
          from: 'activities',
          let: { oderId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: [{ $toString: '$userId' }, { $toString: '$$oderId' }] },
                    { $gte: ['$createdAt', start] },
                    { $lte: ['$createdAt', end] },
                  ],
                },
              },
            },
          ],
          as: 'activities',
        },
      },
      { $addFields: { count: { $size: '$activities' } } },
      { $sort: { count: 1 } },
      { $limit: 15 },
      { $project: { firstName: 1, lastName: 1, count: 1 } },
    ]).toArray();

    console.log('\nFrom USERS (leastActiveUsers style - includes 0 activity users):');
    leastActiveResults.forEach((u, i) => {
      console.log(`${i + 1}. ${u.firstName} ${u.lastName}: ${u.count}`);
    });

    // Check if Ismaeil appears in byUser results
    if (ismaeil) {
      const ismaeilInByUser = byUserResults.find(u => u._id?.toString() === ismaeil._id.toString());
      const ismaeilInLeastActive = leastActiveResults.find(u => u._id?.toString() === ismaeil._id.toString());
      console.log('\n=== ISMAEIL COMPARISON ===');
      console.log('In byUser results:', ismaeilInByUser ? `Yes, ${ismaeilInByUser.count} activities` : 'No (not in top 15 or 0 activities)');
      console.log('In leastActive results:', ismaeilInLeastActive ? `Yes, ${ismaeilInLeastActive.count} activities` : 'No');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run both checks
checkActivityData().then(() => checkIsmaeilAndCompareQueries());
