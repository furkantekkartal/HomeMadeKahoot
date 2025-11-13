const Word = require('../models/Word');
const UserWord = require('../models/UserWord');
const StudySession = require('../models/StudySession');

/**
 * Get overview statistics
 */
exports.getOverview = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get word statistics
    const totalWords = await Word.countDocuments();
    const userWords = await UserWord.find({ userId });
    const knownWords = userWords.filter(uw => uw.isKnown === true).length;
    const unknownWords = userWords.filter(uw => uw.isKnown === false).length;
    const learningWords = 0; // Can be tracked separately if needed

    // Get study time statistics
    const sessions = await StudySession.find({ userId, isActive: false });
    const totalStudyMinutes = sessions.reduce((sum, session) => {
      return sum + (session.durationMinutes || 0);
    }, 0);

    // Calculate study time by module
    const moduleStats = {};
    sessions.forEach(session => {
      const module = session.module;
      if (!moduleStats[module]) {
        moduleStats[module] = 0;
      }
      moduleStats[module] += session.durationMinutes || 0;
    });

    // Get category breakdown
    const categoryStats = {};
    const wordsWithCategories = await Word.find({ category1: { $exists: true, $ne: null } });
    const userWordMap = {};
    userWords.forEach(uw => {
      userWordMap[uw.wordId.toString()] = uw.isKnown;
    });

    wordsWithCategories.forEach(word => {
      const category = word.category1 || 'Uncategorized';
      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, known: 0, unknown: 0 };
      }
      categoryStats[category].total++;
      const isKnown = userWordMap[word._id.toString()];
      if (isKnown === true) {
        categoryStats[category].known++;
      } else if (isKnown === false) {
        categoryStats[category].unknown++;
      }
    });

    // Get level breakdown
    const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const levelStats = {};
    
    // Initialize all levels
    levelOrder.forEach(level => {
      levelStats[level] = { total: 0, known: 0, unknown: 0 };
    });

    const wordsWithLevels = await Word.find({ englishLevel: { $exists: true, $ne: null } });
    wordsWithLevels.forEach(word => {
      const level = word.englishLevel || 'A1';
      if (levelStats[level]) {
        levelStats[level].total++;
        const isKnown = userWordMap[word._id.toString()];
        if (isKnown === true) {
          levelStats[level].known++;
        } else if (isKnown === false) {
          levelStats[level].unknown++;
        }
      }
    });

    res.json({
      success: true,
      data: {
        wordStats: {
          total: totalWords,
          known: knownWords,
          learning: learningWords,
          unknown: unknownWords
        },
        totalStudyMinutes,
        totalStudyHours: Math.round(totalStudyMinutes / 60 * 10) / 10,
        studyTimeByModule: moduleStats,
        categories: categoryStats,
        levels: levelStats
      }
    });
  } catch (error) {
    console.error('Error getting overview statistics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get badges (simplified - can be enhanced later)
 */
exports.getBadges = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user statistics
    const userWords = await UserWord.find({ userId });
    const knownWords = userWords.filter(uw => uw.isKnown === true).length;
    const sessions = await StudySession.find({ userId, isActive: false });
    const totalStudyMinutes = sessions.reduce((sum, session) => {
      return sum + (session.durationMinutes || 0);
    }, 0);
    const totalStudyHours = Math.round(totalStudyMinutes / 60 * 10) / 10;

    // Calculate badges
    const wordBadges = Math.floor(knownWords / 1000);
    const studyBadges = Math.floor(totalStudyHours / 5);

    res.json({
      success: true,
      data: {
        earnedBadges: [],
        newBadges: [],
        nextBadges: [],
        wordBadges,
        studyBadges
      }
    });
  } catch (error) {
    console.error('Error getting badges:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

