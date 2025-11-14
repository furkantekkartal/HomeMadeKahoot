const mongoose = require('mongoose');
require('dotenv').config();

const StudySession = require('../models/StudySession');

/**
 * Get database URI with dev suffix (only for dev, not production)
 */
const getDatabaseURI = (baseURI) => {
  if (baseURI.startsWith('mongodb://localhost') || baseURI.startsWith('mongodb://127.0.0.1')) {
    return baseURI.replace(/\/[^\/]*$/, '/homemadekahoot_dev');
  } else {
    const url = new URL(baseURI);
    const currentDbName = url.pathname.replace('/', '') || 'homemadekahoot';
    let newDbName;
    if (currentDbName.endsWith('_prod') || currentDbName.endsWith('_dev')) {
      newDbName = currentDbName.replace(/_(prod|dev)$/, '_dev');
    } else {
      newDbName = currentDbName + '_dev';
    }
    url.pathname = '/' + newDbName;
    return url.toString();
  }
};

async function resetGamePerformance() {
  try {
    const baseURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homemadekahoot';
    const mongoURI = getDatabaseURI(baseURI);
    
    console.log('⚠️  Resetting game performance statistics (DEV database only)');
    console.log(`Connecting to MongoDB (DEV)...`);
    console.log(`Database: ${mongoURI.split('/').pop().split('?')[0]}`);
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Delete all study sessions for Flashcards and Spelling modules
    const result = await StudySession.deleteMany({
      module: { $in: ['Flashcards', 'Spelling'] }
    });

    console.log(`\n✅ Successfully deleted ${result.deletedCount} game performance sessions`);
    console.log(`   - Flashcards sessions: deleted`);
    console.log(`   - Spelling sessions: deleted`);
    console.log('\nGame performance statistics have been reset to zero (DEV only).');

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting game performance:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
resetGamePerformance();

