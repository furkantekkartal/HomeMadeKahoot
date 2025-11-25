const mongoose = require('mongoose');
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

const User = require('../models/User');

async function checkConnection() {
  try {
    const baseURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homemadekahoot';
    const currentEnv = process.env.NODE_ENV || 'development';
    
    console.log('\n🔍 Checking Database Connection...\n');
    console.log(`Environment: ${currentEnv}`);
    console.log(`Base URI: ${baseURI.split('@')[1] || baseURI}`);
    
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
    
    console.log(`Final URI: ${mongoURI.split('@')[1] || mongoURI}`);
    console.log(`Expected Database: ${mongoURI.split('/').pop().split('?')[0]}\n`);
    
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
    console.log(`   Host: ${mongoose.connection.host}`);
    console.log(`   Database: ${mongoose.connection.name}`);
    console.log(`   State: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}\n`);
    
    // Check users
    const users = await User.find({}).select('username createdAt');
    console.log(`📊 Users in database (${users.length} total):`);
    if (users.length === 0) {
      console.log('   No users found');
    } else {
      users.forEach(u => console.log(`   - ${u.username} (created: ${u.createdAt})`));
    }
    
    // Check if Furky exists
    const furky = await User.findOne({ username: 'Furky' });
    if (furky) {
      console.log('\n✅ User "Furky" found in database');
    } else {
      console.log('\n❌ User "Furky" NOT found in database');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkConnection();

