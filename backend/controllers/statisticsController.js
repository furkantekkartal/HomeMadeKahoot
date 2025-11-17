const Word = require('../models/Word');
const UserWord = require('../models/UserWord');
const StudySession = require('../models/StudySession');

/**
 * Get overview statistics - Optimized version
 */
exports.getOverview = async (req, res) => {
  try {
    const userId = req.user.userId;
    const mongoose = require('mongoose');
    const userIdObj = new mongoose.Types.ObjectId(userId);

    // Run all queries in parallel for better performance
    const [
      totalWords,
      userWordCounts,
      sessions,
      categoryStats,
      levelStats
    ] = await Promise.all([
      // Total words count
      Word.countDocuments(),
      
      // User word counts using aggregation (much faster)
      UserWord.aggregate([
        { $match: { userId: userIdObj } },
        {
          $group: {
            _id: '$isKnown',
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Study sessions with aggregation for module stats
      // Use durationSeconds for precision, then convert to minutes
      StudySession.aggregate([
        { $match: { userId: userIdObj, isActive: false } },
        {
          $group: {
            _id: '$module',
            totalSeconds: { 
              $sum: { 
                $ifNull: [
                  '$durationSeconds',
                  { $multiply: ['$durationMinutes', 60] }
                ]
              }
            }
          }
        }
      ]),
      
      // Category stats using aggregation (much faster than loading all words)
      Word.aggregate([
        { $match: { category1: { $exists: true, $ne: null } } },
        {
          $lookup: {
            from: 'userwords',
            let: { wordId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$wordId', '$$wordId'] },
                      { $eq: ['$userId', userIdObj] }
                    ]
                  }
                }
              },
              { $limit: 1 }
            ],
            as: 'userWord'
          }
        },
        {
          $group: {
            _id: '$category1',
            total: { $sum: 1 },
            known: {
              $sum: {
                $cond: [
                  { $eq: [{ $arrayElemAt: ['$userWord.isKnown', 0] }, true] },
                  1,
                  0
                ]
              }
            },
            unknown: {
              $sum: {
                $cond: [
                  { $eq: [{ $arrayElemAt: ['$userWord.isKnown', 0] }, false] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),
      
      // Level stats using aggregation
      Word.aggregate([
        { $match: { englishLevel: { $exists: true, $ne: null } } },
        {
          $lookup: {
            from: 'userwords',
            let: { wordId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$wordId', '$$wordId'] },
                      { $eq: ['$userId', userIdObj] }
                    ]
                  }
                }
              },
              { $limit: 1 }
            ],
            as: 'userWord'
          }
        },
        {
          $group: {
            _id: '$englishLevel',
            total: { $sum: 1 },
            known: {
              $sum: {
                $cond: [
                  { $eq: [{ $arrayElemAt: ['$userWord.isKnown', 0] }, true] },
                  1,
                  0
                ]
              }
            },
            unknown: {
              $sum: {
                $cond: [
                  { $eq: [{ $arrayElemAt: ['$userWord.isKnown', 0] }, false] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ])
    ]);

    // Process user word counts
    let knownWords = 0;
    let unknownWords = 0;
    userWordCounts.forEach(item => {
      if (item._id === true) knownWords = item.count;
      else if (item._id === false) unknownWords = item.count;
    });

    // Process study time - convert from seconds to minutes (matching Performance page calculation)
    const totalStudySeconds = sessions.reduce((sum, session) => {
      return sum + (session.totalSeconds || 0);
    }, 0);
    const totalStudyMinutes = Math.floor(totalStudySeconds / 60);

    // Process module stats - convert from seconds to minutes
    const moduleStats = {};
    sessions.forEach(session => {
      if (session._id) {
        // Use Math.floor to match Performance page calculation
        moduleStats[session._id] = Math.floor((session.totalSeconds || 0) / 60);
      }
    });

    // Process category stats
    const categoryStatsObj = {};
    categoryStats.forEach(stat => {
      if (stat._id) {
        categoryStatsObj[stat._id] = {
          total: stat.total || 0,
          known: stat.known || 0,
          unknown: stat.unknown || 0
        };
      }
    });

    // Process level stats
    const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const levelStatsObj = {};
    
    // Initialize all levels
    levelOrder.forEach(level => {
      levelStatsObj[level] = { total: 0, known: 0, unknown: 0 };
    });

    // Fill in actual stats
    levelStats.forEach(stat => {
      if (stat._id && levelStatsObj[stat._id]) {
        levelStatsObj[stat._id] = {
          total: stat.total || 0,
          known: stat.known || 0,
          unknown: stat.unknown || 0
        };
      }
    });

    res.json({
      success: true,
      data: {
        wordStats: {
          total: totalWords,
          known: knownWords,
          learning: 0,
          unknown: unknownWords
        },
        totalStudyMinutes,
        totalStudyHours: Math.round(totalStudyMinutes / 60 * 10) / 10,
        studyTimeByModule: moduleStats,
        categories: categoryStatsObj,
        levels: levelStatsObj
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
 * Get badges (simplified - can be enhanced later) - Optimized version
 */
exports.getBadges = async (req, res) => {
  try {
    const userId = req.user.userId;
    const mongoose = require('mongoose');
    const userIdObj = new mongoose.Types.ObjectId(userId);

    // Use aggregation for faster queries
    const [knownWordsResult, studyTimeResult] = await Promise.all([
      // Count known words only
      UserWord.countDocuments({ userId: userIdObj, isKnown: true }),
      
      // Sum study time using aggregation - use durationSeconds for precision
      StudySession.aggregate([
        { $match: { userId: userIdObj, isActive: false } },
        {
          $group: {
            _id: null,
            totalSeconds: { 
              $sum: { 
                $ifNull: [
                  '$durationSeconds',
                  { $multiply: ['$durationMinutes', 60] }
                ]
              }
            }
          }
        }
      ])
    ]);

    const knownWords = knownWordsResult || 0;
    const totalStudySeconds = studyTimeResult[0]?.totalSeconds || 0;
    const totalStudyMinutes = Math.floor(totalStudySeconds / 60);
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

