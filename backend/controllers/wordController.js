const mongoose = require('mongoose');
const Word = require('../models/Word');
const UserWord = require('../models/UserWord');
const Source = require('../models/Source');
const SourceWord = require('../models/SourceWord');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const os = require('os');
const { Readable } = require('stream');
const { generateWordImage } = require('../services/imageService');
const { fillWordColumnsWithAI } = require('../services/aiDeckService');

// Get all words with pagination and filters
exports.getWords = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};
    if (req.query.category1) filter.category1 = req.query.category1;
    if (req.query.category2) filter.category2 = req.query.category2;
    if (req.query.category3) filter.category3 = req.query.category3;
    if (req.query.englishLevel) filter.englishLevel = req.query.englishLevel;
    if (req.query.wordType) filter.wordType = req.query.wordType;
    if (req.query.search) {
      filter.$or = [
        { englishWord: { $regex: req.query.search, $options: 'i' } },
        { turkishMeaning: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const words = await Word.find(filter)
      .sort({ wordId: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Word.countDocuments(filter);

    res.json({
      words,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single word by ID
exports.getWord = async (req, res) => {
  try {
    const word = await Word.findById(req.params.id);
    if (!word) {
      return res.status(404).json({ message: 'Word not found' });
    }
    res.json(word);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user's word statistics
exports.getUserWordStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    const totalWords = await Word.countDocuments();
    const knownWords = await UserWord.countDocuments({ userId, isKnown: true });
    const unknownWords = await UserWord.countDocuments({ userId, isKnown: false });

    // Stats by category
    const categoryStats = await UserWord.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), isKnown: true } },
      {
        $lookup: {
          from: 'words',
          localField: 'wordId',
          foreignField: '_id',
          as: 'word'
        }
      },
      { $unwind: '$word' },
      {
        $group: {
          _id: '$word.category1',
          count: { $sum: 1 }
        }
      }
    ]);

    // Stats by level
    const levelStats = await UserWord.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), isKnown: true } },
      {
        $lookup: {
          from: 'words',
          localField: 'wordId',
          foreignField: '_id',
          as: 'word'
        }
      },
      { $unwind: '$word' },
      {
        $group: {
          _id: '$word.englishLevel',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      totalWords,
      knownWords,
      unknownWords,
      trackedWords: knownWords + unknownWords,
      categoryStats: categoryStats.map(s => ({ category: s._id, count: s.count })),
      levelStats: levelStats.map(s => ({ level: s._id, count: s.count }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get words with user's known status
exports.getWordsWithStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const showKnown = req.query.showKnown !== 'false'; // Default to showing all
    const showUnknown = req.query.showUnknown !== 'false'; // Default to showing all

    // Build filter
    const filter = {};
    if (req.query.category1) filter.category1 = req.query.category1;
    if (req.query.category2) filter.category2 = req.query.category2;
    if (req.query.category3) filter.category3 = req.query.category3;
    if (req.query.englishLevel) filter.englishLevel = req.query.englishLevel;
    if (req.query.wordType) filter.wordType = req.query.wordType;
    if (req.query.search) {
      filter.$or = [
        { englishWord: { $regex: req.query.search, $options: 'i' } },
        { turkishMeaning: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // If sourceId is provided, filter words by source
    if (req.query.sourceId) {
      // Verify source belongs to user
      const source = await Source.findOne({ _id: req.query.sourceId, userId });
      if (!source) {
        return res.status(404).json({ message: 'Source not found' });
      }

      // Get all word IDs linked to this source
      const sourceWords = await SourceWord.find({ sourceId: req.query.sourceId }).lean();
      const sourceWordIds = sourceWords.map(sw => sw.wordId);
      
      // Add source word IDs to filter
      if (sourceWordIds.length > 0) {
        filter._id = { $in: sourceWordIds };
      } else {
        // No words in this source, return empty result
        return res.json({
          words: [],
          pagination: {
            page,
            limit,
            total: 0,
            pages: 0
          }
        });
      }
    }

    const words = await Word.find(filter)
      .sort({ wordId: 1 })
      .skip(skip)
      .limit(limit);

    // Get user's word statuses
    const wordIds = words.map(w => w._id);
    const userWords = await UserWord.find({
      userId,
      wordId: { $in: wordIds }
    });

    const userWordMap = {};
    userWords.forEach(uw => {
      userWordMap[uw.wordId.toString()] = {
        isKnown: uw.isKnown,
        isSpelled: uw.isSpelled
      };
    });

    // Get source names for each word
    const wordIdsForSources = words.map(w => w._id);
    const userSourceIds = await Source.find({ userId }).distinct('_id');
    const sourceWords = await SourceWord.find({ 
      wordId: { $in: wordIdsForSources },
      sourceId: { $in: userSourceIds }
    })
      .populate('sourceId', 'sourceName')
      .lean();

    // Create a map of wordId -> source names
    const wordSourceMap = {};
    sourceWords.forEach(sw => {
      const wordIdStr = sw.wordId.toString();
      if (!wordSourceMap[wordIdStr]) {
        wordSourceMap[wordIdStr] = [];
      }
      if (sw.sourceId && sw.sourceId.sourceName) {
        wordSourceMap[wordIdStr].push(sw.sourceId.sourceName);
      }
    });

    // Filter based on known/unknown preference
    let filteredWords = words.map(word => {
      const userWord = userWordMap[word._id.toString()];
      return {
        ...word.toObject(),
        isKnown: userWord ? userWord.isKnown : null, // null means not tracked yet
        isSpelled: userWord ? userWord.isSpelled : null, // null means not tracked yet
        sources: wordSourceMap[word._id.toString()] || [] // Array of source names
      };
    });

    if (showKnown === false) {
      filteredWords = filteredWords.filter(w => w.isKnown !== true);
    }
    if (showUnknown === false) {
      filteredWords = filteredWords.filter(w => w.isKnown !== false);
    }

    const total = await Word.countDocuments(filter);

    res.json({
      words: filteredWords,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark word as known/unknown
exports.toggleWordStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { wordId, isKnown } = req.body;

    if (!wordId) {
      return res.status(400).json({ message: 'Word ID is required' });
    }

    // Verify word exists
    const word = await Word.findById(wordId);
    if (!word) {
      return res.status(404).json({ message: 'Word not found' });
    }

    // Update or create user word record - ONLY update isKnown, NEVER touch isSpelled
    // Use $set to ensure only isKnown is updated, preserving isSpelled
    const userWord = await UserWord.findOneAndUpdate(
      { userId, wordId },
      { 
        $set: { 
          isKnown: isKnown !== undefined ? isKnown : true,
          updatedAt: Date.now()
        }
      },
      { upsert: true, new: true }
    );

    res.json({
      message: `Word marked as ${userWord.isKnown ? 'known' : 'unknown'}`,
      userWord
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark word spelling status (correct/incorrect)
exports.toggleSpellingStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { wordId, isSpelled } = req.body;

    if (!wordId) {
      return res.status(400).json({ message: 'Word ID is required' });
    }

    if (isSpelled === undefined) {
      return res.status(400).json({ message: 'isSpelled status is required' });
    }

    // Verify word exists
    const word = await Word.findById(wordId);
    if (!word) {
      return res.status(404).json({ message: 'Word not found' });
    }

    // Update or create user word record - ONLY update isSpelled, NEVER touch isKnown
    // Use findOneAndUpdate with $set to ensure only isSpelled is updated
    // When creating new document (upsert), only set isSpelled, let isKnown use its default
    const updateData = { 
      $set: { 
        isSpelled: isSpelled === true,
        updatedAt: Date.now()
      }
    };
    
    // Only set isSpelled on insert, don't touch isKnown
    const userWord = await UserWord.findOneAndUpdate(
      { userId, wordId },
      updateData,
      { 
        upsert: true, 
        new: true,
        // Don't use setDefaultsOnInsert - we only want to set isSpelled
        // isKnown will use its schema default (false) for new documents
      }
    );

    res.json({
      message: `Word spelling marked as ${userWord.isSpelled ? 'correct' : 'incorrect'}`,
      userWord
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Bulk mark words
exports.bulkMarkWords = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { wordIds, isKnown } = req.body;

    if (!wordIds || !Array.isArray(wordIds) || wordIds.length === 0) {
      return res.status(400).json({ message: 'Word IDs array is required' });
    }

    if (isKnown === undefined) {
      return res.status(400).json({ message: 'isKnown status is required' });
    }

    // Verify all words exist
    const words = await Word.find({ _id: { $in: wordIds } });
    if (words.length !== wordIds.length) {
      return res.status(400).json({ message: 'Some words not found' });
    }

    // Bulk update/create
    const operations = wordIds.map(wordId => ({
      updateOne: {
        filter: { userId, wordId },
        update: { isKnown, updatedAt: Date.now() },
        upsert: true
      }
    }));

    await UserWord.bulkWrite(operations);

    res.json({
      message: `Marked ${wordIds.length} words as ${isKnown ? 'known' : 'unknown'}`,
      count: wordIds.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const tempDir = os.tmpdir();
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'word-import-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and JSON files are allowed'));
    }
  }
});

// Export words to CSV or JSON
exports.exportWords = async (req, res) => {
  try {
    const userId = req.user.userId;
    const format = req.query.format || 'csv'; // csv or json

    // Get all words
    const words = await Word.find().sort({ wordId: 1 });

    // Get user's word statuses
    const wordIds = words.map(w => w._id);
    const userWords = await UserWord.find({
      userId,
      wordId: { $in: wordIds }
    });

    const userWordMap = {};
    userWords.forEach(uw => {
      userWordMap[uw.wordId.toString()] = uw.isKnown;
    });

    if (format === 'json') {
      // Export as JSON
      const exportData = words.map(word => ({
        wordId: word.wordId,
        englishWord: word.englishWord,
        wordType: word.wordType,
        turkishMeaning: word.turkishMeaning,
        category1: word.category1,
        category2: word.category2,
        category3: word.category3,
        englishLevel: word.englishLevel,
        sampleSentenceEn: word.sampleSentenceEn,
        sampleSentenceTr: word.sampleSentenceTr,
        isKnown: userWordMap[word._id.toString()] !== undefined ? userWordMap[word._id.toString()] : null
      }));

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="words-export-${Date.now()}.json"`);
      res.json(exportData);
    } else {
      // Export as CSV with UTF-8 BOM for Excel compatibility
      const csvRows = [];
      
      // CSV Header
      csvRows.push([
        'word_id',
        'english_word',
        'word_type',
        'turkish_meaning',
        'category_1',
        'category_2',
        'category_3',
        'english_level',
        'sample_sentence_en',
        'sample_sentence_tr',
        'is_known'
      ].join(','));

      // CSV Data rows
      words.forEach(word => {
        const isKnown = userWordMap[word._id.toString()];
        
        // Helper function to properly escape CSV values
        const escapeCsvValue = (value) => {
          if (value === null || value === undefined) return '';
          const str = String(value);
          // Escape quotes by doubling them
          const escaped = str.replace(/"/g, '""');
          // Wrap in quotes if contains comma, newline, or quote
          if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"') || escaped.includes('\r')) {
            return `"${escaped}"`;
          }
          return escaped;
        };

        csvRows.push([
          word.wordId || '',
          escapeCsvValue(word.englishWord || ''),
          escapeCsvValue(word.wordType || ''),
          escapeCsvValue(word.turkishMeaning || ''),
          escapeCsvValue(word.category1 || ''),
          escapeCsvValue(word.category2 || ''),
          escapeCsvValue(word.category3 || ''),
          escapeCsvValue(word.englishLevel || ''),
          escapeCsvValue(word.sampleSentenceEn || ''),
          escapeCsvValue(word.sampleSentenceTr || ''),
          isKnown !== undefined ? (isKnown ? '1' : '0') : ''
        ].join(','));
      });

      // Add UTF-8 BOM for Excel compatibility
      const csvContent = csvRows.join('\n');
      const csvWithBOM = '\ufeff' + csvContent;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="words-export-${Date.now()}.csv"`);
      res.send(Buffer.from(csvWithBOM, 'utf8'));
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Import words from file
exports.importWords = async (req, res) => {
  let filePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    const userId = req.user.userId;

    let words = [];
    let imported = 0;
    let updated = 0;
    let errors = [];

    if (fileExt === '.csv') {
      // Parse CSV file with UTF-8 encoding to handle Turkish characters
      const fsStream = fs.createReadStream(filePath, { encoding: 'utf8' });
      await new Promise((resolve, reject) => {
        const results = [];
        fsStream
          .pipe(csv({
            skipEmptyLines: true,
            skipLinesWithError: false
          }))
          .on('data', (row) => {
            if (row.english_word || row.englishWord) {
              const word = {
                wordId: parseInt(row.word_id || row.wordId) || null,
                englishWord: (row.english_word || row.englishWord || '').trim(),
                wordType: (row.word_type || row.wordType || '').trim(),
                turkishMeaning: (row.turkish_meaning || row.turkishMeaning || '').trim(),
                category1: (row.category_1 || row.category1 || '').trim(),
                category2: (row.category_2 || row.category2 || '').trim(),
                category3: (row.category_3 || row.category3 || '').trim(),
                englishLevel: (row.english_level || row.englishLevel || '').trim(),
                sampleSentenceEn: (row.sample_sentence_en || row.sampleSentenceEn || '').trim(),
                sampleSentenceTr: (row.sample_sentence_tr || row.sampleSentenceTr || '').trim(),
                isKnown: row.is_known !== undefined ? (row.is_known === '1' || row.is_known === 'true' || row.is_known === true) : null
              };
              results.push(word);
            }
          })
          .on('end', () => {
            words = results;
            resolve();
          })
          .on('error', reject);
      });
    } else if (fileExt === '.json') {
      // Parse JSON file
      const fileContent = await fsPromises.readFile(filePath, 'utf-8');
      const jsonData = JSON.parse(fileContent);
      words = Array.isArray(jsonData) ? jsonData : [jsonData];
    }

    if (words.length === 0) {
      return res.status(400).json({ message: 'No valid words found in file' });
    }

    // Import words
    for (let i = 0; i < words.length; i++) {
      const wordData = words[i];
      
      if (!wordData.englishWord) {
        errors.push(`Row ${i + 1}: Missing english word`);
        continue;
      }

      try {
        // If wordId is provided, use it; otherwise generate a new one
        let wordId = wordData.wordId;
        if (!wordId) {
          // Find the highest wordId and increment
          const maxWord = await Word.findOne().sort({ wordId: -1 });
          wordId = maxWord ? maxWord.wordId + 1 : 1;
        }

        // Check if word with this wordId already exists
        const existingWord = await Word.findOne({ wordId });
        
        const wordDoc = {
          wordId,
          englishWord: wordData.englishWord,
          wordType: wordData.wordType || '',
          turkishMeaning: wordData.turkishMeaning || '',
          category1: wordData.category1 || '',
          category2: wordData.category2 || '',
          category3: wordData.category3 || '',
          englishLevel: wordData.englishLevel || '',
          sampleSentenceEn: wordData.sampleSentenceEn || '',
          sampleSentenceTr: wordData.sampleSentenceTr || ''
        };

        let word;
        if (existingWord) {
          // Update existing word
          word = await Word.findOneAndUpdate({ wordId }, wordDoc, { new: true });
          updated++;
        } else {
          // Create new word
          word = await Word.create(wordDoc);
          imported++;
        }

        // If isKnown is specified, update user's word status
        if (wordData.isKnown !== null && wordData.isKnown !== undefined && word) {
          await UserWord.findOneAndUpdate(
            { userId, wordId: word._id },
            { isKnown: wordData.isKnown },
            { upsert: true }
          );
        }
      } catch (error) {
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    // Clean up uploaded file
    try {
      await fsPromises.unlink(filePath);
    } catch (cleanupError) {
      console.warn('Failed to cleanup file:', cleanupError);
    }

    res.json({
      message: 'Import completed',
      imported,
      updated,
      total: words.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (filePath) {
      try {
        await fsPromises.unlink(filePath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup file on error:', cleanupError);
      }
    }
    res.status(500).json({ message: error.message });
  }
};

// Helper function to validate if a word is valid
// Helper function to recalculate source level based on word distribution
async function recalculateSourceLevel(sourceId) {
  try {
    const source = await Source.findById(sourceId);
    if (!source) return;

    // Get all words linked to this source
    const sourceWords = await SourceWord.find({ sourceId }).select('wordId').lean();
    const wordIds = sourceWords.map(sw => sw.wordId);

    if (wordIds.length === 0) return;

    // Get words with levels
    const wordsWithLevels = await Word.find({
      _id: { $in: wordIds },
      englishLevel: { $exists: true, $ne: null, $ne: '' }
    }).select('englishLevel').lean();

    // Count words by level
    const levelCounts = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
    wordsWithLevels.forEach(word => {
      if (word.englishLevel && levelCounts.hasOwnProperty(word.englishLevel)) {
        levelCounts[word.englishLevel]++;
      }
    });

    // Find the level with the most words
    let maxCount = 0;
    let majorityLevel = null;
    for (const [level, count] of Object.entries(levelCounts)) {
      if (count > maxCount) {
        maxCount = count;
        majorityLevel = level;
      }
    }

    // Update source level if we found a majority
    if (majorityLevel && maxCount > 0) {
      source.level = majorityLevel;
      await source.save();
    }
  } catch (error) {
    console.error('Error recalculating source level:', error);
  }
}

function isValidWord(word) {
  if (!word || typeof word !== 'string') return false;
  const trimmed = word.trim();
  if (trimmed.length === 0) return false;
  
  // Check if it's just a single symbol or punctuation
  if (trimmed.length === 1 && /[^a-zA-Z0-9]/.test(trimmed)) return false;
  
  // Check if it contains at least one letter (a-z or A-Z)
  if (!/[a-zA-Z]/.test(trimmed)) return false;
  
  // Check if it's just symbols/punctuation (no letters after removing common punctuation)
  const withoutPunctuation = trimmed.replace(/[.,!?;:'"()[\]{}]/g, '');
  if (withoutPunctuation.length === 0) return false;
  
  return true;
}

// Add words from AI extraction (bulk add with duplicate checking and source tracking)
exports.addWordsFromAI = async (req, res) => {
  console.log('addWordsFromAI called');
  try {
    const { words, sourceName, sourceType, fileSize, contentPreview, url, pageTitle } = req.body; // Array of word strings, source file name, type, size, content preview, URL, and page title
    const userId = req.user.userId;

    if (!words || !Array.isArray(words) || words.length === 0) {
      return res.status(400).json({ message: 'Words array is required' });
    }

    if (!sourceName) {
      return res.status(400).json({ message: 'Source name is required' });
    }

    // Determine source type from file extension if not provided
    let detectedSourceType = sourceType || 'other';
    if (!sourceType && sourceName) {
      const ext = sourceName.toLowerCase().split('.').pop();
      // Only use extension if it's a valid enum value
      if (ext === 'pdf') detectedSourceType = 'pdf';
      else if (ext === 'srt') detectedSourceType = 'srt';
      else if (ext === 'txt') detectedSourceType = 'txt';
      else if (ext === 'youtube') detectedSourceType = 'youtube';
      // For .md files (from webpages) or any other extension, use 'other'
      else detectedSourceType = 'other';
    }

    // Generate meaningful title and description FIRST using AI
    let generatedTitle = sourceName; // Fallback to original name
    let generatedDescription = `English learning content from ${sourceName}`;
    
    try {
      const { generateSourceInfo } = require('../services/aiDeckService');
      const sourceInfo = await generateSourceInfo(sourceName, detectedSourceType, contentPreview || '', url || '', pageTitle || '');
      generatedTitle = sourceInfo.title;
      generatedDescription = sourceInfo.description;
    } catch (error) {
      console.error('Error generating source info:', error);
      // Use fallback title based on type
      if (detectedSourceType === 'srt') {
        generatedTitle = `TvSeries | ${sourceName.replace(/\.srt$/i, '')}`;
      } else if (detectedSourceType === 'other' && sourceName.includes('news')) {
        generatedTitle = `7News | ${sourceName.replace(/\.md$/i, '')}`;
      } else {
        generatedTitle = sourceName;
      }
    }

    // Use generated title as sourceName (meaningful name instead of filename)
    const meaningfulSourceName = generatedTitle;

    // Determine skill based on source type
    let detectedSkill = null;
    if (detectedSourceType === 'srt') {
      detectedSkill = 'Listening';
    } else if (['pdf', 'txt', 'other'].includes(detectedSourceType)) {
      detectedSkill = 'Reading';
    } else {
      detectedSkill = 'Reading'; // Default
    }

    // Create or find source using the meaningful name
    let source = await Source.findOne({ userId, sourceName: meaningfulSourceName });
    if (!source) {
      source = await Source.create({
        userId,
        sourceName: meaningfulSourceName, // Use generated title as sourceName
        sourceType: detectedSourceType,
        fileSize: fileSize || 0,
        totalWords: 0,
        newWords: 0,
        duplicateWords: 0,
        title: generatedTitle,
        description: generatedDescription,
        skill: detectedSkill, // Set skill immediately
        task: 'Vocabulary',
        cardQty: 0
        // level will be calculated later and set when available
      });
    } else {
      // Update existing source with new info if needed
      if (!source.title) {
        source.title = generatedTitle;
        source.description = generatedDescription;
      }
      if (!source.skill) {
        source.skill = detectedSkill;
      }
    }

    // Get the highest wordId to start from
    const maxWord = await Word.findOne().sort({ wordId: -1 });
    let currentWordId = maxWord ? maxWord.wordId + 1 : 1;

    const results = {
      total: words.length,
      added: 0,
      duplicates: 0,
      skipped: 0, // Track invalid words skipped
      errors: [],
      addedWords: [], // Track which words were actually added
      sourceId: source._id
    };

    const wordIdsToLink = []; // Track all word IDs to link to source (both new and duplicates)

    // Process each word
    for (let i = 0; i < words.length; i++) {
      const wordText = words[i].trim();
      
      // Skip empty strings and invalid words
      if (!wordText || !isValidWord(wordText)) {
        results.skipped++;
        continue;
      }

      try {
        // Check if word already exists (case-insensitive)
        const existingWord = await Word.findOne({ 
          englishWord: { $regex: new RegExp(`^${wordText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        });

        let wordId;
        let isNewWord = false;

        if (existingWord) {
          // Word exists - use existing word
          wordId = existingWord._id;
          results.duplicates++;
        } else {
          // Create new word
          const newWord = await Word.create({
            wordId: currentWordId++,
            englishWord: wordText,
            wordType: null,
            turkishMeaning: null,
            category1: null,
            category2: null,
            category3: null, // Don't store source name here anymore, use SourceWord relationship
            englishLevel: null,
            sampleSentenceEn: null,
            sampleSentenceTr: null
          });
          wordId = newWord._id;
          results.added++;
          results.addedWords.push(wordText);
          isNewWord = true;
        }

        // Link word to source (whether new or duplicate)
        wordIdsToLink.push({ wordId, isNew: isNewWord });
      } catch (error) {
        results.errors.push({
          word: wordText,
          error: error.message
        });
      }
    }

    // Create SourceWord relationships for all words (both new and duplicates)
    const sourceWordOperations = wordIdsToLink.map(({ wordId, isNew }) => ({
      sourceId: source._id,
      wordId: wordId,
      isNew: isNew
    }));

    // Use bulk write to insert all relationships efficiently
    if (sourceWordOperations.length > 0) {
      await SourceWord.bulkWrite(
        sourceWordOperations.map(op => ({
          updateOne: {
            filter: { sourceId: op.sourceId, wordId: op.wordId },
            update: op,
            upsert: true
          }
        }))
      );
    }

    // Update source statistics
    source.totalWords = wordIdsToLink.length;
    source.newWords = results.added;
    source.duplicateWords = results.duplicates;
    source.cardQty = wordIdsToLink.length; // Set card quantity to total words
    
    // Set skill based on source type
    if (detectedSourceType === 'srt') {
      source.skill = 'Listening';
    } else if (['pdf', 'txt', 'other'].includes(detectedSourceType)) {
      source.skill = 'Reading';
    } else {
      source.skill = 'Reading'; // Default
    }
    
    // Set task to Vocabulary (already set during creation, but ensure it's set)
    source.task = 'Vocabulary';
    
    // Ensure title and description are set (they should be set during creation, but update if missing)
    if (!source.title) {
      source.title = generatedTitle;
    }
    if (!source.description) {
      source.description = generatedDescription;
    }
    
    // Calculate level based on word distribution
    // Get all words linked to this source to check their levels
    const sourceWordIds = wordIdsToLink.map(item => item.wordId);
    const wordsWithLevels = await Word.find({
      _id: { $in: sourceWordIds },
      englishLevel: { $exists: true, $ne: null, $ne: '' }
    }).select('englishLevel').lean();
    
    // Count words by level
    const levelCounts = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
    wordsWithLevels.forEach(word => {
      if (word.englishLevel && levelCounts.hasOwnProperty(word.englishLevel)) {
        levelCounts[word.englishLevel]++;
      }
    });
    
    // Find the level with the most words
    let maxCount = 0;
    let majorityLevel = null;
    for (const [level, count] of Object.entries(levelCounts)) {
      if (count > maxCount) {
        maxCount = count;
        majorityLevel = level;
      }
    }
    
    // If we have words with levels, set the majority level
    if (majorityLevel && maxCount > 0) {
      source.level = majorityLevel;
    }
    
    await source.save();

    res.json({
      message: `Processed ${results.total} words: ${results.added} added, ${results.duplicates} duplicates skipped, ${results.skipped} invalid words skipped`,
      results,
      sourceInfo: {
        sourceId: source._id,
        sourceName: source.sourceName, // This is now the meaningful title
        title: source.title,
        description: source.description,
        level: source.level,
        skill: source.skill,
        task: source.task,
        cardQty: source.cardQty
      }
    });
  } catch (error) {
    console.error('Error adding words from AI:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to add words' 
    });
  }
};

// Get all sources for user
exports.getSources = async (req, res) => {
  try {
    const userId = req.user.userId;
    const sources = await Source.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      sources,
      count: sources.length
    });
  } catch (error) {
    console.error('Error getting sources:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to get sources' 
    });
  }
};

// Update a source
exports.updateSource = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { sourceId } = req.params;
    const { title, description, level, skill, task, cardQty } = req.body;

    // Verify source belongs to user
    const source = await Source.findOne({ _id: sourceId, userId });
    if (!source) {
      return res.status(404).json({ message: 'Source not found' });
    }

    // Update deck information fields
    if (title !== undefined) source.title = title;
    if (description !== undefined) source.description = description;
    if (level !== undefined) source.level = level;
    if (skill !== undefined) source.skill = skill;
    if (task !== undefined) source.task = task;
    if (cardQty !== undefined) source.cardQty = cardQty;

    await source.save();

    res.json({ 
      message: 'Source updated successfully',
      source: {
        _id: source._id,
        sourceName: source.sourceName,
        title: source.title,
        description: source.description,
        level: source.level,
        skill: source.skill,
        task: source.task,
        cardQty: source.cardQty
      }
    });
  } catch (error) {
    console.error('Error updating source:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to update source' 
    });
  }
};

// Delete a source
exports.deleteSource = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { sourceId } = req.params;

    // Verify source belongs to user
    const source = await Source.findOne({ _id: sourceId, userId });
    if (!source) {
      return res.status(404).json({ message: 'Source not found' });
    }

    // Delete all SourceWord entries for this source
    await SourceWord.deleteMany({ sourceId });

    // Delete the source
    await Source.findByIdAndDelete(sourceId);

    res.json({ 
      message: 'Source deleted successfully',
      deletedSourceId: sourceId
    });
  } catch (error) {
    console.error('Error deleting source:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to delete source' 
    });
  }
};

// Get words for a specific source
exports.getSourceWords = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { sourceId } = req.params;

    // Verify source belongs to user
    const source = await Source.findOne({ _id: sourceId, userId });
    if (!source) {
      return res.status(404).json({ message: 'Source not found' });
    }

    // Get all word IDs linked to this source
    const sourceWords = await SourceWord.find({ sourceId })
      .populate('wordId', 'englishWord wordType turkishMeaning category1 category2 category3 englishLevel sampleSentenceEn sampleSentenceTr imageUrl wordId')
      .lean();

    // Get user's word statuses
    const wordIds = sourceWords.map(sw => sw.wordId._id);
    const userWords = await UserWord.find({
      userId,
      wordId: { $in: wordIds }
    }).lean();

    const userWordMap = {};
    userWords.forEach(uw => {
      userWordMap[uw.wordId.toString()] = uw.isKnown;
    });

    // Combine source words with user status
    const wordsWithStatus = sourceWords.map(sw => ({
      ...sw.wordId,
      isKnown: userWordMap[sw.wordId._id.toString()] || null,
      isNew: sw.isNew,
      linkedAt: sw.createdAt
    }));

    res.json({
      source: source,
      words: wordsWithStatus,
      count: wordsWithStatus.length
    });
  } catch (error) {
    console.error('Error getting source words:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to get source words' 
    });
  }
};

// Test source title and description generation
exports.testSourceTitle = async (req, res) => {
  console.log('testSourceTitle called');
  try {
    const { sourceName, sourceType, contentPreview, url, pageTitle } = req.body;
    const userId = req.user.userId;

    if (!sourceName) {
      return res.status(400).json({ message: 'Source name is required' });
    }

    // Determine source type from file extension if not provided
    let detectedSourceType = sourceType || 'other';
    if (!sourceType && sourceName) {
      const ext = sourceName.toLowerCase().split('.').pop();
      if (ext === 'pdf') detectedSourceType = 'pdf';
      else if (ext === 'srt') detectedSourceType = 'srt';
      else if (ext === 'txt') detectedSourceType = 'txt';
      else if (ext === 'youtube') detectedSourceType = 'youtube';
      else detectedSourceType = 'other';
    }

    // Generate title and description using AI
    const { generateSourceInfo } = require('../services/aiDeckService');
    const sourceInfo = await generateSourceInfo(sourceName, detectedSourceType, contentPreview || '', url || '', pageTitle || '');

    res.json({
      success: true,
      sourceInfo: {
        title: sourceInfo.title,
        description: sourceInfo.description,
        sourceType: detectedSourceType
      }
    });
  } catch (error) {
    console.error('Error testing source title:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to generate source title',
      error: error.message
    });
  }
};

// Get unique filter values
exports.getFilterValues = async (req, res) => {
  try {
    const [levels, types, categories1, categories2, categories3] = await Promise.all([
      Word.distinct('englishLevel', { englishLevel: { $exists: true, $ne: null, $ne: '' } }),
      Word.distinct('wordType', { wordType: { $exists: true, $ne: null, $ne: '' } }),
      Word.distinct('category1', { category1: { $exists: true, $ne: null, $ne: '' } }),
      Word.distinct('category2', { category2: { $exists: true, $ne: null, $ne: '' } }),
      Word.distinct('category3', { category3: { $exists: true, $ne: null, $ne: '' } })
    ]);

    // Filter out empty strings and null values, then sort
    const filterEmpty = (arr) => arr.filter(val => val != null && String(val).trim() !== '').sort();

    res.json({
      levels: filterEmpty(levels),
      types: filterEmpty(types),
      categories1: filterEmpty(categories1),
      categories2: filterEmpty(categories2),
      categories3: filterEmpty(categories3)
    });
  } catch (error) {
    console.error('Error getting filter values:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to get filter values' 
    });
  }
};

// Get words without Turkish meaning
exports.getWordsWithoutTurkish = async (req, res) => {
  try {
    // Find words that don't have Turkish meaning (null or empty)
    // Remove limit to get all words - frontend will handle batching
    const words = await Word.find({
      $or: [
        { turkishMeaning: { $exists: false } },
        { turkishMeaning: null },
        { turkishMeaning: '' }
      ]
    })
    .select('englishWord wordType turkishMeaning category1 category2 category3 englishLevel sampleSentenceEn sampleSentenceTr')
    .lean();

    res.json({
      words,
      count: words.length
    });
  } catch (error) {
    console.error('Error getting words without Turkish:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to get words without Turkish meaning' 
    });
  }
};

// Fill word columns using AI
exports.fillWordColumns = async (req, res) => {
  console.log('fillWordColumns called');
  try {
    let words;
    
    // If words are provided in request, use them; otherwise get from database
    if (req.body.words && Array.isArray(req.body.words) && req.body.words.length > 0) {
      words = req.body.words;
    } else {
      // Get words without Turkish meaning from database
      const wordsWithoutTurkish = await Word.find({
        $or: [
          { turkishMeaning: { $exists: false } },
          { turkishMeaning: null },
          { turkishMeaning: '' }
        ]
      })
      .select('englishWord')
      .limit(100) // Limit to prevent too many words at once
      .lean();

      if (wordsWithoutTurkish.length === 0) {
        return res.status(400).json({ message: 'No words found without Turkish meaning. All words are already filled.' });
      }

      // Extract word strings
      words = wordsWithoutTurkish.map(w => w.englishWord);
    }

    // Filter out invalid words before processing
    const validWords = words.filter(word => {
      const trimmed = word.trim();
      return trimmed && isValidWord(trimmed);
    });

    if (validWords.length === 0) {
      return res.status(400).json({ message: 'No valid words found. All words were filtered out as invalid (symbols, empty strings, etc.).' });
    }

    // Get 5-10 example words from database with filled columns
    // Filter out invalid words from examples too
    const allExampleWords = await Word.find({
      $and: [
        { wordType: { $exists: true, $ne: null, $ne: '' } },
        { turkishMeaning: { $exists: true, $ne: null, $ne: '' } },
        { englishLevel: { $exists: true, $ne: null, $ne: '' } }
      ]
    })
    .limit(20) // Get more to filter
    .select('englishWord wordType turkishMeaning category1 category2 category3 englishLevel sampleSentenceEn sampleSentenceTr')
    .lean();

    // Filter example words to only include valid ones
    const exampleWords = allExampleWords
      .filter(word => isValidWord(word.englishWord))
      .slice(0, 10); // Take up to 10 valid examples

    if (exampleWords.length === 0) {
      return res.status(400).json({ message: 'No valid example words found in database. Please add some valid words with filled columns first.' });
    }

    // Call AI to fill columns with only valid words
    const result = await fillWordColumnsWithAI(validWords, exampleWords);
    
    // Parse AI response (should be JSON array)
    let wordDataArray;
    try {
      // Try to extract JSON from response (might have markdown code blocks)
      let jsonString = result.response.trim();
      
      // Remove markdown code blocks if present
      jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      // Remove any leading text before the first [
      const firstBracket = jsonString.indexOf('[');
      if (firstBracket > 0) {
        jsonString = jsonString.substring(firstBracket);
      }
      
      // Find JSON array - try to find complete array
      const jsonMatch = jsonString.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          wordDataArray = JSON.parse(jsonMatch[0]);
        } catch (e) {
          // If parsing fails, try to fix incomplete JSON
          let fixedJson = jsonMatch[0];
          // If it doesn't end with ], try to close it
          if (!fixedJson.trim().endsWith(']')) {
            // Count open brackets and close them
            const openBrackets = (fixedJson.match(/\[/g) || []).length;
            const closeBrackets = (fixedJson.match(/\]/g) || []).length;
            const missingCloses = openBrackets - closeBrackets;
            if (missingCloses > 0) {
              // Try to find the last complete object and close the array
              const lastCompleteObject = fixedJson.lastIndexOf('}');
              if (lastCompleteObject > 0) {
                fixedJson = fixedJson.substring(0, lastCompleteObject + 1) + ']';
              }
            }
          }
          wordDataArray = JSON.parse(fixedJson);
        }
      } else {
        wordDataArray = JSON.parse(jsonString);
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('AI response length:', result.response.length);
      console.error('AI response first 1000 chars:', result.response.substring(0, 1000));
      console.error('AI response last 1000 chars:', result.response.substring(Math.max(0, result.response.length - 1000)));
      
      // Try to extract partial data if possible
      try {
        // Try to find complete JSON objects by matching braces
        let partialJson = jsonString;
        let braceCount = 0;
        let startPos = partialJson.indexOf('[');
        if (startPos === -1) startPos = 0;
        
        // Find the last complete object (accounting for strings)
        let lastCompletePos = startPos;
        let inString = false;
        let escapeNext = false;
        for (let i = startPos; i < partialJson.length; i++) {
          const char = partialJson[i];
          
          if (escapeNext) {
            escapeNext = false;
            continue;
          }
          
          if (char === '\\') {
            escapeNext = true;
            continue;
          }
          
          if (char === '"') {
            inString = !inString;
            continue;
          }
          
          if (!inString) {
            if (char === '{') braceCount++;
            if (char === '}') {
              braceCount--;
              if (braceCount === 0) {
                lastCompletePos = i;
              }
            }
          }
        }
        
        // If we found complete objects, try to extract them
        if (lastCompletePos > startPos) {
          let extractedJson = partialJson.substring(startPos, lastCompletePos + 1);
          // Try to close the array if needed
          if (!extractedJson.trim().endsWith(']')) {
            extractedJson += ']';
          }
          
          try {
            wordDataArray = JSON.parse(extractedJson);
            console.log(`Successfully parsed ${wordDataArray.length} objects from partial response`);
          } catch (e) {
            // If that fails, try to extract individual objects
            const objects = [];
            let currentObj = '';
            braceCount = 0;
            let inString = false;
            let escapeNext = false;
            
            for (let i = startPos; i < partialJson.length; i++) {
              const char = partialJson[i];
              
              if (escapeNext) {
                currentObj += char;
                escapeNext = false;
                continue;
              }
              
              if (char === '\\') {
                escapeNext = true;
                currentObj += char;
                continue;
              }
              
              if (char === '"' && !escapeNext) {
                inString = !inString;
              }
              
              if (!inString) {
                if (char === '{') {
                  if (braceCount === 0) currentObj = '';
                  braceCount++;
                }
                if (char === '}') {
                  braceCount--;
                }
              }
              
              currentObj += char;
              
              if (braceCount === 0 && currentObj.trim().startsWith('{')) {
                try {
                  const obj = JSON.parse(currentObj.trim());
                  if (obj.englishWord) {
                    objects.push(obj);
                  }
                } catch (e) {
                  // Skip invalid objects
                }
                currentObj = '';
              }
            }
            
            if (objects.length > 0) {
              wordDataArray = objects;
              console.log(`Successfully extracted ${wordDataArray.length} objects from response`);
            } else {
              throw parseError;
            }
          }
        } else {
          throw parseError;
        }
      } catch (recoveryError) {
        return res.status(500).json({ 
          message: 'Failed to parse AI response as JSON',
          error: parseError.message,
          responsePreview: result.response.substring(0, 1000),
          responseLength: result.response.length,
          suggestion: 'The AI response may be too large or incomplete. Try processing fewer words at once.'
        });
      }
    }

    if (!Array.isArray(wordDataArray)) {
      return res.status(500).json({ message: 'AI response is not a valid array' });
    }

    const results = {
      total: words.length,
      validWords: validWords.length,
      skipped: words.length - validWords.length,
      processed: 0,
      updated: 0,
      errors: []
    };

    // Update words in database
    for (let i = 0; i < wordDataArray.length; i++) {
      const wordData = wordDataArray[i];
      
      if (!wordData.englishWord) {
        results.errors.push({
          index: i,
          error: 'Missing englishWord field'
        });
        continue;
      }

      try {
        // Find word by englishWord (case-insensitive)
        const word = await Word.findOne({ 
          englishWord: { $regex: new RegExp(`^${wordData.englishWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        });

        if (!word) {
          results.errors.push({
            word: wordData.englishWord,
            error: 'Word not found in database'
          });
          continue;
        }

        // Update word with AI-filled data
        if (wordData.wordType) word.wordType = wordData.wordType;
        if (wordData.turkishMeaning) word.turkishMeaning = wordData.turkishMeaning;
        // Always set category1 and category2 to null (never fill these fields)
        word.category1 = null;
        word.category2 = null;
        // category3 can be filled optionally
        if (wordData.category3) word.category3 = wordData.category3;
        if (wordData.englishLevel) word.englishLevel = wordData.englishLevel;
        if (wordData.sampleSentenceEn) word.sampleSentenceEn = wordData.sampleSentenceEn;
        if (wordData.sampleSentenceTr) word.sampleSentenceTr = wordData.sampleSentenceTr;

        await word.save();
        results.processed++;
        results.updated++;
        
        // Track which sources this word belongs to for level recalculation
        if (!results.updatedSourceIds) {
          results.updatedSourceIds = new Set();
        }
        // Find all sources this word belongs to
        const wordSources = await SourceWord.find({ wordId: word._id }).select('sourceId').lean();
        wordSources.forEach(sw => {
          results.updatedSourceIds.add(sw.sourceId.toString());
        });
      } catch (error) {
        results.errors.push({
          word: wordData.englishWord,
          error: error.message
        });
      }
    }

    // Recalculate source levels for all affected sources
    if (results.updatedSourceIds && results.updatedSourceIds.size > 0) {
      const sourceIds = Array.from(results.updatedSourceIds);
      for (const sourceId of sourceIds) {
        try {
          await recalculateSourceLevel(sourceId);
        } catch (error) {
          console.error(`Error recalculating level for source ${sourceId}:`, error);
        }
      }
    }

    res.json({
      message: `Processed ${results.processed} words: ${results.updated} updated`,
      results,
      prompt: result.prompt,
      response: result.response
    });
  } catch (error) {
    console.error('Error filling word columns:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to fill word columns' 
    });
  }
};

// Multer middleware for file upload
exports.uploadFile = upload.single('file');

// Update word
exports.updateWord = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      englishWord,
      turkishMeaning,
      wordType,
      englishLevel,
      category1,
      category2,
      category3,
      sampleSentenceEn,
      sampleSentenceTr,
      imageUrl
    } = req.body;

    const word = await Word.findById(id);
    if (!word) {
      return res.status(404).json({ message: 'Word not found' });
    }

    // Update fields if provided
    if (englishWord !== undefined) word.englishWord = englishWord;
    if (turkishMeaning !== undefined) word.turkishMeaning = turkishMeaning;
    if (wordType !== undefined) word.wordType = wordType;
    if (englishLevel !== undefined) word.englishLevel = englishLevel;
    if (category1 !== undefined) word.category1 = category1;
    if (category2 !== undefined) word.category2 = category2;
    if (category3 !== undefined) word.category3 = category3;
    if (sampleSentenceEn !== undefined) word.sampleSentenceEn = sampleSentenceEn;
    if (sampleSentenceTr !== undefined) word.sampleSentenceTr = sampleSentenceTr;
    if (imageUrl !== undefined) word.imageUrl = imageUrl;

    await word.save();
    res.json(word);
  } catch (error) {
    console.error('Error updating word:', error);
    res.status(500).json({ message: error.message || 'Failed to update word' });
  }
};

// Delete a word
exports.deleteWord = async (req, res) => {
  try {
    const { id } = req.params;

    const word = await Word.findById(id);
    if (!word) {
      return res.status(404).json({ message: 'Word not found' });
    }

    // Also delete associated UserWord records
    await UserWord.deleteMany({ wordId: id });

    // Delete the word
    await Word.findByIdAndDelete(id);

    res.json({ message: 'Word deleted successfully' });
  } catch (error) {
    console.error('Error deleting word:', error);
    res.status(500).json({ message: error.message || 'Failed to delete word' });
  }
};

// Generate image for a word
exports.generateWordImage = async (req, res) => {
  try {
    const { wordId } = req.params;
    const { customKeywords, service = 'google' } = req.body; // Default to 'google' if not specified
    
    if (!wordId) {
      return res.status(400).json({ message: 'Word ID is required' });
    }

    // Validate service parameter
    if (service !== 'google' && service !== 'unsplash') {
      return res.status(400).json({ message: 'Service must be either "google" or "unsplash"' });
    }

    const word = await Word.findById(wordId);
    if (!word) {
      return res.status(404).json({ message: 'Word not found' });
    }

    // Use wordId (sequential ID) for key selection if using Unsplash
    // This distributes words across multiple API keys
    const wordIndex = word.wordId ? word.wordId - 1 : null; // wordId is 1-based, convert to 0-based

    // Generate image using the word's information
    // If custom keywords are provided, use them; otherwise use automatic extraction
    const result = await generateWordImage(
      word.englishWord,
      word.wordType,
      word.sampleSentenceEn,
      customKeywords,
      service,
      wordIndex
    );

    // Log the search query
    console.log(`Image search for word "${word.englishWord}": "${result.searchQuery}"`);

    // Update the word with the image URL
    word.imageUrl = result.imageUrl;
    await word.save();

    res.json({
      imageUrl: result.imageUrl,
      searchQuery: result.searchQuery
    });
  } catch (error) {
    console.error('Error generating word image:', error);
    res.status(500).json({
      message: error.message || 'Failed to generate image for word',
      searchQuery: error.searchQuery || null
    });
  }
};

