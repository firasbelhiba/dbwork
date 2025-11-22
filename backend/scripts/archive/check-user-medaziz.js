const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/dbwork';

async function checkUser() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB\n');

    const db = client.db();
    const usersCollection = db.collection('users');
    const projectsCollection = db.collection('projects');

    // Find Med Aziz Ben Ismail
    const user = await usersCollection.findOne({
      $or: [
        { firstName: /med/i, lastName: /aziz/i },
        { firstName: /aziz/i },
        { email: /medaziz/i },
        { email: /aziz/i }
      ]
    });

    if (!user) {
      console.log('❌ User not found');
      // List all users to find the correct one
      console.log('\n=== ALL USERS ===');
      const allUsers = await usersCollection.find({}).toArray();
      allUsers.forEach((u, i) => {
        console.log(`${i + 1}. ${u.firstName} ${u.lastName} (${u.email}) - ID: ${u._id}`);
      });
      return;
    }

    console.log('✅ Found user:', user.firstName, user.lastName);
    console.log('Email:', user.email);
    console.log('ID:', user._id);
    console.log('Role:', user.role);

    // Check if user is member of Talent AI project
    const projectId = '68ff80126d57d8e73e9f839f';
    const project = await projectsCollection.findOne({ _id: new ObjectId(projectId) });

    if (project) {
      console.log('\n=== PROJECT: Talent AI ===');
      console.log('Members:', project.members?.length || 0);

      const isMember = project.members?.some(member =>
        member.userId.toString() === user._id.toString()
      );

      console.log('\nIs user a member?', isMember ? '✅ YES' : '❌ NO');

      if (project.members) {
        console.log('\n=== ALL PROJECT MEMBERS ===');
        for (const member of project.members) {
          const memberUser = await usersCollection.findOne({ _id: new ObjectId(member.userId) });
          if (memberUser) {
            console.log(`- ${memberUser.firstName} ${memberUser.lastName} (${memberUser.email})`);
          } else {
            console.log(`- Unknown user (${member.userId})`);
          }
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

checkUser();
