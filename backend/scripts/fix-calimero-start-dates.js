const mongoose = require('mongoose');
require('dotenv').config();

// Parse date from DD/MM/YYYY format
function parseDate(dateStr) {
  if (!dateStr) return null;
  const [day, month, year] = dateStr.split('/');
  return new Date(`${year}-${month}-${day}`);
}

async function fixStartDates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const issuesCollection = db.collection('issues');

    // Get all CALM issues
    const issues = await issuesCollection.find({ key: /^CALM-/ }).toArray();

    console.log(`Found ${issues.length} Calimero issues`);
    console.log('Extracting start dates from descriptions and updating...\n');

    let updated = 0;
    let errors = 0;
    let noDate = 0;

    for (const issue of issues) {
      try {
        // Extract start date from description
        const descMatch = issue.description?.match(/Start Date: (\d{2}\/\d{2}\/\d{4})/);

        if (!descMatch) {
          console.log(`⚠ ${issue.key}: No start date found in description`);
          noDate++;
          continue;
        }

        const startDateStr = descMatch[1];
        const startDate = parseDate(startDateStr);

        if (!startDate || isNaN(startDate.getTime())) {
          console.log(`⚠ ${issue.key}: Invalid date format: ${startDateStr}`);
          errors++;
          continue;
        }

        // Update the issue with the correct start date
        const result = await issuesCollection.updateOne(
          { _id: issue._id },
          { $set: { startDate: startDate } }
        );

        if (result.modifiedCount > 0) {
          console.log(`✓ ${issue.key}: Set startDate to ${startDateStr}`);
          updated++;
        } else {
          console.log(`- ${issue.key}: Already correct or no change needed`);
        }
      } catch (error) {
        console.error(`✗ Error updating ${issue.key}:`, error.message);
        errors++;
      }
    }

    console.log('\n========================================');
    console.log(`Fix complete!`);
    console.log(`Updated: ${updated} issues`);
    console.log(`No date in description: ${noDate}`);
    console.log(`Errors: ${errors}`);
    console.log('========================================');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixStartDates();
