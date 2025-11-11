const https = require('https');

// Get a sample from your production API
const options = {
  hostname: 'dbwork.onrender.com',
  path: '/issues/project/690335789fda89142fb7c584',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN_HERE'
  }
};

console.log('Fetching from production API...\n');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const issues = JSON.parse(data);

      if (Array.isArray(issues) && issues.length > 0) {
        const sampleIssue = issues.find(i => i.assignees && i.assignees.length > 0);

        if (sampleIssue) {
          console.log('Sample issue with assignees:');
          console.log('  Key:', sampleIssue.key);
          console.log('  Assignees:', JSON.stringify(sampleIssue.assignees, null, 2));
          console.log('  First assignee type:', typeof sampleIssue.assignees[0]);

          if (typeof sampleIssue.assignees[0] === 'string') {
            console.log('\n❌ PROBLEM: Assignees are strings (not populated)');
          } else if (typeof sampleIssue.assignees[0] === 'object') {
            console.log('\n✓ Assignees are objects (populated correctly)');
          }
        } else {
          console.log('No issues with assignees found in response');
        }
      } else {
        console.log('Response:', data);
      }
    } catch (error) {
      console.error('Parse error:', error.message);
      console.log('Raw response:', data.substring(0, 500));
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.end();
