const jwt = require('jsonwebtoken');

const PROJECT_ID = '69034d749fda89142fb7cc2b';
const API_URL = 'http://localhost:3001/api';

async function testSprintAPI() {
  try {
    // Generate a JWT token for admin user
    const token = jwt.sign(
      { _id: '68f979aa2ae284487d1dacca', email: 'admin@darblockchain.com', role: 'admin' },
      'workhole-jwt-secret',
      { expiresIn: '1h' }
    );

    console.log('🔑 Testing Sprint API with token...\n');

    // Test 1: Get all sprints for project
    const url = `${API_URL}/sprints?projectId=${PROJECT_ID}`;
    console.log('📡 GET ' + url + '\n');

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await response.json();

    console.log(`✅ Status: ${response.status}`);
    console.log(`📊 Found ${data.length} sprints\n`);

    if (data.length > 0) {
      data.forEach((sprint, index) => {
        console.log(`${index + 1}. ${sprint.name}`);
        console.log(`   ID: ${sprint._id}`);
        console.log(`   Status: ${sprint.status}`);
        console.log('');
      });
    } else {
      console.log('⚠️  API returned empty array!');
      console.log('Response data:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSprintAPI();
