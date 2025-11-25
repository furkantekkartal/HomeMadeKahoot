const mongoose = require('mongoose');

/**
 * Get the appropriate database name based on environment
 * Supports: local, development, production
 * @param {string} baseURI - Base MongoDB connection string
 * @returns {string} - Modified URI with correct database name
 */
const getDatabaseURI = (baseURI) => {
  const env = process.env.NODE_ENV || 'local';
  
  // Parse the URI to extract database name
  // Handle both mongodb:// and mongodb+srv:// formats
  const url = new URL(baseURI);
  const currentDbName = url.pathname.replace('/', '') || 'homemadekahoot';
  
  // Determine database suffix based on environment
  let dbSuffix = '';
  if (env === 'production') {
    dbSuffix = '_prod';
  } else if (env === 'development') {
    dbSuffix = '_dev';
  } else {
    dbSuffix = '_local'; // local environment
  }
  
  // Construct new database name
  let newDbName;
  if (currentDbName.endsWith('_prod') || currentDbName.endsWith('_dev') || currentDbName.endsWith('_local')) {
    // If already has suffix, replace it
    newDbName = currentDbName.replace(/_(prod|dev|local)$/, dbSuffix);
  } else {
    // Append suffix
    newDbName = currentDbName + dbSuffix;
  }
  
  // Update the pathname with new database name (preserve query parameters)
  url.pathname = '/' + newDbName;
  
  return url.toString();
};

const connectDB = async () => {
  try {
    const baseURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homemadekahoot';
    const env = process.env.NODE_ENV || 'local';
    
    // For local MongoDB, handle differently
    let mongoURI;
    if (baseURI.startsWith('mongodb://localhost') || baseURI.startsWith('mongodb://127.0.0.1')) {
      // Local MongoDB - append database name directly
      let dbName;
      if (env === 'production') {
        dbName = 'homemadekahoot_prod';
      } else if (env === 'development') {
        dbName = 'homemadekahoot_dev';
      } else {
        dbName = 'homemadekahoot_local'; // local environment
      }
      mongoURI = baseURI.replace(/\/[^\/]*$/, `/${dbName}`);
    } else {
      // MongoDB Atlas - use URL parsing
      mongoURI = getDatabaseURI(baseURI);
    }
    
    console.log(`Attempting to connect to MongoDB (${env})...`);
    console.log(`Database: ${mongoURI.split('/').pop()}`);
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
    console.log(`Environment: ${env}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });
    
    // Validate database structure in development (optional check)
    if (env === 'development') {
      // In development, we can optionally check for orphaned collections
      // This is a soft check and won't block the server
      setTimeout(async () => {
        try {
          const modelsRegistry = require('./modelsRegistry');
          const db = mongoose.connection.db;
          const existingCollections = await db.listCollections().toArray();
          const existingCollectionNames = existingCollections.map(c => c.name.toLowerCase());
          const expectedCollections = modelsRegistry.getExpectedCollections();
          
          const orphanedCollections = existingCollectionNames.filter(
            name => !expectedCollections.includes(name)
          );
          
          if (orphanedCollections.length > 0) {
            console.log(`\n⚠️  Warning: Found ${orphanedCollections.length} orphaned collection(s) in ${env} database.`);
            console.log('   Run "npm run db-status" for details or "npm run db-cleanup" to remove them.\n');
          }
        } catch (error) {
          // Silently fail - this is just a helpful check
        }
      }, 2000); // Wait 2 seconds after connection
    }
    
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.error('Full error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;

