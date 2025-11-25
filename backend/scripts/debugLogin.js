const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');

// Load environment based on argument or default to dev
const envArg = process.argv[2] || 'development';
const envFile = envArg === 'production' ? '.env.prod' : (envArg === 'development' ? '.env.dev' : '.env.local');
const envPath = path.join(__dirname, '..', envFile);

// Set NODE_ENV before loading
process.env.NODE_ENV = envArg;

if (require('fs').existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log(`📄 Loaded environment file: ${envFile} (${envArg})`);
} else {
  require('dotenv').config();
  console.log(`⚠️  Warning: ${envFile} not found, using default .env`);
}

async function debugLogin() {
  try {
    const baseURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homemadekahoot';
    const env = process.env.NODE_ENV || envArg || 'local';
    
    // Get database URI (same logic as database.js)
    let mongoURI;
    if (baseURI.startsWith('mongodb://localhost') || baseURI.startsWith('mongodb://127.0.0.1')) {
      const dbName = env === 'production' ? 'homemadekahoot_prod' : (env === 'development' ? 'homemadekahoot_dev' : 'homemadekahoot_local');
      mongoURI = baseURI.replace(/\/[^\/]*$/, `/${dbName}`);
    } else {
      const url = new URL(baseURI);
      const currentDbName = url.pathname.replace('/', '') || 'homemadekahoot';
      let dbSuffix = '';
      if (env === 'production') {
        dbSuffix = '_prod';
      } else if (env === 'development') {
        dbSuffix = '_dev';
      } else {
        dbSuffix = '_local';
      }
      let newDbName;
      if (currentDbName.endsWith('_prod') || currentDbName.endsWith('_dev') || currentDbName.endsWith('_local')) {
        newDbName = currentDbName.replace(/_(prod|dev|local)$/, dbSuffix);
      } else {
        newDbName = currentDbName + dbSuffix;
      }
      url.pathname = '/' + newDbName;
      mongoURI = url.toString();
    }
    
    console.log('🔍 Debug Login Script');
    console.log('====================');
    console.log(`Environment: ${env}`);
    console.log(`Database: ${mongoURI.split('/').pop().split('?')[0]}`);
    console.log('');
    
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');
    
    const username = process.argv[3] || 'Furky';
    const password = process.argv[4];
    
    if (!password) {
      console.error('❌ Please provide username and password');
      console.log('Usage: node scripts/debugLogin.js [env] <username> <password>');
      console.log('Example: node scripts/debugLogin.js development Furky mypassword');
      await mongoose.disconnect();
      process.exit(1);
    }
    
    const trimmedUsername = username.trim();
    console.log(`Testing login for: "${username}"`);
    console.log(`Trimmed username: "${trimmedUsername}"`);
    console.log(`Username length: ${username.length}, Trimmed length: ${trimmedUsername.length}`);
    console.log(`Username bytes: ${Buffer.from(username).toString('hex')}`);
    console.log(`Password length: ${password.length}`);
    console.log('');
    
    // Try case-insensitive search (like the actual login)
    console.log('1️⃣  Searching with case-insensitive regex...');
    const userRegex = await User.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });
    
    if (userRegex) {
      console.log(`   ✅ Found: "${userRegex.username}" (ID: ${userRegex._id})`);
      console.log(`   Username length: ${userRegex.username.length}`);
      console.log(`   Username bytes: ${Buffer.from(userRegex.username).toString('hex')}`);
    } else {
      console.log(`   ❌ Not found with regex`);
    }
    
    // Try exact match
    console.log('\n2️⃣  Searching with exact match...');
    const userExact = await User.findOne({ username: username });
    
    if (userExact) {
      console.log(`   ✅ Found: "${userExact.username}" (ID: ${userExact._id})`);
      console.log(`   Username length: ${userExact.username.length}`);
      console.log(`   Username bytes: ${Buffer.from(userExact.username).toString('hex')}`);
    } else {
      console.log(`   ❌ Not found with exact match`);
    }
    
    // Try trimmed match
    console.log('\n2️⃣b Searching with trimmed username...');
    const userTrimmed = await User.findOne({ username: username.trim() });
    
    if (userTrimmed) {
      console.log(`   ✅ Found: "${userTrimmed.username}" (ID: ${userTrimmed._id})`);
    } else {
      console.log(`   ❌ Not found with trimmed match`);
    }
    
    // List all users
    console.log('\n3️⃣  All users in database:');
    const allUsers = await User.find({}).select('username createdAt').sort({ createdAt: -1 });
    if (allUsers.length === 0) {
      console.log('   No users found');
    } else {
      allUsers.forEach(u => {
        const match = u.username.toLowerCase() === username.toLowerCase() ? ' ⭐' : '';
        console.log(`   - "${u.username}" (created: ${u.createdAt})${match}`);
      });
    }
    
    // Test password if user found
    const user = userRegex || userExact || userTrimmed;
    if (user) {
      console.log(`\n4️⃣  Testing password for user: "${user.username}"`);
      console.log(`   Password hash exists: ${!!user.password}`);
      console.log(`   Password hash length: ${user.password ? user.password.length : 0}`);
      console.log(`   Password hash preview: ${user.password ? user.password.substring(0, 30) + '...' : 'N/A'}`);
      
      const isMatch = await user.comparePassword(password);
      if (isMatch) {
        console.log(`   ✅ Password is CORRECT!`);
        console.log(`\n✅ Login would succeed`);
      } else {
        console.log(`   ❌ Password is INCORRECT!`);
        console.log(`\n❌ Login would fail`);
        
        // Try comparing with bcrypt directly for debugging
        const bcrypt = require('bcryptjs');
        const directCompare = await bcrypt.compare(password, user.password);
        console.log(`   Direct bcrypt.compare result: ${directCompare}`);
      }
    } else {
      console.log(`\n❌ Cannot test password - user not found`);
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

debugLogin();

