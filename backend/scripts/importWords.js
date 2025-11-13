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

    // Get the highest wordId to start from (if word_id is not in CSV)
    const maxWord = await Word.findOne().sort({ wordId: -1 });
    let currentWordId = maxWord ? maxWord.wordId + 1 : 1;

    // Read and parse CSV file
    let firstRow = true;
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath, { encoding: 'utf8' })
        .pipe(csv())
        .on('data', (row) => {
          rowCount++;
          
          // Debug: Show column names from first row
          if (firstRow && rowCount === 1) {
            console.log('CSV Column names:', Object.keys(row));
            firstRow = false;
          }
          
          // Try different possible column name variations
          const englishWord = row.english_word || row['english_word'] || row['English Word'] || row['English_Word'] || row['EnglishWord'];
          
          // Skip rows with missing essential data (english_word is required)
          if (!englishWord || !englishWord.trim()) {
            if (rowCount <= 5) {
              console.log(`Row ${rowCount} sample:`, Object.keys(row).slice(0, 5));
            }
            return;
          }

          // Use word_id from CSV if available, otherwise auto-generate
          let wordId;
          const wordIdValue = row.word_id || row['word_id'] || row['Word ID'] || row['Word_ID'] || row['wordId'];
          if (wordIdValue && wordIdValue.toString().trim()) {
            wordId = parseInt(wordIdValue.toString().trim());
            if (isNaN(wordId)) {
              // If word_id is not a valid number, auto-generate
              wordId = currentWordId++;
            } else {
              // Update currentWordId to be higher than the highest imported word_id
              if (wordId >= currentWordId) {
                currentWordId = wordId + 1;
              }
            }
          } else {
            // Auto-generate word_id
            wordId = currentWordId++;
          }

          // Try different possible column name variations
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
            wordType: getColumn(['word_type', 'wordType', 'Word Type', 'Word_Type']) || null,
            turkishMeaning: getColumn(['turkish_meaning', 'turkishMeaning', 'Turkish Meaning', 'Turkish_Meaning']) || null,
            category1: getColumn(['category_1', 'category1', 'Category 1', 'Category_1']) || null,
            category2: getColumn(['category_2', 'category2', 'Category 2', 'Category_2']) || null,
            category3: getColumn(['category_3', 'category3', 'Category 3', 'Category_3']) || null,
            englishLevel: getColumn(['english_level', 'englishLevel', 'English Level', 'English_Level']) || null,
            sampleSentenceEn: getColumn(['sample_sentence_en', 'sampleSentenceEn', 'Sample Sentence En', 'Sample_Sentence_En']) || null,
            sampleSentenceTr: getColumn(['sample_sentence_tr', 'sampleSentenceTr', 'Sample Sentence Tr', 'Sample_Sentence_Tr']) || null
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

    console.log(`Parsed ${words.length} words from CSV`);

    if (words.length === 0) {
      throw new Error('No valid words found in file');
    }

    // Clear existing words (optional - comment out if you want to keep existing words)
    // await Word.deleteMany({});
    // console.log('Cleared existing words');

    // Insert words into database (using upsert to avoid duplicates)
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const word of words) {
      try {
        // Check if word already exists by englishWord (case-insensitive)
        const existingWord = await Word.findOne({
          englishWord: { $regex: new RegExp(`^${word.englishWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        });

        if (existingWord) {
          // Update existing word, but keep its original wordId
          word.wordId = existingWord.wordId;
          await Word.findOneAndUpdate(
            { wordId: word.wordId },
            word,
            { new: true }
          );
          updated++;
        } else {
          // Check if wordId is already taken
          const wordIdExists = await Word.findOne({ wordId: word.wordId });
          if (wordIdExists) {
            // Find next available wordId
            const maxWord = await Word.findOne().sort({ wordId: -1 });
            word.wordId = maxWord ? maxWord.wordId + 1 : 1;
          }
          
          // Insert new word
          await Word.create(word);
          inserted++;
        }
      } catch (error) {
        console.error(`Error processing word "${word.englishWord}" (ID: ${word.wordId}): ${error.message}`);
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

