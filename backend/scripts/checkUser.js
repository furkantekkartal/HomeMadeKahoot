const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.dev') });

async function checkUser() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/homemadekahoot_dev';
    console.log('Connecting to MongoDB:', mongoUri.replace(/\/\/.*@/, '//***@'));
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const username = 'Furky';
    const user = await User.findOne({ username });
    
    if (user) {
      console.log(`\n✅ User found: ${user.username}`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Password hash exists: ${!!user.password}`);
      console.log(`   Password hash length: ${user.password ? user.password.length : 0}`);
      console.log(`   Created at: ${user.createdAt}`);
    } else {
      console.log(`\n❌ User not found: ${username}`);
      console.log('\nAvailable users:');
      const allUsers = await User.find({}).select('username createdAt');
      if (allUsers.length === 0) {
        console.log('   No users in database');
      } else {
        allUsers.forEach(u => console.log(`   - ${u.username} (created: ${u.createdAt})`));
      }
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUser();

