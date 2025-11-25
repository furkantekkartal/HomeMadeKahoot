const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

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
    if (currentDbName.endsWith('_prod') || currentDbName.endsWith('_dev') || currentDbName.endsWith('_local')) {
      newDbName = currentDbName.replace(/_(prod|dev|local)$/, suffix);
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
 * Get all collection names from a database
 */
const getCollectionNames = async (conn) => {
  try {
    const collections = await conn.db.listCollections().toArray();
    return collections.map(c => c.name);
  } catch (error) {
    console.error(`Error getting collections:`, error.message);
    return [];
  }
};

/**
 * Delete all documents from a collection
 */
const deleteAllFromCollection = async (conn, collectionName) => {
  try {
    const collection = conn.db.collection(collectionName);
    const count = await collection.countDocuments();
    if (count === 0) {
      return 0;
    }
    const result = await collection.deleteMany({});
    return result.deletedCount;
  } catch (error) {
    console.error(`Error deleting from ${collectionName}:`, error.message);
    return 0;
  }
};

/**
 * Clone a collection from source to target
 */
const cloneCollection = async (sourceConn, targetConn, collectionName) => {
  try {
    const sourceCollection = sourceConn.db.collection(collectionName);
    const targetCollection = targetConn.db.collection(collectionName);
    
    // Get all documents from source
    const documents = await sourceCollection.find({}).toArray();
    
    if (documents.length === 0) {
      return { cloned: 0, skipped: 0 };
    }
    
    // Remove _id from documents to let MongoDB generate new ones
    const documentsToInsert = documents.map(doc => {
      const { _id, ...docWithoutId } = doc;
      return docWithoutId;
    });
    
    // Insert into target (using insertMany with ordered: false to continue on errors)
    let cloned = 0;
    let skipped = 0;
    
    try {
      const result = await targetCollection.insertMany(documentsToInsert, { ordered: false });
      cloned = result.insertedCount || documentsToInsert.length;
    } catch (error) {
      // Handle partial insertions
      if (error.writeErrors) {
        cloned = error.result?.insertedCount || 0;
        skipped = error.writeErrors.length;
        console.log(`   ⚠️  Some documents failed to insert: ${skipped} errors`);
      } else {
        throw error;
      }
    }
    
    return { cloned, skipped };
  } catch (error) {
    console.error(`   ✗ Error cloning ${collectionName}:`, error.message);
    return { cloned: 0, skipped: 0 };
  }
};

/**
 * Clean all collections in target database
 */
const cleanDatabase = async (conn, dbName) => {
  try {
    console.log(`\n🗑️  Cleaning ${dbName} database...`);
    const collections = await getCollectionNames(conn);
    
    if (collections.length === 0) {
      console.log(`   ✓ No collections to clean`);
      return {};
    }
    
    const results = {};
    for (const collectionName of collections) {
      const deleted = await deleteAllFromCollection(conn, collectionName);
      if (deleted > 0) {
        console.log(`   ✓ Deleted ${deleted} document(s) from ${collectionName}`);
        results[collectionName] = deleted;
      }
    }
    
    return results;
  } catch (error) {
    console.error(`✗ Error cleaning database:`, error.message);
    throw error;
  }
};

/**
 * Clone all collections from production to target database
 */
const cloneAllCollections = async (prodConn, targetConn, targetName) => {
  try {
    console.log(`\n📦 Cloning all collections from PRODUCTION to ${targetName}...`);
    const collections = await getCollectionNames(prodConn);
    
    if (collections.length === 0) {
      console.log(`   ⚠️  No collections found in PRODUCTION`);
      return {};
    }
    
    console.log(`   Found ${collections.length} collection(s) in PRODUCTION`);
    
    const results = {};
    for (const collectionName of collections) {
      console.log(`\n   📋 Cloning ${collectionName}...`);
      const result = await cloneCollection(prodConn, targetConn, collectionName);
      results[collectionName] = result;
      if (result.cloned > 0) {
        console.log(`   ✓ Cloned ${result.cloned} document(s)`);
        if (result.skipped > 0) {
          console.log(`   ⚠️  Skipped ${result.skipped} document(s)`);
        }
      } else {
        console.log(`   ⚠️  No documents to clone`);
      }
    }
    
    return results;
  } catch (error) {
    console.error(`✗ Error cloning collections:`, error.message);
    throw error;
  }
};

/**
 * Main function to clone everything from production to local and dev
 */
const cloneAllFromProd = async () => {
  // Load production environment variables
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
  const localURI = getDatabaseURI(baseURI, '_local');
  
  console.log('🚀 Starting PRODUCTION to LOCAL & DEV clone...\n');
  console.log(`Source (PROD): ${prodURI.split('@')[1] || prodURI}`);
  console.log(`Target (LOCAL): ${localURI.split('@')[1] || localURI}`);
  console.log(`Target (DEV): ${devURI.split('@')[1] || devURI}\n`);
  
  // Confirmation prompt
  console.log('⚠️  WARNING: This will DELETE ALL data in LOCAL and DEV databases!');
  console.log('   All data will be replaced with PRODUCTION data.');
  console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  let prodConn = null;
  let localConn = null;
  let devConn = null;
  
  try {
    // Connect to all databases
    prodConn = await connectToDB(prodURI, 'PROD');
    localConn = await connectToDB(localURI, 'LOCAL');
    devConn = await connectToDB(devURI, 'DEV');
    
    // Step 1: Clean local database
    console.log('\n' + '='.repeat(60));
    console.log('STEP 1: Cleaning LOCAL database');
    console.log('='.repeat(60));
    const localCleaned = await cleanDatabase(localConn, 'LOCAL');
    
    // Step 2: Clean dev database
    console.log('\n' + '='.repeat(60));
    console.log('STEP 2: Cleaning DEV database');
    console.log('='.repeat(60));
    const devCleaned = await cleanDatabase(devConn, 'DEV');
    
    // Step 3: Clone to local
    console.log('\n' + '='.repeat(60));
    console.log('STEP 3: Cloning from PROD to LOCAL');
    console.log('='.repeat(60));
    const localResults = await cloneAllCollections(prodConn, localConn, 'LOCAL');
    
    // Step 4: Clone to dev
    console.log('\n' + '='.repeat(60));
    console.log('STEP 4: Cloning from PROD to DEV');
    console.log('='.repeat(60));
    const devResults = await cloneAllCollections(prodConn, devConn, 'DEV');
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 CLONE SUMMARY');
    console.log('='.repeat(60));
    
    console.log('\n📋 LOCAL Database:');
    const localTotalCloned = Object.values(localResults).reduce((sum, r) => sum + (r.cloned || 0), 0);
    const localTotalSkipped = Object.values(localResults).reduce((sum, r) => sum + (r.skipped || 0), 0);
    console.log(`   Collections cloned: ${Object.keys(localResults).length}`);
    console.log(`   Documents cloned: ${localTotalCloned}`);
    if (localTotalSkipped > 0) {
      console.log(`   Documents skipped: ${localTotalSkipped}`);
    }
    
    console.log('\n📋 DEV Database:');
    const devTotalCloned = Object.values(devResults).reduce((sum, r) => sum + (r.cloned || 0), 0);
    const devTotalSkipped = Object.values(devResults).reduce((sum, r) => sum + (r.skipped || 0), 0);
    console.log(`   Collections cloned: ${Object.keys(devResults).length}`);
    console.log(`   Documents cloned: ${devTotalCloned}`);
    if (devTotalSkipped > 0) {
      console.log(`   Documents skipped: ${devTotalSkipped}`);
    }
    
    console.log('='.repeat(60));
    console.log('\n✅ Clone completed successfully!');
    
  } catch (error) {
    console.error('\n✗ Clone failed:', error);
    process.exit(1);
  } finally {
    // Close connections
    if (prodConn) {
      await prodConn.close();
      console.log('\n✓ Closed PROD connection');
    }
    if (localConn) {
      await localConn.close();
      console.log('✓ Closed LOCAL connection');
    }
    if (devConn) {
      await devConn.close();
      console.log('✓ Closed DEV connection');
    }
  }
};

// Run clone
if (require.main === module) {
  cloneAllFromProd()
    .then(() => {
      console.log('\n🎉 All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = cloneAllFromProd;

