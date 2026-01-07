/**
 * Script to log Claude Code session work as a ticket in Dar Blockchain project
 *
 * Usage: node scripts/log-claude-session.js
 *
 * Before running, update the SESSION object with the current session details.
 */

const mongoose = require('mongoose');
const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// ============================================================
// SESSION DETAILS - UPDATE THESE FOR EACH SESSION
// ============================================================
const SESSION = {
  title: 'Implement Organizations management feature',
  description: `## Summary
Added Organizations feature to admin settings allowing admins to create organizations, manage members with roles, and optionally assign projects to organizations.

## Changes Made

### Backend (8 new files)
1. **organization.schema.ts**: Organization entity with name, key, description, logo, creator, members with roles
2. **DTOs**: create-organization, update-organization, add-member DTOs
3. **organizations.service.ts**: Full CRUD, member management (add/remove/update roles), logo upload via Cloudinary
4. **organizations.controller.ts**: REST API endpoints with admin-only access control
5. **organizations.module.ts**: Module registration

### Backend (4 modified files)
6. **app.module.ts**: Registered OrganizationsModule
7. **project.schema.ts**: Added optional organizationId field
8. **create-project.dto.ts**: Added organizationId
9. **update-project.dto.ts**: Added organizationId

### Frontend (4 new files)
10. **organization.ts**: TypeScript interfaces
11. **admin/organizations/page.tsx**: Admin page with grid view, search, archive toggle
12. **OrganizationFormModal.tsx**: Create/Edit form with logo upload
13. **OrganizationMembersModal.tsx**: Member management with role selection

### Frontend (1 modified file)
14. **api.ts**: Added organizationsAPI methods

## Features
- CRUD operations for organizations (admin only)
- Member management with role assignment (Admin, PM, Developer, Viewer)
- Logo upload/remove via Cloudinary
- Optional project assignment to organizations
- Search and archive filter on admin page`,

  timeSpentMinutes: 45,
  assigneeEmail: 'firasbenhiba49@gmail.com', // Santa Admin
  projectKey: 'MKT', // Dar Blockchain
  type: 'task',
  priority: 'medium',
  category: 'development',
  labels: ['organizations', 'admin'],
};
// ============================================================

const API_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function main() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // Find project
    const project = await db.collection('projects').findOne({ key: SESSION.projectKey });
    if (!project) {
      throw new Error(`Project with key "${SESSION.projectKey}" not found`);
    }
    console.log(`Found project: ${project.name} (${project.key})`);

    // Find user
    const user = await db.collection('users').findOne({ email: SESSION.assigneeEmail });
    if (!user) {
      throw new Error(`User with email "${SESSION.assigneeEmail}" not found`);
    }
    console.log(`Found user: ${user.firstName} ${user.lastName}`);

    // Generate a JWT token for the user
    const token = jwt.sign(
      { sub: user._id.toString(), email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const now = new Date();

    // Create issue via API
    const issueData = {
      projectId: project._id.toString(),
      title: SESSION.title,
      description: SESSION.description,
      type: SESSION.type,
      priority: SESSION.priority,
      status: 'done',
      assignees: [user._id.toString()],
      labels: SESSION.labels,
      category: SESSION.category,
      startDate: now.toISOString(),
      dueDate: now.toISOString(),
      estimatedHours: Math.round(SESSION.timeSpentMinutes / 60 * 10) / 10,
    };

    console.log(`\nCreating issue via API: ${API_URL}/issues`);

    const response = await axios.post(`${API_URL}/issues`, issueData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const createdIssue = response.data;

    console.log('\n========================================');
    console.log('✅ TICKET CREATED SUCCESSFULLY');
    console.log('========================================');
    console.log(`Issue Key:    ${createdIssue.key}`);
    console.log(`Title:        ${SESSION.title}`);
    console.log(`Project:      ${project.name} (${SESSION.projectKey})`);
    console.log(`Assignee:     ${user.firstName} ${user.lastName}`);
    console.log(`Time Est:     ${SESSION.timeSpentMinutes} minutes`);
    console.log(`Status:       ${createdIssue.status}`);
    console.log(`Type:         ${SESSION.type}`);
    console.log(`Priority:     ${SESSION.priority}`);
    console.log(`Category:     ${SESSION.category}`);
    console.log(`Labels:       ${SESSION.labels.join(', ')}`);
    console.log(`ID:           ${createdIssue._id}`);
    console.log('========================================\n');

  } catch (error) {
    if (error.response) {
      console.error('❌ API Error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

main();
