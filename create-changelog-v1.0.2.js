const { MongoClient } = require('mongodb');

async function createChangelog() {
  const client = new MongoClient('mongodb+srv://voodooooboy_db_user:3WtPNaCOrk0q0BVO@cluster0.lpetngj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db('dar-pm');
    const changelogs = db.collection('changelogs');

    const changelog = {
      version: '1.0.2',
      releaseDate: new Date('2025-11-06'),
      changes: {
        features: [
          'Added "ARCHIVED" badge to Kanban issue cards for visual indication',
          'Added "Archive All" option to column 3-dot menu with bulk archiving capability',
          'Professional confirmation modals for delete and archive actions (replacing browser alerts)',
        ],
        bugFixes: [
          'Fixed Archive All route collision - moved bulk-update route before :id route in NestJS controller',
          'Fixed Archive All modal visibility by implementing React Portal at document.body level',
          'Fixed bulkUpdate API payload format with proper nested updateData property',
          'Fixed orphaned issues (TAI-64, TAI-65) that had invalid status IDs preventing them from appearing on Kanban board',
        ],
        improvements: [
          'Added dark mode support to project list view for better consistency',
          'Replaced browser confirm() dialogs with custom styled modals matching app design',
          'Archive and delete modals now use React Portal for proper z-index handling',
          'Enhanced user experience with professional warning icons and descriptive messages',
        ],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await changelogs.insertOne(changelog);
    console.log('\n✅ Changelog v1.0.2 created successfully!');
    console.log('ID:', result.insertedId);
    console.log('\nChangelog content:');
    console.log(JSON.stringify(changelog, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nDisconnected from MongoDB');
  }
}

createChangelog();
