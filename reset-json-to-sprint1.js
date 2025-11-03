const fs = require('fs');
const path = require('path');

const jsonFilePath = path.join(__dirname, '4hacks-tickets.json');
const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));

// Keep only Sprint 1 tickets
const sprint1Tickets = jsonData.tickets.filter(t =>
  t.sprint === 'Sprint 1: User Management & Authentication'
);

console.log(`📋 Original tickets: ${jsonData.tickets.length}`);
console.log(`📋 Sprint 1 tickets: ${sprint1Tickets.length}`);
console.log(`🗑️  Removing ${jsonData.tickets.length - sprint1Tickets.length} tickets\n`);

jsonData.tickets = sprint1Tickets;

// Update sprint IDs to correct ones
jsonData.sprints = [
  {
    "name": "Sprint 1: User Management & Authentication",
    "id": "6908a34f4e02fa9ee678bde9",
    "goal": "Complete user management system including authentication, authorization, role management, and user profiles.",
    "startDate": "2025-11-03",
    "endDate": "2025-11-24",
    "status": "planned"
  },
  {
    "name": "Sprint 2: Hackathon Creation & Management",
    "id": "6908a34f4e02fa9ee678bdec",
    "goal": "Implement hackathon builder and visual customization tools for organizers.",
    "startDate": "2025-11-25",
    "endDate": "2025-12-15",
    "status": "planned"
  },
  {
    "name": "Sprint 3: Registration & Team Management",
    "id": "6908a34f4e02fa9ee678bdef",
    "goal": "Build registration system and team formation features.",
    "startDate": "2025-12-16",
    "endDate": "2026-01-05",
    "status": "planned"
  },
  {
    "name": "Sprint 4: Project Submission & Showcase",
    "id": "6908a34f4e02fa9ee678bdf2",
    "goal": "Create project submission portal and gallery system.",
    "startDate": "2026-01-06",
    "endDate": "2026-01-26",
    "status": "planned"
  },
  {
    "name": "Sprint 5: Judging System",
    "id": "6908a34f4e02fa9ee678bdf5",
    "goal": "Implement judge management, scoring, and results system.",
    "startDate": "2026-01-27",
    "endDate": "2026-02-16",
    "status": "planned"
  },
  {
    "name": "Sprint 6: Communication & Community",
    "id": "6908a34f4e02fa9ee678bdf8",
    "goal": "Build discussion forums, networking features, and communication tools.",
    "startDate": "2026-02-17",
    "endDate": "2026-03-09",
    "status": "planned"
  }
];

// Also fix Sprint 1 ticket sprintIds
jsonData.tickets = jsonData.tickets.map(ticket => ({
  ...ticket,
  sprintId: "6908a34f4e02fa9ee678bde9"
}));

fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2), 'utf-8');

console.log('✅ JSON reset to Sprint 1 only with correct IDs');
console.log(`📊 Total tickets: ${jsonData.tickets.length}`);
