const fs = require('fs');
const path = require('path');

// Sprint 2 ID from the database (already created)
const SPRINT_2_ID = '6908a34f4e02fa9ee678bdec';
const SPRINT_2_NAME = 'Sprint 2: Hackathon Creation & Management';

// Read the 4hacks.txt file and parse EPIC 2
const txtFilePath = path.join(__dirname, '4hacks.txt');
const txtContent = fs.readFileSync(txtFilePath, 'utf-8');
const lines = txtContent.split('\n');

// Extract EPIC 2 section (lines 194-358)
const epic2Lines = lines.slice(193, 358); // 0-indexed, so 193 = line 194

const tickets = [];
let currentTask = null;
let description = '';

// Helper to determine task type and priority
function getTaskMetadata(taskLine) {
  const type = 'task'; // All are tasks for now
  let priority = 'medium';
  let estimatedHours = 8;
  let storyPoints = 5;

  // Determine priority and estimates based on keywords
  if (taskLine.includes('Database') || taskLine.includes('Schema') || taskLine.includes('Infrastructure')) {
    priority = 'critical';
    estimatedHours = 16;
    storyPoints = 8;
  } else if (taskLine.includes('Security') || taskLine.includes('Validation') || taskLine.includes('Authentication')) {
    priority = 'high';
    estimatedHours = 12;
    storyPoints = 8;
  } else if (taskLine.includes('Test') || taskLine.includes('Documentation') || taskLine.includes('DOC-') || taskLine.includes('QA-')) {
    priority = 'low';
    estimatedHours = 6;
    storyPoints = 3;
  } else if (taskLine.includes('Build') || taskLine.includes('Create') || taskLine.includes('Implement')) {
    priority = 'high';
    estimatedHours = 10;
    storyPoints = 5;
  }

  return { type, priority, estimatedHours, storyPoints };
}

// Helper to determine labels
function getLabels(taskId, description) {
  const labels = ['sprint-2'];

  if (taskId.startsWith('FE-')) labels.push('frontend');
  if (taskId.startsWith('BE-')) labels.push('backend');
  if (taskId.startsWith('DO-')) labels.push('devops');
  if (taskId.startsWith('QA-')) labels.push('testing');
  if (taskId.startsWith('DOC-')) labels.push('documentation');

  if (description.toLowerCase().includes('wizard') || description.toLowerCase().includes('form')) labels.push('forms');
  if (description.toLowerCase().includes('upload') || description.toLowerCase().includes('image')) labels.push('file-upload');
  if (description.toLowerCase().includes('email')) labels.push('email');
  if (description.toLowerCase().includes('api')) labels.push('api');
  if (description.toLowerCase().includes('database') || description.toLowerCase().includes('schema')) labels.push('database');
  if (description.toLowerCase().includes('theme') || description.toLowerCase().includes('customization')) labels.push('customization');

  return labels;
}

// Parse EPIC 2
for (let i = 0; i < epic2Lines.length; i++) {
  const line = epic2Lines[i].trim();

  // Skip empty lines and section headers
  if (!line || line.startsWith('EPIC') || line.startsWith('Feature') || line.startsWith('🎨') || line.startsWith('💻') || line.startsWith('🔧') || line.startsWith('🧪') || line.startsWith('📚')) {
    continue;
  }

  // Check if this is a task ID line
  const taskMatch = line.match(/^([A-Z]+-\d+\.\d+\.\d+):\s*(.+)$/);

  if (taskMatch) {
    // Save previous task if exists
    if (currentTask) {
      const metadata = getTaskMetadata(currentTask.title);
      const labels = getLabels(currentTask.id, description);

      tickets.push({
        title: currentTask.title,
        description: description.trim(),
        type: metadata.type,
        priority: metadata.priority,
        status: 'todo',
        labels: labels,
        storyPoints: metadata.storyPoints,
        estimatedHours: metadata.estimatedHours,
        sprint: SPRINT_2_NAME,
        sprintId: SPRINT_2_ID
      });
    }

    // Start new task
    currentTask = {
      id: taskMatch[1],
      title: taskMatch[2]
    };
    description = '';
  } else if (currentTask && line) {
    // This is a description line
    description += (description ? ' ' : '') + line;
  }
}

// Save the last task
if (currentTask) {
  const metadata = getTaskMetadata(currentTask.title);
  const labels = getLabels(currentTask.id, description);

  tickets.push({
    title: currentTask.title,
    description: description.trim(),
    type: metadata.type,
    priority: metadata.priority,
    status: 'todo',
    labels: labels,
    storyPoints: metadata.storyPoints,
    estimatedHours: metadata.estimatedHours,
    sprint: SPRINT_2_NAME,
    sprintId: SPRINT_2_ID
  });
}

console.log(`\n📋 Parsed ${tickets.length} tickets from EPIC 2\n`);

// Read existing JSON
const jsonFilePath = path.join(__dirname, '4hacks-tickets.json');
const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));

// Add Sprint 2 tickets to existing tickets
jsonData.tickets.push(...tickets);

// Write updated JSON
fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2), 'utf-8');

console.log(`✅ Added ${tickets.length} Sprint 2 tickets to 4hacks-tickets.json`);
console.log(`📊 Total tickets in JSON: ${jsonData.tickets.length}\n`);

// Display summary
const sprint2Count = jsonData.tickets.filter(t => t.sprint === SPRINT_2_NAME).length;
const sprint2Points = jsonData.tickets
  .filter(t => t.sprint === SPRINT_2_NAME)
  .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

console.log('📅 Sprint 2 Summary:');
console.log(`   Tickets: ${sprint2Count}`);
console.log(`   Story Points: ${sprint2Points}`);
console.log(`   Priority Breakdown:`);

const priorityCounts = {};
tickets.forEach(t => {
  priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
});

Object.entries(priorityCounts).forEach(([priority, count]) => {
  console.log(`     ${priority}: ${count}`);
});
