const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.dev') });

async function createUser() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/homemadekahoot_dev';
    console.log('Connecting to MongoDB...');
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const username = process.argv[2] || 'Furky';
    const password = process.argv[3] || 'password123';

    // Check if user exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      console.log(`\n⚠️  User already exists: ${username}`);
      console.log('   Use a different username or delete the existing user first.');
      await mongoose.disconnect();
      return;
    }

    // Create user
    const user = await User.create({ username, password });
    console.log(`\n✅ User created successfully!`);
    console.log(`   Username: ${user.username}`);
    console.log(`   ID: ${user._id}`);
    console.log(`   Created at: ${user.createdAt}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createUser();

