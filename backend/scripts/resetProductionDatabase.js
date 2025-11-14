require('dotenv').config();
const mongoose = require('mongoose');

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
 * Drop all collections in the database
 */
const dropAllCollections = async (conn) => {
  try {
    const db = conn.db;
    const collections = await db.listCollections().toArray();
    
    console.log(`\n🗑️  Dropping ${collections.length} collections...`);
    
    for (const collection of collections) {
      try {
        await db.collection(collection.name).drop();
        console.log(`   ✓ Dropped: ${collection.name}`);
      } catch (error) {
        console.log(`   ⚠ Could not drop ${collection.name}: ${error.message}`);
      }
    }
    
    console.log(`\n✅ All collections dropped successfully!`);
  } catch (error) {
    console.error(`✗ Error dropping collections:`, error.message);
    throw error;
  }
};

/**
 * Main reset function
 */
const resetProductionDatabase = async () => {
  const baseURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homemadekahoot';
  
  if (!baseURI) {
    console.error('✗ MONGODB_URI not found in environment variables');
    process.exit(1);
  }
  
  const prodURI = getDatabaseURI(baseURI, '_prod');
  
  console.log('⚠️  WARNING: This will DELETE ALL DATA in the PRODUCTION database!');
  console.log(`Target: ${prodURI.split('@')[1] || prodURI}\n`);
  
  let prodConn = null;
  
  try {
    // Connect to production database
    prodConn = await connectToDB(prodURI, 'PROD');
    
    // Drop all collections
    await dropAllCollections(prodConn);
    
    console.log('\n✅ Production database reset completed!');
    console.log('   You can now run the migration script to import data from dev.');
    
  } catch (error) {
    console.error('\n✗ Reset failed:', error);
    process.exit(1);
  } finally {
    // Close connection
    if (prodConn) {
      await prodConn.close();
      console.log('\n✓ Closed PROD connection');
    }
  }
};

// Run reset
if (require.main === module) {
  resetProductionDatabase()
    .then(() => {
      console.log('\n🎉 All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = resetProductionDatabase;

