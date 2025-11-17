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
 * Drop all collections in production database
 */
const dropAllProductionCollections = async (prodConn) => {
  try {
    console.log('\n🗑️  Dropping all collections in PRODUCTION database...');
    
    const prodDb = prodConn.db;
    const collections = await prodDb.listCollections().toArray();
    
    console.log(`   Found ${collections.length} collection(s) to drop:`);
    
    for (const collection of collections) {
      try {
        await prodDb.collection(collection.name).drop();
        console.log(`   ✓ Dropped: ${collection.name}`);
      } catch (error) {
        console.log(`   ⚠️  Could not drop ${collection.name}: ${error.message}`);
      }
    }
    
    console.log('✅ All collections dropped in PRODUCTION\n');
  } catch (error) {
    console.error('✗ Error dropping collections:', error.message);
    throw error;
  }
};

/**
 * Clone collection from dev to production
 */
const cloneCollection = async (devConn, prodConn, collectionName) => {
  try {
    console.log(`\n📦 Cloning ${collectionName}...`);
    
    const devDb = devConn.db;
    const prodDb = prodConn.db;
    
    const devCollection = devDb.collection(collectionName);
    const prodCollection = prodDb.collection(collectionName);
    
    // Count documents
    const count = await devCollection.countDocuments();
    console.log(`   Found ${count} documents in DEV`);
    
    if (count === 0) {
      console.log(`   ✓ No documents to clone`);
      return { cloned: 0, skipped: 0 };
    }
    
    // Fetch all documents from dev
    const documents = await devCollection.find({}).toArray();
    
    // Clone documents to production
    let cloned = 0;
    let skipped = 0;
    
    // Use bulk operations for better performance
    if (documents.length > 0) {
      try {
        // Insert all documents at once
        await prodCollection.insertMany(documents, { ordered: false });
        cloned = documents.length;
        console.log(`   ✓ Cloned: ${cloned} documents`);
      } catch (error) {
        // If bulk insert fails, try one by one
        console.log(`   ⚠️  Bulk insert failed, inserting one by one...`);
        for (const doc of documents) {
          try {
            await prodCollection.insertOne(doc);
            cloned++;
          } catch (err) {
            if (err.code === 11000) {
              skipped++;
            } else {
              console.error(`   ✗ Error cloning document ${doc._id}:`, err.message);
              skipped++;
            }
          }
        }
      }
    }
    
    if (skipped > 0) {
      console.log(`   ⚠️  Skipped: ${skipped} documents (duplicates or errors)`);
    }
    
    return { cloned, skipped };
  } catch (error) {
    console.error(`   ✗ Error cloning ${collectionName}:`, error.message);
    throw error;
  }
};

/**
 * Main function to clone dev database to production
 */
const cloneDevToProduction = async () => {
  const baseURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homemadekahoot';
  
  if (!baseURI) {
    console.error('✗ MONGODB_URI not found in environment variables');
    process.exit(1);
  }
  
  const devURI = getDatabaseURI(baseURI, '_dev');
  const prodURI = getDatabaseURI(baseURI, '_prod');
  
  console.log('🚀 Starting DEV to PRODUCTION database clone...\n');
  console.log(`Source (DEV): ${devURI.split('@')[1] || devURI}`);
  console.log(`Target (PROD): ${prodURI.split('@')[1] || prodURI}\n`);
  
  // Confirmation prompt
  console.log('⚠️  WARNING: This will DROP ALL collections in PRODUCTION and replace them with DEV data!');
  console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  let devConn = null;
  let prodConn = null;
  
  try {
    // Connect to dev database
    devConn = await connectToDB(devURI, 'DEV');
    
    // Connect to prod database
    prodConn = await connectToDB(prodURI, 'PROD');
    
    // Step 1: Drop all collections in production
    await dropAllProductionCollections(prodConn);
    
    // Step 2: Get all collections from dev
    const devDb = devConn.db;
    const devCollections = await devDb.listCollections().toArray();
    
    console.log(`\n📚 Found ${devCollections.length} collection(s) in DEV to clone\n`);
    
    // Step 3: Clone each collection
    const summary = {
      totalCloned: 0,
      totalSkipped: 0,
      collections: {}
    };
    
    for (const collection of devCollections) {
      try {
        const result = await cloneCollection(devConn, prodConn, collection.name);
        summary.totalCloned += result.cloned;
        summary.totalSkipped += result.skipped;
        summary.collections[collection.name] = result;
      } catch (error) {
        console.error(`✗ Failed to clone ${collection.name}:`, error.message);
        summary.collections[collection.name] = { error: error.message };
      }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 CLONE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Collections Cloned: ${Object.keys(summary.collections).length}`);
    console.log(`Total Documents Cloned: ${summary.totalCloned}`);
    console.log(`Total Documents Skipped: ${summary.totalSkipped}`);
    console.log('\nPer Collection:');
    for (const [name, result] of Object.entries(summary.collections)) {
      if (result.error) {
        console.log(`  ${name}: ✗ Error - ${result.error}`);
      } else {
        console.log(`  ${name}: ${result.cloned} cloned, ${result.skipped} skipped`);
      }
    }
    console.log('='.repeat(60));
    console.log('\n✅ Database clone completed successfully!');
    
  } catch (error) {
    console.error('\n✗ Clone failed:', error);
    process.exit(1);
  } finally {
    // Close connections
    if (devConn) {
      await devConn.close();
      console.log('\n✓ Closed DEV connection');
    }
    if (prodConn) {
      await prodConn.close();
      console.log('✓ Closed PROD connection');
    }
  }
};

// Run clone
if (require.main === module) {
  cloneDevToProduction()
    .then(() => {
      console.log('\n🎉 All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = cloneDevToProduction;

