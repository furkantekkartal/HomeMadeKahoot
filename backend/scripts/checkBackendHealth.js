const axios = require('axios');

async function checkBackendHealth() {
  const urls = [
    'http://localhost:5010/api/health', // Local
    'http://localhost:5020/api/health', // Dev
    'http://localhost:5030/api/health'  // Prod
  ];

  console.log('🔍 Checking Backend Health Endpoints...\n');

  for (const url of urls) {
    try {
      console.log(`Testing: ${url}`);
      const response = await axios.get(url, { timeout: 3000 });
      console.log(`  ✅ Status: ${response.status}`);
      console.log(`  📊 Data:`, JSON.stringify(response.data, null, 2));
      console.log('');
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`  ❌ Backend not running on this port`);
      } else if (error.response) {
        console.log(`  ❌ Error ${error.response.status}: ${error.response.statusText}`);
        console.log(`  📄 Response:`, JSON.stringify(error.response.data, null, 2));
      } else {
        console.log(`  ❌ Error: ${error.message}`);
      }
      console.log('');
    }
  }
}

checkBackendHealth();

