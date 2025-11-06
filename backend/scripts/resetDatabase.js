require('dotenv').config();
const mongoose = require('mongoose');

// Import all models to register them
require('../models/User');
require('../models/Quiz');
require('../models/Session');
require('../models/Result');
require('../models/StudentResult');

/**
 * Get the appropriate database name based on environment
 * @param {string} baseURI - Base MongoDB connection string
 * @returns {string} - Modified URI with correct database name
 */
const getDatabaseURI = (baseURI) => {
  const env = process.env.NODE_ENV || 'development';
  
  // Parse the URI to extract database name
  const url = new URL(baseURI);
  const currentDbName = url.pathname.replace('/', '') || 'homemadekahoot';
  
  // Determine database suffix based on environment
  let dbSuffix = '';
  if (env === 'production') {
    dbSuffix = '_prod';
  } else {
    dbSuffix = '_dev';
  }
  
  // Construct new database name
  let newDbName;
  if (currentDbName.endsWith('_prod') || currentDbName.endsWith('_dev')) {
    // If already has suffix, replace it
    newDbName = currentDbName.replace(/_(prod|dev)$/, dbSuffix);
  } else {
    // Append suffix
    newDbName = currentDbName + dbSuffix;
  }
  
  // Update the pathname with new database name
  url.pathname = '/' + newDbName;
  
  return url.toString();
};

const connectDB = async () => {
  try {
    const baseURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homemadekahoot';
    const env = process.env.NODE_ENV || 'development';
    
    // For local MongoDB, handle differently
    let mongoURI;
    if (baseURI.startsWith('mongodb://localhost') || baseURI.startsWith('mongodb://127.0.0.1')) {
      // Local MongoDB - append database name directly
      const dbName = env === 'production' ? 'homemadekahoot_prod' : 'homemadekahoot_dev';
      mongoURI = baseURI.replace(/\/[^\/]*$/, `/${dbName}`);
    } else {
      // MongoDB Atlas - use URL parsing
      mongoURI = getDatabaseURI(baseURI);
    }
    
    console.log(`Connecting to MongoDB (${env})...`);
    console.log(`Database: ${mongoURI.split('/').pop().split('?')[0]}`);
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const resetDatabase = async () => {
  try {
    const env = process.env.NODE_ENV || 'development';
    console.log(`Resetting ${env} database...`);
    await connectDB();
    
    const db = mongoose.connection.db;
    
    // Get all collection names
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections`);
    
    // Drop all collections
    for (const collection of collections) {
      console.log(`Dropping collection: ${collection.name}`);
      await db.collection(collection.name).drop();
    }
    
    console.log(`All collections dropped successfully from ${env} database!`);
    console.log('Database will be recreated with correct schemas on next server start.');
    
    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
};

// Run the reset
resetDatabase();

