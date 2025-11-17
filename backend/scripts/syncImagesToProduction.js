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
 * Sync image URLs from dev to production
 * Only updates words that have imageUrl in dev
 */
const syncImages = async () => {
  const baseURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homemadekahoot';
  
  if (!baseURI) {
    console.error('✗ MONGODB_URI not found in environment variables');
    process.exit(1);
  }
  
  const devURI = getDatabaseURI(baseURI, '_dev');
  const prodURI = getDatabaseURI(baseURI, '_prod');
  
  console.log('🖼️  Starting image URL sync from DEV to PRODUCTION...\n');
  console.log(`Source (DEV): ${devURI.split('@')[1] || devURI}`);
  console.log(`Target (PROD): ${prodURI.split('@')[1] || prodURI}\n`);
  
  let devConn = null;
  let prodConn = null;
  
  try {
    // Connect to dev database
    devConn = await connectToDB(devURI, 'DEV');
    
    // Connect to prod database
    prodConn = await connectToDB(prodURI, 'PROD');
    
    // Get Word model for both connections
    const WordSchema = new mongoose.Schema({
      wordId: Number,
      englishWord: String,
      wordType: String,
      turkishMeaning: String,
      category1: String,
      category2: String,
      category3: String,
      englishLevel: String,
      sampleSentenceEn: String,
      sampleSentenceTr: String,
      imageUrl: String,
      createdAt: Date
    }, { collection: 'words' });
    
    const DevWord = devConn.model('Word', WordSchema);
    const ProdWord = prodConn.model('Word', WordSchema);
    
    // Find all words in dev that have imageUrl
    console.log('📊 Scanning DEV database for words with images...');
    const wordsWithImages = await DevWord.find({ 
      imageUrl: { $exists: true, $ne: null, $ne: '' } 
    }).select('wordId englishWord imageUrl');
    
    console.log(`   Found ${wordsWithImages.length} words with images in DEV\n`);
    
    if (wordsWithImages.length === 0) {
      console.log('ℹ️  No words with images found in DEV database.');
      return;
    }
    
    // Sync images
    let updated = 0;
    let skipped = 0;
    let notFound = 0;
    let errors = 0;
    
    console.log('🔄 Syncing images to PRODUCTION...\n');
    
    for (const devWord of wordsWithImages) {
      try {
        // Find matching word in production by wordId
        const prodWord = await ProdWord.findOne({ wordId: devWord.wordId });
        
        if (!prodWord) {
          console.log(`   ⚠️  Word not found in PROD: "${devWord.englishWord}" (wordId: ${devWord.wordId})`);
          notFound++;
          continue;
        }
        
        // Check if imageUrl is different
        if (prodWord.imageUrl === devWord.imageUrl) {
          skipped++;
          continue;
        }
        
        // Update imageUrl in production
        await ProdWord.updateOne(
          { wordId: devWord.wordId },
          { $set: { imageUrl: devWord.imageUrl } }
        );
        
        updated++;
        
        // Show progress every 50 words
        if (updated % 50 === 0) {
          process.stdout.write(`   Progress: ${updated} updated...\r`);
        }
      } catch (error) {
        console.error(`   ✗ Error syncing word "${devWord.englishWord}" (wordId: ${devWord.wordId}):`, error.message);
        errors++;
      }
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SYNC SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total words with images in DEV: ${wordsWithImages.length}`);
    console.log(`✅ Updated in PROD: ${updated}`);
    console.log(`⏭️  Skipped (already same): ${skipped}`);
    console.log(`⚠️  Not found in PROD: ${notFound}`);
    if (errors > 0) {
      console.log(`❌ Errors: ${errors}`);
    }
    console.log('='.repeat(60));
    console.log('\n✅ Image sync completed successfully!');
    
  } catch (error) {
    console.error('\n✗ Sync failed:', error);
    process.exit(1);
  } finally {
    // Close connections
    if (devConn) {
      await devConn.close();
      console.log('\n✓ Closed DEV connection');
    }
    if (prodConn) {
      await prodConn.close();
      console.log('✓ Closed PROD connection');
    }
  }
};

// Run sync
if (require.main === module) {
  syncImages()
    .then(() => {
      console.log('\n🎉 All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = syncImages;

