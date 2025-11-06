require('dotenv').config();
const mongoose = require('mongoose');
const modelsRegistry = require('../config/modelsRegistry');

// Import all models to register them
require('../models/User');
require('../models/Quiz');
require('../models/Session');
require('../models/Result');
require('../models/StudentResult');

/**
 * Get the appropriate database name based on environment
 */
const getDatabaseURI = (baseURI) => {
  const env = process.env.NODE_ENV || 'development';
  const url = new URL(baseURI);
  const currentDbName = url.pathname.replace('/', '') || 'homemadekahoot';
  
  let dbSuffix = env === 'production' ? '_prod' : '_dev';
  let newDbName;
  
  if (currentDbName.endsWith('_prod') || currentDbName.endsWith('_dev')) {
    newDbName = currentDbName.replace(/_(prod|dev)$/, dbSuffix);
  } else {
    newDbName = currentDbName + dbSuffix;
  }
  
  url.pathname = '/' + newDbName;
  return url.toString();
};

const connectDB = async () => {
  try {
    const baseURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homemadekahoot';
    const env = process.env.NODE_ENV || 'development';
    
    let mongoURI;
    if (baseURI.startsWith('mongodb://localhost') || baseURI.startsWith('mongodb://127.0.0.1')) {
      const dbName = env === 'production' ? 'homemadekahoot_prod' : 'homemadekahoot_dev';
      mongoURI = baseURI.replace(/\/[^\/]*$/, `/${dbName}`);
    } else {
      mongoURI = getDatabaseURI(baseURI);
    }
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    return { conn, dbName: conn.connection.name };
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const checkDatabaseStatus = async () => {
  try {
    const env = process.env.NODE_ENV || 'development';
    console.log(`\n📊 Database Status Check (${env.toUpperCase()})\n`);
    console.log('='.repeat(60));
    
    const { conn, dbName } = await connectDB();
    console.log(`\n✅ Connected to: ${dbName}\n`);
    
    const db = mongoose.connection.db;
    
    // Get all collections in database
    const existingCollections = await db.listCollections().toArray();
    const existingCollectionNames = existingCollections.map(c => c.name.toLowerCase());
    
    // Get expected collections
    const expectedCollections = modelsRegistry.getExpectedCollections();
    
    console.log('📋 Expected Collections (from models):');
    expectedCollections.forEach(name => {
      const info = modelsRegistry.getCollectionInfo(name);
      const exists = existingCollectionNames.includes(name);
      const status = exists ? '✅' : '❌';
      const required = info.required ? '(REQUIRED)' : '(optional)';
      console.log(`  ${status} ${name} ${required}`);
      if (info.description) {
        console.log(`     └─ ${info.description}`);
      }
    });
    
    console.log('\n📦 Existing Collections in Database:');
    if (existingCollectionNames.length === 0) {
      console.log('  (No collections found)');
    } else {
      existingCollectionNames.forEach(name => {
        const isExpected = expectedCollections.includes(name);
        const info = modelsRegistry.getCollectionInfo(name);
        const status = isExpected ? '✅' : '⚠️';
        const label = isExpected ? '(expected)' : '(unexpected - not in models)';
        const required = info?.required ? '(REQUIRED)' : '';
        console.log(`  ${status} ${name} ${label} ${required}`);
      });
    }
    
    // Check for orphaned collections
    const orphanedCollections = existingCollectionNames.filter(
      name => !expectedCollections.includes(name)
    );
    
    if (orphanedCollections.length > 0) {
      console.log('\n⚠️  Orphaned Collections (not in models registry):');
      orphanedCollections.forEach(name => {
        console.log(`  - ${name}`);
      });
      console.log('\n💡 These collections are not defined in any model.');
      console.log('   Consider removing them if they are no longer needed.');
    }
    
    // Check for missing collections
    const missingCollections = expectedCollections.filter(
      name => !existingCollectionNames.includes(name)
    );
    
    if (missingCollections.length > 0) {
      console.log('\n❌ Missing Collections (will be created on first use):');
      missingCollections.forEach(name => {
        const info = modelsRegistry.getCollectionInfo(name);
        const required = info.required ? '(REQUIRED)' : '';
        console.log(`  - ${name} ${required}`);
      });
    }
    
    // Get collection stats
    console.log('\n📈 Collection Statistics:');
    for (const collection of existingCollections) {
      const count = await db.collection(collection.name).countDocuments();
      const info = modelsRegistry.getCollectionInfo(collection.name);
      const isExpected = expectedCollections.includes(collection.name.toLowerCase());
      console.log(`  ${collection.name}: ${count} documents ${isExpected ? '' : '(orphaned)'}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Database status check complete!\n');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking database status:', error);
    process.exit(1);
  }
};

// Run the check
checkDatabaseStatus();

