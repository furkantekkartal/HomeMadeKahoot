require('dotenv').config();
const mongoose = require('mongoose');

// Import User model to register it
require('../models/User');

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

const resetUsers = async () => {
  try {
    const env = process.env.NODE_ENV || 'development';
    console.log(`Resetting users collection in ${env} database...`);
    await connectDB();
    
    const db = mongoose.connection.db;
    
    // Check if users collection exists
    const collections = await db.listCollections({ name: 'users' }).toArray();
    
    if (collections.length === 0) {
      console.log('Users collection does not exist. Nothing to reset.');
      await mongoose.connection.close();
      process.exit(0);
    }
    
    // Drop users collection
    console.log('Dropping users collection...');
    await db.collection('users').drop();
    
    console.log(`Users collection dropped successfully from ${env} database!`);
    console.log('Users collection will be recreated with correct schema on next server start.');
    
    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    if (error.message.includes('ns not found')) {
      console.log('Users collection does not exist. Nothing to reset.');
      await mongoose.connection.close();
      process.exit(0);
    } else {
      console.error('Error resetting users collection:', error);
      process.exit(1);
    }
  }
};

// Run the reset
resetUsers();


