const axios = require('axios');
const path = require('path');
const fs = require('fs');

console.log('🔍 Diagnosing Login Issue...\n');

// Check 1: Backend Health
async function checkBackendHealth() {
  console.log('1️⃣  Checking Backend Health...');
  try {
    const response = await axios.get('http://localhost:5000/api/health', { timeout: 3000 });
    console.log('   ✅ Backend is running');
    console.log(`   Environment: ${response.data.environment}`);
    console.log(`   Database: ${response.data.database.name}`);
    console.log(`   Connected: ${response.data.database.connected ? 'Yes' : 'No'}`);
    
    if (response.data.database.name !== 'homemadekahoot_dev') {
      console.log(`   ⚠️  WARNING: Backend is using ${response.data.database.name}, not homemadekahoot_dev!`);
    }
    return true;
  } catch (error) {
    console.log('   ❌ Backend is NOT running or not accessible');
    console.log(`   Error: ${error.message}`);
    console.log('   → Make sure backend is running: cd backend && npm run start:dev');
    return false;
  }
}

// Check 2: Test Login API
async function testLoginAPI() {
  console.log('\n2️⃣  Testing Login API...');
  try {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'Furky',
      password: 'test123' // This will likely fail, but we're testing if API responds
    }, { timeout: 3000 });
    
    console.log('   ✅ Login API responded (unexpected success)');
    return true;
  } catch (error) {
    if (error.response) {
      console.log('   ✅ Login API is responding');
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Message: ${error.response.data?.message || 'No message'}`);
      
      if (error.response.status === 401) {
        console.log('   → This is expected - password might be wrong or user not found');
      }
      return true;
    } else if (error.code === 'ECONNREFUSED') {
      console.log('   ❌ Cannot connect to backend');
      console.log('   → Backend is not running on port 5000');
      return false;
    } else {
      console.log(`   ❌ Error: ${error.message}`);
      return false;
    }
  }
}

// Check 3: Frontend API URL
function checkFrontendConfig() {
  console.log('\n3️⃣  Checking Frontend Configuration...');
  
  const frontendPath = path.join(__dirname, '..', '..', 'frontend');
  const envDevPath = path.join(frontendPath, '.env.development');
  const envPath = path.join(frontendPath, '.env');
  
  if (fs.existsSync(envDevPath)) {
    const envContent = fs.readFileSync(envDevPath, 'utf8');
    const apiUrlMatch = envContent.match(/REACT_APP_API_URL=(.+)/);
    if (apiUrlMatch) {
      const apiUrl = apiUrlMatch[1].trim();
      console.log(`   Frontend API URL: ${apiUrl}`);
      
      if (apiUrl.includes('localhost:5000') || apiUrl.includes('127.0.0.1:5000')) {
        console.log('   ✅ Frontend is pointing to local backend');
      } else if (apiUrl.includes('render.com') || apiUrl.includes('onrender.com')) {
        console.log('   ⚠️  WARNING: Frontend is pointing to Render backend!');
        console.log('   → This means you\'re using production database, not local dev');
        console.log('   → To use local dev, set REACT_APP_API_URL=http://localhost:5000/api');
      } else {
        console.log('   ⚠️  Frontend API URL is set to a custom value');
      }
    } else {
      console.log('   ℹ️  No REACT_APP_API_URL in .env.development');
      console.log('   → Frontend will use default: http://localhost:5000/api');
    }
  } else if (fs.existsSync(envPath)) {
    console.log('   ℹ️  Found .env file (not .env.development)');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const apiUrlMatch = envContent.match(/REACT_APP_API_URL=(.+)/);
    if (apiUrlMatch) {
      console.log(`   Frontend API URL: ${apiUrlMatch[1].trim()}`);
    }
  } else {
    console.log('   ℹ️  No .env files found in frontend');
    console.log('   → Frontend will use default: http://localhost:5000/api');
  }
}

// Main
async function diagnose() {
  const backendRunning = await checkBackendHealth();
  if (backendRunning) {
    await testLoginAPI();
  }
  checkFrontendConfig();
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 Summary');
  console.log('='.repeat(60));
  
  if (!backendRunning) {
    console.log('❌ Backend is not running. Start it with:');
    console.log('   cd backend && npm run start:dev');
  } else {
    console.log('✅ Backend is running');
    console.log('\n💡 Next steps:');
    console.log('   1. Check backend console logs when you try to login');
    console.log('   2. Look for [AUTH] messages in backend console');
    console.log('   3. Verify password is correct (same as Render)');
    console.log('   4. Check browser console (F12) for errors');
  }
  
  console.log('\n');
}

diagnose().catch(console.error);

