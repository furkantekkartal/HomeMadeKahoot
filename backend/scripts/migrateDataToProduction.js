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
 * Migrate data from one database to another
 */
const migrateCollection = async (sourceConn, targetConn, collectionName) => {
  try {
    console.log(`\n📦 Migrating ${collectionName}...`);
    
    // Get source database
    const sourceDb = sourceConn.db;
    const targetDb = targetConn.db;
    
    // Get collection
    const sourceCollection = sourceDb.collection(collectionName);
    const targetCollection = targetDb.collection(collectionName);
    
    // Count documents
    const count = await sourceCollection.countDocuments();
    console.log(`   Found ${count} documents in source`);
    
    if (count === 0) {
      console.log(`   ✓ No documents to migrate`);
      return { migrated: 0, skipped: 0 };
    }
    
    // Fetch all documents
    const documents = await sourceCollection.find({}).toArray();
    
    // Migrate documents
    let migrated = 0;
    let skipped = 0;
    
    for (const doc of documents) {
      try {
        // Check if document already exists (by _id)
        const exists = await targetCollection.findOne({ _id: doc._id });
        
        if (exists) {
          // Update existing document
          await targetCollection.replaceOne({ _id: doc._id }, doc);
          migrated++;
        } else {
          // Insert new document
          await targetCollection.insertOne(doc);
          migrated++;
        }
      } catch (error) {
        if (error.code === 11000) {
          // Duplicate key error - skip
          skipped++;
          console.log(`   ⚠ Skipped duplicate: ${doc._id}`);
        } else {
          console.error(`   ✗ Error migrating document ${doc._id}:`, error.message);
          skipped++;
        }
      }
    }
    
    console.log(`   ✓ Migrated: ${migrated}, Skipped: ${skipped}`);
    return { migrated, skipped };
  } catch (error) {
    console.error(`   ✗ Error migrating ${collectionName}:`, error.message);
    throw error;
  }
};

/**
 * Main migration function
 */
const migrateData = async () => {
  const baseURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homemadekahoot';
  
  if (!baseURI) {
    console.error('✗ MONGODB_URI not found in environment variables');
    process.exit(1);
  }
  
  const devURI = getDatabaseURI(baseURI, '_dev');
  const prodURI = getDatabaseURI(baseURI, '_prod');
  
  console.log('🚀 Starting data migration from DEV to PRODUCTION...\n');
  console.log(`Source (DEV): ${devURI.split('@')[1] || devURI}`);
  console.log(`Target (PROD): ${prodURI.split('@')[1] || prodURI}\n`);
  
  let sourceConn = null;
  let targetConn = null;
  
  try {
    // Connect to source (dev) database
    sourceConn = await connectToDB(devURI, 'DEV');
    
    // Connect to target (prod) database
    targetConn = await connectToDB(prodURI, 'PROD');
    
    // Collections to migrate (in order of dependencies)
    const collections = [
      'users',
      'words',
      'quizzes',
      'sessions',
      'results',
      'studentresults',
      'userwords',
      'flashcarddecks',
      'sources',
      'sourcewords',
      'pronunciationresults',
      'studysessions',
    ];
    
    const summary = {
      totalMigrated: 0,
      totalSkipped: 0,
      collections: {}
    };
    
    // Migrate each collection
    for (const collectionName of collections) {
      try {
        const result = await migrateCollection(sourceConn, targetConn, collectionName);
        summary.totalMigrated += result.migrated;
        summary.totalSkipped += result.skipped;
        summary.collections[collectionName] = result;
      } catch (error) {
        console.error(`✗ Failed to migrate ${collectionName}:`, error.message);
        summary.collections[collectionName] = { error: error.message };
      }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Documents Migrated: ${summary.totalMigrated}`);
    console.log(`Total Documents Skipped: ${summary.totalSkipped}`);
    console.log('\nPer Collection:');
    for (const [name, result] of Object.entries(summary.collections)) {
      if (result.error) {
        console.log(`  ${name}: ✗ Error - ${result.error}`);
      } else {
        console.log(`  ${name}: ${result.migrated} migrated, ${result.skipped} skipped`);
      }
    }
    console.log('='.repeat(60));
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close connections
    if (sourceConn) {
      await sourceConn.close();
      console.log('\n✓ Closed DEV connection');
    }
    if (targetConn) {
      await targetConn.close();
      console.log('✓ Closed PROD connection');
    }
  }
};

// Run migration
if (require.main === module) {
  migrateData()
    .then(() => {
      console.log('\n🎉 All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = migrateData;

