const mongoose = require('mongoose');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workhole';

async function sniffTicketCategories() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    const Project = mongoose.connection.collection('projects');
    const Issue = mongoose.connection.collection('issues');

    // Get all projects
    const projects = await Project.find({}).sort({ name: 1 }).toArray();
    console.log(`Found ${projects.length} projects\n`);

    // Get the first project argument or default to first project
    const projectIndex = parseInt(process.argv[2]) || 0;

    if (projectIndex >= projects.length) {
      console.error(`Project index ${projectIndex} is out of range. Max: ${projects.length - 1}`);
      process.exit(1);
    }

    const project = projects[projectIndex];

    console.log('='.repeat(80));
    console.log(`PROJECT ${projectIndex + 1}/${projects.length}: ${project.name}`);
    console.log(`Key: ${project.key}`);
    console.log(`ID: ${project._id}`);
    console.log('='.repeat(80));
    console.log('');

    // Get all issues for this project
    const issues = await Issue.find({ projectId: project._id }).sort({ key: 1 }).toArray();

    console.log(`Total issues: ${issues.length}\n`);

    // Group by category
    const byCategory = {};
    const noCategoryIssues = [];

    for (const issue of issues) {
      const category = issue.category || null;

      if (!category) {
        noCategoryIssues.push(issue);
      } else {
        if (!byCategory[category]) {
          byCategory[category] = [];
        }
        byCategory[category].push(issue);
      }
    }

    // Print summary
    console.log('CATEGORY SUMMARY:');
    console.log('-'.repeat(40));

    const categories = Object.keys(byCategory).sort();
    for (const cat of categories) {
      console.log(`  ${cat}: ${byCategory[cat].length} issues`);
    }
    console.log(`  (no category): ${noCategoryIssues.length} issues`);
    console.log('');

    // Print detailed list
    console.log('DETAILED ISSUE LIST:');
    console.log('-'.repeat(80));
    console.log('');

    // First show issues with categories
    for (const cat of categories) {
      console.log(`📁 ${cat.toUpperCase()} (${byCategory[cat].length} issues)`);
      for (const issue of byCategory[cat]) {
        const status = issue.status ? `[${issue.status}]` : '';
        console.log(`   ${issue.key}: ${issue.title?.substring(0, 50)}... ${status}`);
      }
      console.log('');
    }

    // Then show issues without category
    if (noCategoryIssues.length > 0) {
      console.log(`📁 NO CATEGORY (${noCategoryIssues.length} issues)`);
      for (const issue of noCategoryIssues) {
        const status = issue.status ? `[${issue.status}]` : '';
        const type = issue.type ? `(${issue.type})` : '';
        console.log(`   ${issue.key}: ${issue.title?.substring(0, 50)}... ${type} ${status}`);
      }
      console.log('');
    }

    // Print which tab each issue would appear in
    console.log('');
    console.log('TAB DISTRIBUTION:');
    console.log('-'.repeat(40));

    const TEAM_CATEGORIES = {
      dev: ['frontend', 'backend', 'devops', 'qa', 'infrastructure', 'security'],
      design: ['design'],
      marketing: ['marketing', 'documentation'],
    };

    let devCount = 0;
    let designCount = 0;
    let marketingCount = 0;
    let allOnlyCount = 0; // Issues that only appear in "All" tab

    for (const issue of issues) {
      const cat = issue.category?.toLowerCase();

      if (!cat) {
        allOnlyCount++;
      } else if (TEAM_CATEGORIES.dev.includes(cat)) {
        devCount++;
      } else if (TEAM_CATEGORIES.design.includes(cat)) {
        designCount++;
      } else if (TEAM_CATEGORIES.marketing.includes(cat)) {
        marketingCount++;
      } else {
        allOnlyCount++; // "other" or unknown categories
      }
    }

    console.log(`  All tab: ${issues.length} issues (everything)`);
    console.log(`  Dev tab: ${devCount} issues`);
    console.log(`  Design tab: ${designCount} issues`);
    console.log(`  Marketing tab: ${marketingCount} issues`);
    console.log(`  Only in "All" tab: ${allOnlyCount} issues (no category or "other")`);

    // List all projects for reference
    console.log('');
    console.log('');
    console.log('ALL PROJECTS (use index as argument):');
    console.log('-'.repeat(40));
    projects.forEach((p, i) => {
      const marker = i === projectIndex ? '→' : ' ';
      console.log(`${marker} [${i}] ${p.name} (${p.key})`);
    });

  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed.');
  }
}

sniffTicketCategories();
