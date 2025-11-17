/**
 * Migration script to remove email index from users collection
 * Run this once after removing email field from User model
 */

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');

async function removeEmailIndex() {
  try {
    await connectDB();
    
    const db = mongoose.connection.db;
    const collection = db.collection('users');
    
    // Get all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(idx => idx.name));
    
    // Check if email index exists
    const emailIndex = indexes.find(idx => idx.name === 'email_1');
    
    if (emailIndex) {
      console.log('Found email_1 index, dropping it...');
      await collection.dropIndex('email_1');
      console.log('✅ Successfully dropped email_1 index');
    } else {
      console.log('ℹ️  email_1 index not found (may have already been removed)');
    }
    
    // Also check for email index without _1 suffix (in case it's named differently)
    const emailIndexAlt = indexes.find(idx => 
      idx.key && idx.key.email !== undefined
    );
    
    if (emailIndexAlt && emailIndexAlt.name !== 'email_1') {
      console.log(`Found email index with name: ${emailIndexAlt.name}, dropping it...`);
      await collection.dropIndex(emailIndexAlt.name);
      console.log(`✅ Successfully dropped ${emailIndexAlt.name} index`);
    }
    
    // Verify indexes after removal
    const remainingIndexes = await collection.indexes();
    console.log('\nRemaining indexes:', remainingIndexes.map(idx => idx.name));
    
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error removing email index:', error);
    process.exit(1);
  }
}

removeEmailIndex();

