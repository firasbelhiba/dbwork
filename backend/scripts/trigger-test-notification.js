// Script to trigger a test notification via the backend API
// Run this while you have the dbwork tab open in your browser

const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('===========================================');
console.log('  Real-Time Notification Test Script');
console.log('===========================================\n');

console.log('To get your token:');
console.log('1. Open https://dbwork.vercel.app in your browser');
console.log('2. Open Developer Tools (F12)');
console.log('3. Go to Console tab');
console.log('4. Type: localStorage.getItem("accessToken")');
console.log('5. Copy the token (without quotes)\n');

rl.question('Paste your accessToken here: ', (token) => {
  if (!token || token.length < 10) {
    console.log('Invalid token. Please try again.');
    rl.close();
    return;
  }

  console.log('\nSending test notification in 3 seconds...');
  console.log('Switch to your browser tab NOW to hear the sound!\n');

  setTimeout(() => {
    const postData = JSON.stringify({});

    const options = {
      hostname: 'dbwork-bovr.onrender.com',
      port: 443,
      path: '/notifications/test',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.trim()}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 200) {
          console.log('✅ Notification sent successfully!');
          console.log('You should hear the sound and see a toast in your browser.');
          try {
            const response = JSON.parse(data);
            console.log('\nNotification details:', {
              id: response._id,
              title: response.title,
              message: response.message
            });
          } catch (e) {
            console.log('Response:', data);
          }
        } else {
          console.log(`❌ Error: ${res.statusCode}`);
          console.log('Response:', data);
        }
        rl.close();
      });
    });

    req.on('error', (e) => {
      console.error('❌ Request failed:', e.message);
      rl.close();
    });

    req.write(postData);
    req.end();
  }, 3000);
});
