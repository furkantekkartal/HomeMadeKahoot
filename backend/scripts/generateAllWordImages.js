const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Import the image service
const { generateWordImage } = require('../services/imageService');

// Import Word model
const Word = require('../models/Word');

// Get number of Unsplash keys available (from environment)
const getUnsplashKeyCount = () => {
  const keys = [
    process.env.UNSPLASH_ACCESS_KEY_1 || process.env.UNSPLASH_ACCESS_KEY,
    process.env.UNSPLASH_ACCESS_KEY_2,
    process.env.UNSPLASH_ACCESS_KEY_3,
    process.env.UNSPLASH_ACCESS_KEY_4,
    process.env.UNSPLASH_ACCESS_KEY_5
  ].filter(key => key);
  return keys.length || 1; // Default to 1 if no keys found
};

const UNSPLASH_KEY_COUNT = getUnsplashKeyCount();

// Default image URL (same as in frontend)
const DEFAULT_IMAGE_URL = 'https://img.freepik.com/free-vector/illustration-gallery-icon_53876-27002.jpg?semt=ais_hybrid&w=740&q=80';

/**
 * Get database URI (supports both local and remote)
 * Uses the same logic as the main app - appends _dev or _prod based on NODE_ENV
 * If MONGODB_DB_NAME is set, it will override the database name in the URI
 */
const getDatabaseURI = () => {
  let baseURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/homemadekahoot';
  const env = process.env.NODE_ENV || 'development';
  
  // If MONGODB_DB_NAME is explicitly set, use it
  if (process.env.MONGODB_DB_NAME) {
    try {
      const url = new URL(baseURI);
      url.pathname = '/' + process.env.MONGODB_DB_NAME;
      baseURI = url.toString();
      console.log(`📝 Using database name from MONGODB_DB_NAME: ${process.env.MONGODB_DB_NAME}`);
      return baseURI;
    } catch (e) {
      // If URL parsing fails, try simple string replacement
      if (baseURI.startsWith('mongodb://') || baseURI.startsWith('mongodb+srv://')) {
        baseURI = baseURI.replace(/\/([^\/\?]+)(\?|$)/, `/${process.env.MONGODB_DB_NAME}$2`);
        console.log(`📝 Using database name from MONGODB_DB_NAME: ${process.env.MONGODB_DB_NAME}`);
        return baseURI;
      }
    }
  }
  
  // Use same logic as main app - append _dev or _prod suffix
  if (baseURI.startsWith('mongodb://localhost') || baseURI.startsWith('mongodb://127.0.0.1')) {
    // Local MongoDB - append database name directly
    const dbName = env === 'production' ? 'homemadekahoot_prod' : 'homemadekahoot_dev';
    baseURI = baseURI.replace(/\/[^\/]*$/, `/${dbName}`);
  } else {
    // MongoDB Atlas - use URL parsing
    try {
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
      
      // Update the pathname with new database name (preserve query parameters)
      url.pathname = '/' + newDbName;
      baseURI = url.toString();
    } catch (e) {
      console.warn('⚠️  Could not parse MongoDB URI, using as-is');
    }
  }
  
  return baseURI;
};

/**
 * Get Unsplash key number and position within key's range for a word index
 */
function getKeyInfo(wordIndex) {
  const WORDS_PER_KEY = 2600;
  const keyIndex = Math.floor(wordIndex / WORDS_PER_KEY);
  const keyNumber = keyIndex + 1; // 1-based for display
  const positionInKey = (wordIndex % WORDS_PER_KEY) + 1; // 1-based position within key's range
  return { keyNumber, positionInKey };
}

/**
 * Write log to both console and file
 */
async function writeLog(message, logFile) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  
  console.log(message); // Console without timestamp for cleaner output
  await fs.appendFile(logFile, logMessage + '\n', 'utf8');
}

/**
 * Main function to generate images for all words without images
 */
async function generateAllWordImages() {
  const logFile = path.join(__dirname, '../logs/image-generation.log');
  
  try {
    // Ensure logs directory exists
    const logsDir = path.dirname(logFile);
    await fs.mkdir(logsDir, { recursive: true });
    
    // Clear or create log file
    await fs.writeFile(logFile, `Image Generation Started: ${new Date().toISOString()}\n\n`, 'utf8');
    
    const mongoURI = getDatabaseURI();
    console.log('🔌 Connecting to MongoDB...');
    await writeLog(`Connecting to: ${mongoURI.split('@')[1] || mongoURI}`, logFile);
    
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB\n');
    await writeLog('Connected to MongoDB successfully', logFile);
    
    // Diagnostic: Check database and collections
    const db = mongoose.connection.db;
    const dbName = db.databaseName;
    console.log(`📁 Connected to database: ${dbName}`);
    
    // Show connection URI info (without password)
    const connectionUri = mongoURI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
    console.log(`🔗 Connection URI: ${connectionUri}`);
    
    if (dbName === 'test') {
      console.log(`\n⚠️  WARNING: Connected to "test" database!`);
      console.log(`   If your words are in a different database, set MONGODB_DB_NAME in .env`);
      console.log(`   Example: MONGODB_DB_NAME=homemadekahoot`);
    }
    
    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`\n📚 Collections in database (${collections.length}):`);
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    
    // Check Word collection specifically
    const wordCollectionName = Word.collection.name;
    console.log(`\n🔍 Word model uses collection: "${wordCollectionName}"`);
    
    // Check if collection exists and get count
    const wordCollectionExists = collections.some(col => col.name === wordCollectionName);
    if (!wordCollectionExists) {
      console.log(`⚠️  WARNING: Collection "${wordCollectionName}" does not exist!`);
    }
    
    // Diagnostic: Check total words and sample image URLs
    const totalWordsInDb = await Word.countDocuments({});
    console.log(`\n📊 Total words in "${wordCollectionName}" collection: ${totalWordsInDb}`);
    
    // Get sample of words to see what image URLs look like
    const sampleWords = await Word.find({ imageUrl: { $exists: true, $ne: null, $ne: '' } })
      .select('wordId englishWord imageUrl')
      .limit(10)
      .sort({ wordId: 1 });
    
    if (sampleWords.length > 0) {
      console.log(`\n🔍 Sample image URLs from database:`);
      sampleWords.forEach(word => {
        const urlPreview = word.imageUrl ? word.imageUrl.substring(0, 80) + '...' : 'null';
        console.log(`   Word ${word.wordId} (${word.englishWord}): ${urlPreview}`);
      });
    }
    
    // Check for various default/placeholder patterns
    const patterns = [
      { name: 'freepik gallery-icon', regex: /freepik.*gallery-icon|illustration-gallery-icon/i },
      { name: 'placeholder', regex: /placeholder|place-holder|place_holder/i },
      { name: 'default', regex: /default.*image|image.*default/i },
      { name: 'via.placeholder', regex: /via\.placeholder/i },
      { name: 'empty or missing', count: await Word.countDocuments({ $or: [{ imageUrl: { $exists: false } }, { imageUrl: null }, { imageUrl: '' }] }) }
    ];
    
    console.log(`\n🔍 Checking for words with default/placeholder images...`);
    for (const pattern of patterns) {
      if (pattern.regex) {
        const count = await Word.countDocuments({ imageUrl: { $regex: pattern.regex } });
        if (count > 0) {
          console.log(`   Found ${count} words with "${pattern.name}" pattern`);
        }
      } else {
        if (pattern.count > 0) {
          console.log(`   Found ${pattern.count} words with "${pattern.name}"`);
        }
      }
    }
    console.log('');
    
    // Find all words without images or with default/placeholder images
    // This includes: null, empty, default URL, or URLs containing common placeholder patterns
    const wordsWithoutImages = await Word.find({
      $or: [
        { imageUrl: { $exists: false } },
        { imageUrl: null },
        { imageUrl: '' },
        { imageUrl: DEFAULT_IMAGE_URL },
        { imageUrl: { $regex: /freepik.*gallery-icon|illustration-gallery-icon/i } },
        { imageUrl: { $regex: /placeholder|place-holder|place_holder/i } },
        { imageUrl: { $regex: /default.*image|image.*default/i } },
        { imageUrl: { $regex: /via\.placeholder/i } }
      ]
    }).sort({ wordId: 1 });
    
    const totalWords = wordsWithoutImages.length;
    console.log(`📊 Found ${totalWords} words that need images\n`);
    await writeLog(`Found ${totalWords} words that need images`, logFile);
    
    if (totalWords === 0) {
      console.log('✅ All words already have images!');
      await writeLog('All words already have images - nothing to do', logFile);
      await mongoose.disconnect();
      return;
    }
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    console.log('🚀 Starting image generation with parallel processing...\n');
    await writeLog(`Starting image generation for ${totalWords} words (parallel processing with ${UNSPLASH_KEY_COUNT} keys)`, logFile);
    
    // Group words by key number for parallel processing
    const wordsByKey = {};
    for (let i = 0; i < wordsWithoutImages.length; i++) {
      const word = wordsWithoutImages[i];
      const wordIndex = word.wordId ? word.wordId - 1 : i;
      const { keyNumber } = getKeyInfo(wordIndex);
      
      if (!wordsByKey[keyNumber]) {
        wordsByKey[keyNumber] = [];
      }
      wordsByKey[keyNumber].push({ word, wordIndex });
    }
    
    // Process each key's words in parallel
    const processKeyWords = async (keyNumber, wordsForKey, totalWordsCount) => {
      let keySuccessCount = 0;
      let keyErrorCount = 0;
      const keyErrors = [];
      
      for (let i = 0; i < wordsForKey.length; i++) {
        const { word, wordIndex } = wordsForKey[i];
        // Calculate the range for this key (1-based wordIndex)
        const WORDS_PER_KEY = 2600;
        const actualWordIndex = wordIndex + 1; // Convert to 1-based for display
        const keyStart = (keyNumber - 1) * WORDS_PER_KEY + 1;
        const keyEnd = keyNumber * WORDS_PER_KEY;
        // For the last key, use total words count instead of calculated end
        const maxIndex = (keyNumber === UNSPLASH_KEY_COUNT) ? totalWordsCount : keyEnd;
        const progress = `${actualWordIndex} / ${maxIndex}`; // Show actual word index and max for this key
        
        try {
          // Generate image using Unsplash service
          const result = await generateWordImage(
            word.englishWord,
            word.wordType || '',
            word.sampleSentenceEn || '',
            '', // No custom keywords
            'unsplash', // Use Unsplash service
            wordIndex // Pass word index for key selection
          );
          
          // Update word in database
          word.imageUrl = result.imageUrl;
          await word.save();
          
          const logMessage = `Key${keyNumber} | ${progress} | Image Added | (${word.englishWord})`;
          await writeLog(logMessage, logFile);
          keySuccessCount++;
          
          // Delay to respect rate limits (50 requests/hour per key = 72 seconds per request)
          // Using 73 seconds (slightly above 72) to be safe and maximize throughput
          // With 5 keys in parallel: 5 × 50 = 250 requests/hour total
          await new Promise(resolve => setTimeout(resolve, 73000));
          
        } catch (error) {
          keyErrorCount++;
          const errorMessage = error.message || 'Unknown error';
          const logMessage = `Key${keyNumber} | ${progress} | ERROR: ${errorMessage} | (${word.englishWord})`;
          await writeLog(logMessage, logFile);
          keyErrors.push({
            word: word.englishWord,
            wordId: word.wordId,
            error: errorMessage
          });
          
          // If it's a 403 rate limit error, wait longer before continuing
          if (errorMessage.includes('403') || errorMessage.includes('Rate limit')) {
            console.log(`⚠️  Key${keyNumber} hit rate limit. Waiting 5 minutes before continuing...`);
            await new Promise(resolve => setTimeout(resolve, 300000)); // 5 minutes
          } else {
            // Still wait a bit even on error to avoid hammering the API
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      return { keySuccessCount, keyErrorCount, keyErrors };
    };
    
    // Process all keys in parallel with staggered start times
    // Each key starts 0.25 seconds after the previous one
    const keyPromises = Object.keys(wordsByKey).map((keyNumber, index) => {
      const keyNum = parseInt(keyNumber);
      const staggerDelay = index * 250; // 0.25 seconds = 250ms per key
      
      // Return a promise that waits for the stagger delay, then processes
      return new Promise((resolve) => {
        setTimeout(async () => {
          const result = await processKeyWords(keyNum, wordsByKey[keyNumber], totalWords);
          resolve(result);
        }, staggerDelay);
      });
    });
    
    const results = await Promise.all(keyPromises);
    
    // Aggregate results
    results.forEach(result => {
      successCount += result.keySuccessCount;
      errorCount += result.keyErrorCount;
      errors.push(...result.keyErrors);
    });
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 GENERATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total words processed: ${totalWords}`);
    console.log(`✅ Successfully generated: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📁 Log file: ${logFile}`);
    
    await writeLog('\n' + '='.repeat(60), logFile);
    await writeLog('GENERATION SUMMARY', logFile);
    await writeLog(`Total words processed: ${totalWords}`, logFile);
    await writeLog(`Successfully generated: ${successCount}`, logFile);
    await writeLog(`Errors: ${errorCount}`, logFile);
    
    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      await writeLog('\nERRORS:', logFile);
      errors.forEach((err, idx) => {
        const errorMsg = `${idx + 1}. Word "${err.word}" (ID: ${err.wordId}): ${err.error}`;
        console.log(errorMsg);
        writeLog(errorMsg, logFile);
      });
    }
    
    await writeLog(`\nImage Generation Completed: ${new Date().toISOString()}`, logFile);
    console.log('\n✅ Image generation completed!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    await writeLog(`FATAL ERROR: ${error.message}`, logFile);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  generateAllWordImages()
    .then(() => {
      console.log('\n✨ Script finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { generateAllWordImages };

