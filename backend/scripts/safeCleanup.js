require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
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
    
    return { conn, dbName: conn.connection.name, env };
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const askQuestion = (query) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
};

const safeCleanup = async () => {
  try {
    const { conn, dbName, env } = await connectDB();
    
    console.log(`\n🧹 Safe Database Cleanup (${env.toUpperCase()})`);
    console.log('='.repeat(60));
    console.log(`\n⚠️  Database: ${dbName}`);
    console.log(`⚠️  This will remove orphaned collections (not in models registry)\n`);
    
    const db = mongoose.connection.db;
    const existingCollections = await db.listCollections().toArray();
    const existingCollectionNames = existingCollections.map(c => c.name.toLowerCase());
    const expectedCollections = modelsRegistry.getExpectedCollections();
    
    // Find orphaned collections
    const orphanedCollections = existingCollectionNames.filter(
      name => !expectedCollections.includes(name)
    );
    
    if (orphanedCollections.length === 0) {
      console.log('✅ No orphaned collections found. Database is clean!\n');
      await mongoose.connection.close();
      process.exit(0);
    }
    
    console.log('📋 Orphaned Collections Found:');
    for (const name of orphanedCollections) {
      const collection = existingCollections.find(c => c.name.toLowerCase() === name);
      const count = await db.collection(collection.name).countDocuments();
      console.log(`  - ${collection.name}: ${count} documents`);
    }
    
    console.log('\n⚠️  WARNING: These collections will be PERMANENTLY DELETED!');
    console.log('   This action cannot be undone.\n');
    
    const answer = await askQuestion('Are you sure you want to delete these collections? (yes/no): ');
    
    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Cleanup cancelled.\n');
      await mongoose.connection.close();
      process.exit(0);
    }
    
    // Delete orphaned collections
    console.log('\n🗑️  Deleting orphaned collections...');
    for (const name of orphanedCollections) {
      const collection = existingCollections.find(c => c.name.toLowerCase() === name);
      await db.collection(collection.name).drop();
      console.log(`  ✅ Deleted: ${collection.name}`);
    }
    
    console.log('\n✅ Cleanup complete!\n');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
};

// Run cleanup
safeCleanup();

