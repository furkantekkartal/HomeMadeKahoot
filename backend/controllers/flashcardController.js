const FlashcardDeck = require('../models/FlashcardDeck');
const Word = require('../models/Word');
const UserWord = require('../models/UserWord');

// Get all decks for user
exports.getMyDecks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const decks = await FlashcardDeck.find({ userId })
      .sort({ updatedAt: -1 })
      .populate('wordIds', 'englishWord turkishMeaning wordType englishLevel category1 sampleSentenceEn sampleSentenceTr imageUrl');
    
    // Calculate mastered cards for each deck
    const decksWithStats = await Promise.all(decks.map(async (deck) => {
      const wordIds = deck.wordIds.map(w => w._id);
      const knownWords = await UserWord.countDocuments({
        userId,
        wordId: { $in: wordIds },
        isKnown: true
      });
      
      return {
        ...deck.toObject(),
        masteredCards: knownWords,
        totalCards: deck.wordIds.length
      };
    }));
    
    res.json(decksWithStats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single deck
exports.getDeck = async (req, res) => {
  try {
    const userId = req.user.userId;
    const deck = await FlashcardDeck.findOne({
      _id: req.params.id,
      userId
    }).populate('wordIds', 'englishWord turkishMeaning wordType englishLevel category1 sampleSentenceEn sampleSentenceTr imageUrl');
    
    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }
    
    // Get user's word statuses
    const wordIds = deck.wordIds.map(w => w._id);
    const userWords = await UserWord.find({
      userId,
      wordId: { $in: wordIds }
    });
    
    const userWordMap = {};
    userWords.forEach(uw => {
      userWordMap[uw.wordId.toString()] = uw.isKnown;
    });
    
    // Add status to each word
    const wordsWithStatus = deck.wordIds.map(word => ({
      ...word.toObject(),
      isKnown: userWordMap[word._id.toString()] || null
    }));
    
    res.json({
      ...deck.toObject(),
      words: wordsWithStatus
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new deck
exports.createDeck = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, wordIds } = req.body;
    
    if (!name || !wordIds || !Array.isArray(wordIds) || wordIds.length === 0) {
      return res.status(400).json({ message: 'Deck name and word IDs are required' });
    }
    
    // Verify all words exist
    const words = await Word.find({ _id: { $in: wordIds } });
    if (words.length !== wordIds.length) {
      return res.status(400).json({ message: 'Some words not found' });
    }
    
    const deck = await FlashcardDeck.create({
      userId,
      name,
      wordIds,
      totalCards: wordIds.length
    });
    
    res.status(201).json(deck);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update deck
exports.updateDeck = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, wordIds } = req.body;
    
    const deck = await FlashcardDeck.findOne({
      _id: req.params.id,
      userId
    });
    
    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }
    
    if (name) deck.name = name;
    if (wordIds && Array.isArray(wordIds)) {
      // Verify all words exist
      const words = await Word.find({ _id: { $in: wordIds } });
      if (words.length !== wordIds.length) {
        return res.status(400).json({ message: 'Some words not found' });
      }
      deck.wordIds = wordIds;
      deck.totalCards = wordIds.length;
    }
    
    await deck.save();
    res.json(deck);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete deck
exports.deleteDeck = async (req, res) => {
  try {
    const userId = req.user.userId;
    const deck = await FlashcardDeck.findOneAndDelete({
      _id: req.params.id,
      userId
    });
    
    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }
    
    res.json({ message: 'Deck deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update last studied timestamp
exports.updateLastStudied = async (req, res) => {
  try {
    const userId = req.user.userId;
    const deck = await FlashcardDeck.findOne({
      _id: req.params.id,
      userId
    });
    
    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }
    
    deck.lastStudied = new Date();
    await deck.save();
    
    res.json({ message: 'Last studied updated', lastStudied: deck.lastStudied });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

