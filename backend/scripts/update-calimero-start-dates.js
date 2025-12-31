const mongoose = require('mongoose');
require('dotenv').config();

// Project ID for Calimero
const PROJECT_ID = '6937ff1d68ecdf6c2f6f8a4b';

// Tasks data with start dates from Excel (DD/MM/YYYY format)
const taskStartDates = {
  'CALM-1': '07/12/2025',
  'CALM-2': '07/12/2025',
  'CALM-3': '08/12/2025',
  'CALM-4': '07/12/2025',
  'CALM-5': '20/12/2025',
  'CALM-6': '27/12/2025',
  'CALM-7': '10/01/2026',
  'CALM-8': '20/01/2026',
  'CALM-9': '31/01/2026',
  'CALM-10': '31/01/2026',
  'CALM-11': '15/01/2026',
  'CALM-12': '01/01/2026',
  'CALM-13': '15/01/2026',
  'CALM-14': '01/01/2026',
  'CALM-15': '15/01/2026',
  'CALM-16': '15/12/2025',
  'CALM-17': '15/12/2025',
  'CALM-18': '15/01/2026',
  'CALM-19': '22/12/2025',
  'CALM-20': '31/01/2026',
  'CALM-21': '07/12/2025',
  'CALM-22': '07/12/2025',
  'CALM-23': '15/12/2025',
  'CALM-24': '15/12/2025',
  'CALM-25': '15/12/2025',
  'CALM-26': '15/12/2025',
  'CALM-27': '15/12/2025',
  'CALM-28': '22/12/2025',
  'CALM-29': '22/12/2025',
  'CALM-30': '22/12/2025',
  'CALM-31': '22/12/2025',
  'CALM-32': '08/01/2026',
  'CALM-33': '08/01/2026',
  'CALM-34': '08/01/2026',
  'CALM-35': '08/01/2026',
  'CALM-36': '31/12/2025',
  'CALM-37': '31/01/2026',
  'CALM-38': '28/02/2026',
  'CALM-39': '07/12/2025',
  'CALM-40': '15/01/2026',
  'CALM-41': '01/02/2026',
  'CALM-42': '01/02/2026',
  'CALM-43': '01/02/2026',
  'CALM-44': '15/02/2026',
  'CALM-45': '15/02/2026',
  'CALM-46': '15/02/2026',
  'CALM-47': '15/02/2026',
  'CALM-48': '15/02/2026',
  'CALM-49': '15/02/2026',
  'CALM-50': '08/01/2026',
  'CALM-51': '31/12/2025',
  'CALM-52': '31/01/2026',
  'CALM-53': '28/02/2026',
  'CALM-54': '07/12/2025',
  'CALM-55': '07/12/2025',
  'CALM-56': '15/12/2025',
  'CALM-57': '15/01/2026',
  'CALM-58': '15/12/2025',
  'CALM-59': '15/01/2026',
  'CALM-60': '15/01/2026',
  'CALM-61': '15/01/2026',
  'CALM-62': '01/01/2026',
  'CALM-63': '31/12/2025',
  'CALM-64': '31/01/2026',
  'CALM-65': '28/02/2026',
  'CALM-66': '07/12/2025',
  'CALM-67': '07/12/2025',
  'CALM-68': '15/12/2025',
  'CALM-69': '22/12/2025',
  'CALM-70': '22/12/2025',
  'CALM-71': '22/12/2025',
  'CALM-72': '01/01/2026',
  'CALM-73': '08/01/2026',
  'CALM-74': '08/01/2026',
  'CALM-75': '31/01/2026',
  'CALM-76': '28/02/2026',
  'CALM-77': '31/03/2026',
  'CALM-78': '07/12/2025',
  'CALM-79': '15/12/2025',
  'CALM-80': '01/01/2026',
  'CALM-81': '15/01/2026',
  'CALM-82': '22/12/2025',
  'CALM-83': '31/01/2026',
  'CALM-84': '07/12/2025',
  'CALM-85': '15/12/2025',
  'CALM-86': '01/01/2026',
  'CALM-87': '15/01/2026',
  'CALM-88': '15/01/2026',
  'CALM-89': '01/02/2026',
  'CALM-90': '01/02/2026',
  'CALM-91': '15/02/2026',
  'CALM-92': '15/02/2026',
  'CALM-93': '01/01/2026',
  'CALM-94': '01/01/2026',
  'CALM-95': '15/01/2026',
  'CALM-96': '07/12/2025',
  'CALM-97': '07/12/2025',
  'CALM-98': '15/12/2025',
  'CALM-99': '01/01/2026',
  'CALM-100': '15/01/2026',
  'CALM-101': '15/01/2026',
  'CALM-102': '01/02/2026',
  'CALM-103': '01/02/2026',
  'CALM-104': '15/02/2026',
  'CALM-105': '01/03/2026',
  'CALM-106': '01/03/2026',
  'CALM-107': '01/03/2026',
  'CALM-108': '15/03/2026',
  'CALM-109': '01/04/2026',
  'CALM-110': '01/04/2026',
  'CALM-111': '07/12/2025',
  'CALM-112': '15/12/2025',
  'CALM-113': '01/02/2026',
  'CALM-114': '01/02/2026',
  'CALM-115': '15/02/2026',
  'CALM-116': '15/02/2026',
  'CALM-117': '01/03/2026',
  'CALM-118': '01/03/2026',
  'CALM-119': '15/03/2026',
  'CALM-120': '01/01/2026',
  'CALM-121': '01/01/2026',
  'CALM-122': '15/01/2026',
  'CALM-123': '15/01/2026',
  'CALM-124': '01/02/2026',
  'CALM-125': '01/03/2026',
};

// Parse date from DD/MM/YYYY format
function parseDate(dateStr) {
  if (!dateStr) return null;
  const [day, month, year] = dateStr.split('/');
  return new Date(`${year}-${month}-${day}`);
}

async function updateStartDates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const issuesCollection = db.collection('issues');

    let updated = 0;
    let errors = 0;

    for (const [key, startDateStr] of Object.entries(taskStartDates)) {
      try {
        const startDate = parseDate(startDateStr);

        const result = await issuesCollection.updateOne(
          { key: key },
          { $set: { startDate: startDate } }
        );

        if (result.matchedCount > 0) {
          console.log(`✓ Updated ${key} with startDate: ${startDateStr}`);
          updated++;
        } else {
          console.log(`⚠ Issue ${key} not found`);
        }
      } catch (error) {
        console.error(`✗ Error updating ${key}:`, error.message);
        errors++;
      }
    }

    console.log('\n========================================');
    console.log(`Update complete!`);
    console.log(`Updated: ${updated} issues`);
    console.log(`Errors: ${errors}`);
    console.log('========================================');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

updateStartDates();
