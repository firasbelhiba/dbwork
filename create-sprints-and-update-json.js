const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';

// Project ID for 4Hacks
const PROJECT_ID = '69034d749fda89142fb7cc2b';

// Sprint Status Enum
const SprintStatus = {
  PLANNED: 'planned',
  ACTIVE: 'active',
  COMPLETED: 'completed',
};

// Define Sprint Schema
const sprintSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  name: { type: String, required: true },
  goal: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: Object.values(SprintStatus), default: SprintStatus.PLANNED },
  issues: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Issue' }],
  completedPoints: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  completedAt: { type: Date },
}, { timestamps: true });

const Sprint = mongoose.model('Sprint', sprintSchema);

async function createSprintsAndUpdateJSON() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Read the JSON file
    console.log('📖 Reading 4hacks-tickets.json...');
    const jsonFilePath = path.join(__dirname, '4hacks-tickets.json');
    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));

    const { projectName, projectKey, sprints: sprintsData, tickets } = jsonData;
    console.log(`📋 Project: ${projectName} (${projectKey})`);
    console.log(`📅 Sprints to create: ${sprintsData.length}\n`);

    // Step 1: Create all sprints and store their IDs
    console.log('🚀 Step 1: Creating sprints in database...');
    console.log('═'.repeat(70));

    const sprintMap = new Map(); // Map sprint name to sprint ID
    const createdSprints = [];

    for (let i = 0; i < sprintsData.length; i++) {
      const sprintData = sprintsData[i];

      // Check if sprint already exists
      const existingSprint = await Sprint.findOne({
        projectId: new mongoose.Types.ObjectId(PROJECT_ID),
        name: sprintData.name
      });

      if (existingSprint) {
        console.log(`  ⚠️  Sprint already exists: ${sprintData.name}`);
        console.log(`     ID: ${existingSprint._id}`);
        sprintMap.set(sprintData.name, existingSprint._id.toString());
        createdSprints.push({
          name: sprintData.name,
          id: existingSprint._id.toString(),
          goal: existingSprint.goal,
          startDate: existingSprint.startDate,
          endDate: existingSprint.endDate,
          status: existingSprint.status
        });
      } else {
        const sprint = new Sprint({
          projectId: new mongoose.Types.ObjectId(PROJECT_ID),
          name: sprintData.name,
          goal: sprintData.goal,
          startDate: new Date(sprintData.startDate),
          endDate: new Date(sprintData.endDate),
          status: sprintData.status,
        });

        await sprint.save();
        sprintMap.set(sprintData.name, sprint._id.toString());
        createdSprints.push({
          name: sprintData.name,
          id: sprint._id.toString(),
          goal: sprint.goal,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
          status: sprint.status
        });

        console.log(`  ✅ Created Sprint ${i + 1}: ${sprintData.name}`);
        console.log(`     ID: ${sprint._id}`);
        console.log(`     Goal: ${sprint.goal}`);
        console.log(`     Duration: ${sprintData.startDate} to ${sprintData.endDate}`);
        console.log('');
      }
    }

    console.log('═'.repeat(70));
    console.log(`✅ All ${createdSprints.length} sprints processed!\n`);

    // Step 2: Update the JSON file with sprint IDs
    console.log('🚀 Step 2: Updating JSON file with sprint IDs...');
    console.log('═'.repeat(70));

    // Add sprintId to each ticket
    let updatedTickets = 0;
    const updatedTicketsList = tickets.map(ticket => {
      const sprintId = sprintMap.get(ticket.sprint);

      if (!sprintId) {
        console.warn(`⚠️  Warning: No sprint ID found for ticket "${ticket.title}" (Sprint: ${ticket.sprint})`);
        return ticket;
      }

      updatedTickets++;
      return {
        ...ticket,
        sprintId: sprintId // Add the MongoDB ObjectId
      };
    });

    // Update the JSON structure with sprint IDs
    const updatedJSON = {
      ...jsonData,
      sprints: createdSprints.map(sprint => ({
        name: sprint.name,
        id: sprint.id,
        goal: sprint.goal,
        startDate: sprint.startDate.toISOString().split('T')[0],
        endDate: sprint.endDate.toISOString().split('T')[0],
        status: sprint.status
      })),
      tickets: updatedTicketsList
    };

    // Write the updated JSON back to file
    fs.writeFileSync(
      jsonFilePath,
      JSON.stringify(updatedJSON, null, 2),
      'utf-8'
    );

    console.log(`✅ Updated ${updatedTickets} tickets with sprint IDs`);
    console.log(`✅ JSON file updated: 4hacks-tickets.json\n`);

    // Step 3: Display summary
    console.log('═'.repeat(70));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(70));
    console.log(`\n✅ Sprints Created/Found: ${createdSprints.length}`);
    console.log(`✅ Tickets Updated: ${updatedTickets}`);

    console.log('\n📅 Sprint Details:');
    console.log('─'.repeat(70));
    createdSprints.forEach((sprint, index) => {
      const ticketCount = tickets.filter(t => t.sprint === sprint.name).length;
      console.log(`\n${index + 1}. ${sprint.name}`);
      console.log(`   ID: ${sprint.id}`);
      console.log(`   Tickets: ${ticketCount}`);
      console.log(`   Duration: ${sprint.startDate.toISOString().split('T')[0]} to ${sprint.endDate.toISOString().split('T')[0]}`);
    });

    console.log('\n═'.repeat(70));
    console.log('✅ Process completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Review the updated 4hacks-tickets.json file');
    console.log('   2. Run the import script to create all issues');
    console.log('═'.repeat(70));

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed.');
  }
}

// Run the script
createSprintsAndUpdateJSON();
