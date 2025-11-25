const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');
const fs = require('fs');

// Load environment variables the same way server.js does
const env = process.env.NODE_ENV || 'development';
const envFile = env === 'production' ? '.env.prod' : '.env.dev';
const envPath = path.join(__dirname, '..', envFile);

if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
  console.log(`📄 Loaded environment file: ${envFile} (${env})`);
} else {
  require('dotenv').config();
  console.log(`⚠️  Warning: ${envFile} not found, using default .env`);
}

async function testLogin() {
  try {
    const baseURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homemadekahoot';
    const currentEnv = process.env.NODE_ENV || 'development';
    
    // Use the same logic as database.js
    const getDatabaseURI = (baseURI) => {
      const url = new URL(baseURI);
      const currentDbName = url.pathname.replace('/', '') || 'homemadekahoot';
      
      let dbSuffix = '';
      if (currentEnv === 'production') {
        dbSuffix = '_prod';
      } else {
        dbSuffix = '_dev';
      }
      
      let newDbName;
      if (currentDbName.endsWith('_prod') || currentDbName.endsWith('_dev')) {
        newDbName = currentDbName.replace(/_(prod|dev)$/, dbSuffix);
      } else {
        newDbName = currentDbName + dbSuffix;
      }
      
      url.pathname = '/' + newDbName;
      return url.toString();
    };
    
    let mongoURI;
    if (baseURI.startsWith('mongodb://localhost') || baseURI.startsWith('mongodb://127.0.0.1')) {
      const dbName = currentEnv === 'production' ? 'homemadekahoot_prod' : 'homemadekahoot_dev';
      mongoURI = baseURI.replace(/\/[^\/]*$/, `/${dbName}`);
    } else {
      mongoURI = getDatabaseURI(baseURI);
    }
    
    console.log('🔍 Testing Login...\n');
    console.log(`Connecting to: ${mongoURI.split('/').pop().split('?')[0]}\n`);
    
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB\n');
    
    const username = process.argv[2] || 'Furky';
    const password = process.argv[3];
    
    if (!password) {
      console.error('❌ Please provide a password as the second argument');
      console.log('Usage: node scripts/testLogin.js <username> <password>');
      await mongoose.disconnect();
      process.exit(1);
    }
    
    console.log(`Testing login for: ${username}\n`);
    
    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      console.log('❌ User not found');
      await mongoose.disconnect();
      process.exit(1);
    }
    
    console.log(`✅ User found: ${user.username}`);
    console.log(`   ID: ${user._id}`);
    console.log(`   Password hash exists: ${!!user.password}`);
    
    // Test password
    console.log('\n🔐 Testing password...');
    const isMatch = await user.comparePassword(password);
    
    if (isMatch) {
      console.log('✅ Password is CORRECT!');
      console.log('\n✅ Login would succeed');
    } else {
      console.log('❌ Password is INCORRECT!');
      console.log('\n❌ Login would fail');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testLogin();

