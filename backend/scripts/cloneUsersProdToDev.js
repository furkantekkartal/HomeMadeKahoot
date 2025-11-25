require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * Get database URI with specific suffix
 */
const getDatabaseURI = (baseURI, suffix) => {
  if (baseURI.startsWith('mongodb://localhost') || baseURI.startsWith('mongodb://127.0.0.1')) {
    return baseURI.replace(/\/[^\/]*$/, `/homemadekahoot${suffix}`);
  } else {
    const url = new URL(baseURI);
    const currentDbName = url.pathname.replace('/', '') || 'homemadekahoot';
    let newDbName;
    if (currentDbName.endsWith('_prod') || currentDbName.endsWith('_dev')) {
      newDbName = currentDbName.replace(/_(prod|dev)$/, suffix);
    } else {
      newDbName = currentDbName + suffix;
    }
    url.pathname = '/' + newDbName;
    return url.toString();
  }
};

/**
 * Connect to a specific database using createConnection
 */
const connectToDB = async (uri, dbName) => {
  try {
    const conn = mongoose.createConnection(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await conn.asPromise();
    console.log(`✓ Connected to ${dbName}: ${conn.name}`);
    return conn;
  } catch (error) {
    console.error(`✗ Failed to connect to ${dbName}:`, error.message);
    throw error;
  }
};

/**
 * Delete all users from dev database
 */
const deleteAllDevUsers = async (devConn) => {
  try {
    console.log('\n🗑️  Deleting all users from DEV database...');
    
    // Get User model for dev connection
    const DevUser = devConn.model('User', User.schema);
    
    const count = await DevUser.countDocuments();
    console.log(`   Found ${count} user(s) in DEV`);
    
    if (count === 0) {
      console.log('   ✓ No users to delete');
      return 0;
    }
    
    const result = await DevUser.deleteMany({});
    console.log(`   ✓ Deleted ${result.deletedCount} user(s) from DEV`);
    
    return result.deletedCount;
  } catch (error) {
    console.error('✗ Error deleting users:', error.message);
    throw error;
  }
};

/**
 * Clone users from production to dev
 */
const cloneUsers = async (prodConn, devConn) => {
  try {
    console.log('\n📦 Cloning users from PRODUCTION to DEV...');
    
    // Get User models for both connections
    const ProdUser = prodConn.model('User', User.schema);
    const DevUser = devConn.model('User', User.schema);
    
    // Fetch all users from production
    const prodUsers = await ProdUser.find({}).lean();
    console.log(`   Found ${prodUsers.length} user(s) in PRODUCTION`);
    
    if (prodUsers.length === 0) {
      console.log('   ✓ No users to clone');
      return { cloned: 0, skipped: 0 };
    }
    
    // Clone users to dev
    let cloned = 0;
    let skipped = 0;
    
    for (const user of prodUsers) {
      try {
        // Remove _id to let MongoDB generate a new one
        const { _id, ...userData } = user;
        
        // IMPORTANT: Use insertOne directly on the collection to bypass Mongoose hooks
        // This prevents the password from being re-hashed (it's already hashed from production)
        await DevUser.collection.insertOne(userData);
        cloned++;
        console.log(`   ✓ Cloned user: ${user.username}`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`   ⚠️  Skipped duplicate user: ${user.username}`);
          skipped++;
        } else {
          console.error(`   ✗ Error cloning user ${user.username}:`, error.message);
          skipped++;
        }
      }
    }
    
    console.log(`\n   ✅ Cloned: ${cloned} user(s)`);
    if (skipped > 0) {
      console.log(`   ⚠️  Skipped: ${skipped} user(s)`);
    }
    
    return { cloned, skipped };
  } catch (error) {
    console.error('✗ Error cloning users:', error.message);
    throw error;
  }
};

/**
 * Main function to clone users from production to dev
 */
const cloneUsersProdToDev = async () => {
  // Load production environment variables
  const fs = require('fs');
  const path = require('path');
  
  // Try to load .env.prod first, then fallback to .env
  const envProdPath = path.join(__dirname, '../.env.prod');
  const envPath = path.join(__dirname, '../.env');
  
  if (fs.existsSync(envProdPath)) {
    require('dotenv').config({ path: envProdPath });
    console.log('📄 Loaded .env.prod for production database connection');
  } else if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log('📄 Loaded .env for database connection');
  } else {
    require('dotenv').config();
    console.log('📄 Using default environment variables');
  }
  
  const baseURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homemadekahoot';
  
  if (!baseURI) {
    console.error('✗ MONGODB_URI not found in environment variables');
    process.exit(1);
  }
  
  const prodURI = getDatabaseURI(baseURI, '_prod');
  const devURI = getDatabaseURI(baseURI, '_dev');
  
  console.log('🚀 Starting PRODUCTION to DEV user clone...\n');
  console.log(`Source (PROD): ${prodURI.split('@')[1] || prodURI}`);
  console.log(`Target (DEV): ${devURI.split('@')[1] || devURI}\n`);
  
  // Confirmation prompt
  console.log('⚠️  WARNING: This will DELETE ALL users in DEV and replace them with PRODUCTION users!');
  console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  let prodConn = null;
  let devConn = null;
  
  try {
    // Connect to production database
    prodConn = await connectToDB(prodURI, 'PROD');
    
    // Connect to dev database
    devConn = await connectToDB(devURI, 'DEV');
    
    // Step 1: Delete all users in dev
    const deletedCount = await deleteAllDevUsers(devConn);
    
    // Step 2: Clone users from production to dev
    const result = await cloneUsers(prodConn, devConn);
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 CLONE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Users Deleted from DEV: ${deletedCount}`);
    console.log(`Users Cloned from PROD: ${result.cloned}`);
    console.log(`Users Skipped: ${result.skipped}`);
    console.log('='.repeat(60));
    console.log('\n✅ User clone completed successfully!');
    
  } catch (error) {
    console.error('\n✗ Clone failed:', error);
    process.exit(1);
  } finally {
    // Close connections
    if (prodConn) {
      await prodConn.close();
      console.log('\n✓ Closed PROD connection');
    }
    if (devConn) {
      await devConn.close();
      console.log('✓ Closed DEV connection');
    }
  }
};

// Run clone
if (require.main === module) {
  cloneUsersProdToDev()
    .then(() => {
      console.log('\n🎉 All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = cloneUsersProdToDev;

