const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const os = require('os');
require('dotenv').config();
const connectDB = require('../config/database');
const Word = require('../models/Word');

/**
 * Reset database and import words from CSV file
 * This script will:
 * 1. Drop all collections in the database
 * 2. Import words from Database.csv on desktop
 * 
 * Usage: node scripts/resetAndImportDatabase.js [path-to-csv]
 */

async function resetAndImportDatabase(csvFilePath) {
  try {
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database');

    const db = mongoose.connection.db;
    const dbName = db.databaseName;
    console.log(`📁 Database: ${dbName}\n`);

    // Step 1: Drop all collections
    console.log('🗑️  Dropping all collections...');
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collection(s) to drop:`);
    
    for (const collection of collections) {
      try {
        await db.collection(collection.name).drop();
        console.log(`   ✓ Dropped: ${collection.name}`);
      } catch (error) {
        console.log(`   ⚠️  Could not drop ${collection.name}: ${error.message}`);
      }
    }
    console.log('✅ All collections dropped\n');

    // Step 2: Import CSV file
    // Default to Desktop\Database.csv if no path provided
    if (!csvFilePath) {
      const desktopPath = path.join(os.homedir(), 'Desktop', 'Database.csv');
      csvFilePath = desktopPath;
    }

    // Check if file exists
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV file not found: ${csvFilePath}`);
    }

    console.log(`📂 Reading CSV file: ${csvFilePath}`);
    const words = [];
    let rowCount = 0;
    let currentWordId = 1;

    // Read and parse CSV file
    let firstRow = true;
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath, { encoding: 'utf8' })
        .pipe(csv())
        .on('data', (row) => {
          rowCount++;
          
          // Debug: Show column names from first row
          if (firstRow && rowCount === 1) {
            console.log('📋 CSV Column names:', Object.keys(row));
            firstRow = false;
          }
          
          // Try different possible column name variations
          const englishWord = row.english_word || row['english_word'] || row['English Word'] || 
                            row['English_Word'] || row['EnglishWord'] || row['word'] || 
                            row['Word'] || row['englishWord'];
          
          // Skip rows with missing essential data (english_word is required)
          if (!englishWord || !englishWord.trim()) {
            return;
          }

          // Use word_id from CSV if available, otherwise auto-generate
          let wordId;
          const wordIdValue = row.word_id || row['word_id'] || row['Word ID'] || 
                            row['Word_ID'] || row['wordId'] || row['id'] || row['ID'];
          if (wordIdValue && wordIdValue.toString().trim()) {
            wordId = parseInt(wordIdValue.toString().trim());
            if (isNaN(wordId)) {
              wordId = currentWordId++;
            } else {
              if (wordId >= currentWordId) {
                currentWordId = wordId + 1;
              }
            }
          } else {
            wordId = currentWordId++;
          }

          // Helper function to get column value
          const getColumn = (variations) => {
            for (const key of variations) {
              if (row[key] !== undefined && row[key] !== null && row[key].toString().trim() !== '') {
                return row[key].toString().trim();
              }
            }
            return null;
          };

          const word = {
            wordId: wordId,
            englishWord: englishWord.trim(),
            wordType: getColumn(['word_type', 'wordType', 'Word Type', 'Word_Type', 'type', 'Type']) || null,
            turkishMeaning: getColumn(['turkish_meaning', 'turkishMeaning', 'Turkish Meaning', 
                                     'Turkish_Meaning', 'turkish', 'Turkish', 'meaning', 'Meaning']) || null,
            category1: getColumn(['category_1', 'category1', 'Category 1', 'Category_1', 'category', 'Category']) || null,
            category2: getColumn(['category_2', 'category2', 'Category 2', 'Category_2']) || null,
            category3: getColumn(['category_3', 'category3', 'Category 3', 'Category_3']) || null,
            englishLevel: getColumn(['english_level', 'englishLevel', 'English Level', 
                                   'English_Level', 'level', 'Level', 'cefr', 'CEFR']) || null,
            sampleSentenceEn: getColumn(['sample_sentence_en', 'sampleSentenceEn', 'Sample Sentence En', 
                                        'Sample_Sentence_En', 'sentence_en', 'sentenceEn', 'sentence', 'Sentence']) || null,
            sampleSentenceTr: getColumn(['sample_sentence_tr', 'sampleSentenceTr', 'Sample Sentence Tr', 
                                        'Sample_Sentence_Tr', 'sentence_tr', 'sentenceTr']) || null
          };

          // Convert empty strings to null
          Object.keys(word).forEach(key => {
            if (word[key] === '') {
              word[key] = null;
            }
          });

          words.push(word);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`📊 Parsed ${words.length} words from CSV\n`);

    if (words.length === 0) {
      throw new Error('No valid words found in CSV file');
    }

    // Step 3: Insert words into database
    console.log('💾 Inserting words into database...');
    let inserted = 0;
    let errors = 0;

    // Use bulk insert for better performance
    const batchSize = 100;
    for (let i = 0; i < words.length; i += batchSize) {
      const batch = words.slice(i, i + batchSize);
      try {
        await Word.insertMany(batch, { ordered: false });
        inserted += batch.length;
        process.stdout.write(`\r   Progress: ${Math.min(inserted, words.length)}/${words.length} words inserted`);
      } catch (error) {
        // If bulk insert fails, try inserting one by one
        for (const word of batch) {
          try {
            await Word.create(word);
            inserted++;
          } catch (err) {
            console.error(`\n   ⚠️  Error inserting word "${word.englishWord}" (ID: ${word.wordId}): ${err.message}`);
            errors++;
          }
        }
      }
    }

    console.log('\n\n=== Import Summary ===');
    console.log(`📝 Total words in CSV: ${words.length}`);
    console.log(`✅ Successfully inserted: ${inserted}`);
    if (errors > 0) {
      console.log(`❌ Errors: ${errors}`);
    }
    console.log('\n✅ Database reset and import completed successfully!');

    // Show final word count
    const finalCount = await Word.countDocuments();
    console.log(`📊 Total words in database: ${finalCount}`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Get CSV file path from command line argument or use default (Desktop\Database.csv)
const csvFilePath = process.argv[2];

if (!csvFilePath) {
  const desktopPath = path.join(os.homedir(), 'Desktop', 'Database.csv');
  console.log(`📂 No CSV file path provided, using default: ${desktopPath}`);
  console.log('💡 Usage: node scripts/resetAndImportDatabase.js [path-to-csv-file]\n');
}

resetAndImportDatabase(csvFilePath);

