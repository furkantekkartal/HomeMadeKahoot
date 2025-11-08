const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
require('dotenv').config();
const connectDB = require('../config/database');
const Word = require('../models/Word');

/**
 * Import words from CSV file into database
 * Usage: node scripts/importWords.js <path-to-csv-file>
 */
async function importWords(csvFilePath) {
  try {
    // Connect to database
    await connectDB();
    console.log('Connected to database');

    // Check if file exists
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`CSV file not found: ${csvFilePath}`);
    }

    const words = [];
    let rowCount = 0;

    // Read and parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
          rowCount++;
          
          // Skip rows with missing essential data
          if (!row.english_word || !row.word_id) {
            console.warn(`Skipping row ${rowCount}: missing essential data`);
            return;
          }

          // Parse KnownBetty and KnownFurky columns (these are user-specific, not stored in Word model)
          // We'll handle user word tracking separately

          const word = {
            wordId: parseInt(row.word_id),
            englishWord: row.english_word.trim(),
            wordType: row.word_type ? row.word_type.trim() : '',
            turkishMeaning: row.turkish_meaning ? row.turkish_meaning.trim() : '',
            category1: row.category_1 ? row.category_1.trim() : '',
            category2: row.category_2 ? row.category_2.trim() : '',
            category3: row.category_3 ? row.category_3.trim() : '',
            englishLevel: row.english_level ? row.english_level.trim() : '',
            sampleSentenceEn: row.sample_sentence_en ? row.sample_sentence_en.trim() : '',
            sampleSentenceTr: row.sample_sentence_tr ? row.sample_sentence_tr.trim() : ''
          };

          // Note: KnownBetty and KnownFurky columns are user-specific tracking
          // These should be imported separately using UserWord model if needed

          words.push(word);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`Parsed ${words.length} words from CSV`);

    // Clear existing words (optional - comment out if you want to keep existing words)
    // await Word.deleteMany({});
    // console.log('Cleared existing words');

    // Insert words into database (using upsert to avoid duplicates)
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const word of words) {
      try {
        const result = await Word.findOneAndUpdate(
          { wordId: word.wordId },
          word,
          { upsert: true, new: true }
        );
        
        if (result.isNew) {
          inserted++;
        } else {
          updated++;
        }
      } catch (error) {
        console.error(`Error processing word ${word.wordId}: ${error.message}`);
        skipped++;
      }
    }

    console.log('\n=== Import Summary ===');
    console.log(`Total words in CSV: ${words.length}`);
    console.log(`Inserted: ${inserted}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log('Import completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('Error importing words:', error);
    process.exit(1);
  }
}

// Get CSV file path from command line argument or use default
const csvFilePath = process.argv[2] || path.join(__dirname, '../../database.csv');

if (!process.argv[2]) {
  console.log('No CSV file path provided, using default: database.csv in project root');
  console.log('Usage: node scripts/importWords.js <path-to-csv-file>');
}

importWords(csvFilePath);

