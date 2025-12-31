const mongoose = require('mongoose');
require('dotenv').config();

async function checkDates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const issuesCollection = db.collection('issues');

    // Get all CALM issues
    const issues = await issuesCollection.find({ key: /^CALM-/ }).sort({ key: 1 }).toArray();

    console.log(`\nFound ${issues.length} Calimero issues\n`);
    console.log('Checking first 20 issues for date mismatches...\n');

    let mismatches = 0;

    for (const issue of issues.slice(0, 20)) {
      // Extract start date from description
      const descMatch = issue.description?.match(/Start Date: (\d{2}\/\d{2}\/\d{4})/);
      const descStartDate = descMatch ? descMatch[1] : 'Not found';

      // Format startDate field
      let fieldStartDate = 'null';
      if (issue.startDate) {
        const d = new Date(issue.startDate);
        fieldStartDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      }

      const match = descStartDate === fieldStartDate;
      if (!match) {
        mismatches++;
        console.log(`${issue.key}: ${issue.title.substring(0, 40)}...`);
        console.log(`  Description: ${descStartDate}`);
        console.log(`  Field:       ${fieldStartDate}`);
        console.log(`  MISMATCH!\n`);
      }
    }

    if (mismatches === 0) {
      console.log('All dates match!');
    } else {
      console.log(`\nFound ${mismatches} mismatches in first 20 issues`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkDates();
