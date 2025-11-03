const fs = require('fs');
const path = require('path');

// Sprint configurations with correct IDs from the database
const SPRINTS_CONFIG = [
  {
    id: '6908a34f4e02fa9ee678bdef',
    name: 'Sprint 3: Registration & Team Management',
    startLine: 359,
    endLine: 543
  },
  {
    id: '6908a34f4e02fa9ee678bdf2',
    name: 'Sprint 4: Project Submission & Showcase',
    startLine: 544,
    endLine: 727
  },
  {
    id: '6908a34f4e02fa9ee678bdf5',
    name: 'Sprint 5: Judging System',
    startLine: 728,
    endLine: 927
  },
  {
    id: '6908a34f4e02fa9ee678bdf8',
    name: 'Sprint 6: Communication & Community',
    startLine: 928,
    endLine: 1067
  }
];

// Helper to determine task type and priority
function getTaskMetadata(taskLine) {
  const type = 'task';
  let priority = 'medium';
  let estimatedHours = 8;
  let storyPoints = 5;

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
function getLabels(taskId, description, sprintNumber) {
  const labels = [`sprint-${sprintNumber}`];

  if (taskId.startsWith('FE-')) labels.push('frontend');
  if (taskId.startsWith('BE-')) labels.push('backend');
  if (taskId.startsWith('DO-')) labels.push('devops');
  if (taskId.startsWith('QA-')) labels.push('testing');
  if (taskId.startsWith('DOC-')) labels.push('documentation');

  const lowerDesc = description.toLowerCase();
  if (lowerDesc.includes('team')) labels.push('team-management');
  if (lowerDesc.includes('registration')) labels.push('registration');
  if (lowerDesc.includes('submission') || lowerDesc.includes('project')) labels.push('submission');
  if (lowerDesc.includes('judge') || lowerDesc.includes('scoring')) labels.push('judging');
  if (lowerDesc.includes('communication') || lowerDesc.includes('chat')) labels.push('communication');
  if (lowerDesc.includes('api')) labels.push('api');
  if (lowerDesc.includes('database') || lowerDesc.includes('schema')) labels.push('database');

  return labels;
}

// Parse a sprint section
function parseSprintSection(lines, sprintConfig, sprintNumber) {
  const tickets = [];
  let currentTask = null;
  let description = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines and section headers
    if (!line || line.startsWith('EPIC') || line.startsWith('Feature') ||
        line.startsWith('🎨') || line.startsWith('💻') ||
        line.startsWith('🔧') || line.startsWith('🧪') || line.startsWith('📚')) {
      continue;
    }

    // Check if this is a task ID line
    const taskMatch = line.match(/^([A-Z]+-\d+\.\d+\.\d+):\s*(.+)$/);

    if (taskMatch) {
      // Save previous task if exists
      if (currentTask) {
        const metadata = getTaskMetadata(currentTask.title);
        const labels = getLabels(currentTask.id, description, sprintNumber);

        tickets.push({
          title: currentTask.title,
          description: description.trim(),
          type: metadata.type,
          priority: metadata.priority,
          status: 'todo',
          labels: labels,
          storyPoints: metadata.storyPoints,
          estimatedHours: metadata.estimatedHours,
          sprint: sprintConfig.name,
          sprintId: sprintConfig.id
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
    const labels = getLabels(currentTask.id, description, sprintNumber);

    tickets.push({
      title: currentTask.title,
      description: description.trim(),
      type: metadata.type,
      priority: metadata.priority,
      status: 'todo',
      labels: labels,
      storyPoints: metadata.storyPoints,
      estimatedHours: metadata.estimatedHours,
      sprint: sprintConfig.name,
      sprintId: sprintConfig.id
    });
  }

  return tickets;
}

// Main function
function addAllRemainingSprints() {
  console.log('🚀 Adding all remaining sprints (3-6)...\n');

  // Read the 4hacks.txt file
  const txtFilePath = path.join(__dirname, '4hacks.txt');
  const txtContent = fs.readFileSync(txtFilePath, 'utf-8');
  const allLines = txtContent.split('\n');

  // Read existing JSON
  const jsonFilePath = path.join(__dirname, '4hacks-tickets.json');
  const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));

  let totalNewTickets = 0;

  // Process each sprint
  SPRINTS_CONFIG.forEach((sprintConfig, index) => {
    const sprintNumber = index + 3; // Sprint 3, 4, 5, 6
    console.log(`📋 Processing ${sprintConfig.name}...`);

    // Extract lines for this sprint (0-indexed, so subtract 1)
    const sprintLines = allLines.slice(sprintConfig.startLine - 1, sprintConfig.endLine);

    // Parse tickets
    const tickets = parseSprintSection(sprintLines, sprintConfig, sprintNumber);

    console.log(`   ✅ Parsed ${tickets.length} tickets`);
    console.log(`   📊 Story Points: ${tickets.reduce((sum, t) => sum + (t.storyPoints || 0), 0)}`);

    // Add to JSON
    jsonData.tickets.push(...tickets);
    totalNewTickets += tickets.length;

    console.log('');
  });

  // Write updated JSON
  fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2), 'utf-8');

  console.log('═'.repeat(60));
  console.log(`✅ Added ${totalNewTickets} tickets for Sprints 3-6`);
  console.log(`📊 Total tickets in JSON: ${jsonData.tickets.length}`);
  console.log('═'.repeat(60));

  // Display summary by sprint
  console.log('\n📅 Sprint Summary:\n');
  SPRINTS_CONFIG.forEach(sprintConfig => {
    const sprintTickets = jsonData.tickets.filter(t => t.sprint === sprintConfig.name);
    const points = sprintTickets.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
    console.log(`${sprintConfig.name}:`);
    console.log(`  Tickets: ${sprintTickets.length}`);
    console.log(`  Story Points: ${points}`);
    console.log('');
  });
}

addAllRemainingSprints();
