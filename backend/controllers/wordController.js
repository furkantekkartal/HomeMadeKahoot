const mongoose = require('mongoose');
const Word = require('../models/Word');
const UserWord = require('../models/UserWord');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const os = require('os');
const { Readable } = require('stream');
const { generateWordImage } = require('../services/imageService');

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
      userWordMap[uw.wordId.toString()] = uw.isKnown;
    });

    // Filter based on known/unknown preference
    let filteredWords = words.map(word => ({
      ...word.toObject(),
      isKnown: userWordMap[word._id.toString()] || null // null means not tracked yet
    }));

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

    // Update or create user word record
    const userWord = await UserWord.findOneAndUpdate(
      { userId, wordId },
      { isKnown: isKnown !== undefined ? isKnown : true },
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

// Multer middleware for file upload
exports.uploadFile = upload.single('file');

// Generate image for a word
exports.generateWordImage = async (req, res) => {
  try {
    const { wordId } = req.params;
    
    if (!wordId) {
      return res.status(400).json({ message: 'Word ID is required' });
    }

    const word = await Word.findById(wordId);
    if (!word) {
      return res.status(404).json({ message: 'Word not found' });
    }

    // Generate image using the word's information
    const result = await generateWordImage(
      word.englishWord,
      word.wordType,
      word.sampleSentenceEn
    );

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

