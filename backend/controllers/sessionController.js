const Session = require('../models/Session');
const Quiz = require('../models/Quiz');
const Result = require('../models/Result');
const StudentResult = require('../models/StudentResult');
const StudySession = require('../models/StudySession');
const FlashcardDeck = require('../models/FlashcardDeck');
const mongoose = require('mongoose');

// Generate random PIN
const generatePIN = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

// Create session
exports.createSession = async (req, res) => {
  try {
    const { quizId } = req.body;

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    let pin = generatePIN();
    // Ensure unique PIN
    while (await Session.findOne({ pin, status: { $in: ['waiting', 'active'] } })) {
      pin = generatePIN();
    }

    const session = await Session.create({
      quizId,
      hostId: req.user.userId,
      pin
    });

    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get session by PIN
exports.getSessionByPIN = async (req, res) => {
  try {
    const session = await Session.findOne({ 
      pin: req.params.pin,
      status: { $in: ['waiting', 'active'] }
    }).populate('quizId').populate('hostId', 'username');

    if (!session) {
      return res.status(404).json({ message: 'Session not found or expired' });
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get session by ID
exports.getSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('quizId')
      .populate('hostId', 'username');

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user's sessions
exports.getMySessions = async (req, res) => {
  try {
    const sessions = await Session.find({ hostId: req.user.userId })
      .populate('quizId')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Save result
exports.saveResult = async (req, res) => {
  try {
    const { sessionId, quizId, score, totalQuestions, correctAnswers, answers, mode } = req.body;

    const result = await Result.create({
      sessionId,
      userId: req.user.userId,
      quizId,
      score,
      totalQuestions,
      correctAnswers,
      answers,
      mode
    });

    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user results
exports.getMyResults = async (req, res) => {
  try {
    const results = await Result.find({ userId: req.user.userId })
      .populate('quizId', 'title level skill task category difficulty')
      .sort({ completedAt: -1 })
      .limit(50);
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all students performance (aggregated by student)
exports.getMyPerformance = async (req, res) => {
  try {
    const { studentName, quizName, level, skill, task, dateFrom, dateTo } = req.query;
    
    // Build query for StudentResult (all students, not filtered by user)
    const studentResultQuery = {};

    // Apply filters to StudentResult query
    if (studentName && studentName.trim() !== '') {
      studentResultQuery.username = { $regex: studentName.trim(), $options: 'i' };
    }
    // Handle quiz name filter - also search deck names
    let matchingDeckIds = [];
    if (quizName && quizName.trim() !== '') {
      // Search for matching quizzes
      const matchingQuizzes = await Quiz.find({
        title: { $regex: quizName.trim(), $options: 'i' }
      }).select('_id');
      
      // Search for matching deck names
      const matchingDecks = await FlashcardDeck.find({
        name: { $regex: quizName.trim(), $options: 'i' }
      }).select('_id');
      
      matchingDeckIds = matchingDecks.map(d => d._id);
      
      // If we have quiz matches, filter by quiz name
      if (matchingQuizzes.length > 0 || matchingDeckIds.length > 0) {
        // For StudentResult, we can filter by quizName regex
        // Note: StudentResult doesn't have deckId, so deck filtering would need to be done after fetch
        studentResultQuery.quizName = { $regex: quizName.trim(), $options: 'i' };
      }
    }
    if (level && level.trim() !== '') {
      studentResultQuery.level = level.trim();
    }
    if (skill && skill.trim() !== '') {
      studentResultQuery.skill = skill.trim();
    }
    if (task && task.trim() !== '') {
      studentResultQuery.task = task.trim();
    }
    if (dateFrom || dateTo) {
      studentResultQuery.completedAt = {};
      if (dateFrom && dateFrom.trim() !== '') {
        studentResultQuery.completedAt.$gte = new Date(dateFrom);
      }
      if (dateTo && dateTo.trim() !== '') {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        studentResultQuery.completedAt.$lte = toDate;
      }
    }

    // Get all student results (not filtered by user)
    let studentResults = await StudentResult.find(studentResultQuery)
      .populate('quizId', 'title level skill task category difficulty')
      .populate('userId', 'username')
      .sort({ completedAt: -1 });

    // Also get all logged-in user results from Result collection
    const resultQuery = {};
    if (dateFrom || dateTo) {
      resultQuery.completedAt = {};
      if (dateFrom && dateFrom.trim() !== '') {
        resultQuery.completedAt.$gte = new Date(dateFrom);
      }
      if (dateTo && dateTo.trim() !== '') {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        resultQuery.completedAt.$lte = toDate;
      }
    }

    const loggedInResults = await Result.find(resultQuery)
      .populate('quizId', 'title level skill task category difficulty')
      .populate('userId', 'username')
      .sort({ completedAt: -1 });

    // Get User model to map userIds to usernames
    const User = require('../models/User');
    const userIdToUsername = new Map();
    const allUserIds = new Set();
    
    // Collect all user IDs
    studentResults.forEach(result => {
      if (result.userId) {
        const userId = result.userId._id ? result.userId._id.toString() : result.userId.toString();
        if (userId) allUserIds.add(userId);
      }
    });
    loggedInResults.forEach(result => {
      if (result.userId) {
        const userId = result.userId._id ? result.userId._id.toString() : result.userId.toString();
        if (userId) allUserIds.add(userId);
      }
    });

    // Fetch all users to get usernames
    if (allUserIds.size > 0) {
      const userIdArray = Array.from(allUserIds).map(id => {
        return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
      });
      const users = await User.find({ _id: { $in: userIdArray } });
      users.forEach(user => {
        userIdToUsername.set(user._id.toString(), user.username);
      });
    }

    // Combine and normalize results
    const allResults = [];
    
    // Add StudentResult entries
    studentResults.forEach(result => {
      const quiz = result.quizId || {};
      let username = result.username || 'Unknown';
      if (!username && result.userId) {
        const userId = result.userId._id ? result.userId._id.toString() : result.userId.toString();
        username = userIdToUsername.get(userId) || 'Unknown';
      }
      
      allResults.push({
        studentName: username,
        quizId: result.quizId ? (result.quizId._id ? result.quizId._id.toString() : result.quizId.toString()) : null,
        quizName: result.quizName || quiz.title || 'Unknown Quiz',
        level: result.level || quiz.level || (result.difficulty === 'beginner' ? 'A1' : result.difficulty === 'intermediate' ? 'B1' : result.difficulty === 'advanced' ? 'C1' : null),
        skill: result.skill || quiz.skill || (result.category === 'reading' ? 'Reading' : result.category === 'listening' ? 'Listening' : null),
        task: result.task || quiz.task || (result.category === 'vocabulary' ? 'Vocabulary' : result.category === 'grammar' ? 'Grammar' : null),
        questionCount: result.questionCount || 0,
        points: result.totalPoints || 0,
        correctAnswers: result.correctAnswers || 0,
        wrongAnswers: result.wrongAnswers || 0,
        successPercentage: result.successPercentage || 0,
        completedAt: result.completedAt,
        sessionId: result.sessionId ? result.sessionId.toString() : null
      });
    });

    // Add Result entries (convert to same format)
    loggedInResults.forEach(result => {
      const quiz = result.quizId || {};
      let username = 'Unknown';
      if (result.userId) {
        const userId = result.userId._id ? result.userId._id.toString() : result.userId.toString();
        username = userIdToUsername.get(userId) || 'Unknown';
      }
      
      // Check if quiz name matches filter (or deck name)
      if (quizName && quizName.trim() !== '') {
        const quizTitle = quiz.title || 'Unknown Quiz';
        const matchesQuiz = quizTitle.toLowerCase().includes(quizName.toLowerCase().trim());
        // Also check if any matching deck IDs were found (though Result doesn't have deckId)
        // For now, just check quiz name - deck matching is handled in StudentResult query
        if (!matchesQuiz) {
          return;
        }
      }
      // Check level, skill, task filters
      if (level && level.trim() !== '' && quiz.level !== level.trim()) {
        return;
      }
      if (skill && skill.trim() !== '' && quiz.skill !== skill.trim()) {
        return;
      }
      if (task && task.trim() !== '' && quiz.task !== task.trim()) {
        return;
      }
      // Check student name filter
      if (studentName && studentName.trim() !== '') {
        if (!username.toLowerCase().includes(studentName.toLowerCase().trim())) {
          return;
        }
      }

      const totalQuestions = result.totalQuestions || 0;
      const correctAnswers = result.correctAnswers || 0;
      const wrongAnswers = totalQuestions - correctAnswers;
      const successPercentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

      allResults.push({
        studentName: username,
        quizId: quiz._id ? quiz._id.toString() : (result.quizId ? result.quizId.toString() : null),
        quizName: quiz.title || 'Unknown Quiz',
        level: quiz.level || null,
        skill: quiz.skill || null,
        task: quiz.task || null,
        questionCount: totalQuestions,
        points: result.score || 0,
        correctAnswers: correctAnswers,
        wrongAnswers: wrongAnswers,
        successPercentage: successPercentage,
        completedAt: result.completedAt,
        sessionId: result.sessionId ? result.sessionId.toString() : null
      });
    });

    // Aggregate by student name
    const studentMap = new Map();

    allResults.forEach(result => {
      const studentKey = result.studentName;
      
      if (!studentMap.has(studentKey)) {
        studentMap.set(studentKey, {
          studentName: studentKey,
          totalQuizzes: new Set(),
          totalSessions: 0,
          totalQuestions: 0,
          totalPoints: 0,
          totalCorrect: 0,
          totalWrong: 0,
          sessions: []
        });
      }

      const student = studentMap.get(studentKey);
      
      // Track unique quizzes
      if (result.quizId) {
        student.totalQuizzes.add(result.quizId);
      }
      
      // Aggregate totals
      student.totalSessions += 1;
      student.totalQuestions += result.questionCount;
      student.totalPoints += result.points;
      student.totalCorrect += result.correctAnswers;
      student.totalWrong += result.wrongAnswers;

      // Add session details
      student.sessions.push({
        sessionId: result.sessionId,
        quizId: result.quizId,
        quizName: result.quizName,
        level: result.level,
        skill: result.skill,
        task: result.task,
        date: result.completedAt,
        questionCount: result.questionCount,
        points: result.points,
        correctAnswers: result.correctAnswers,
        wrongAnswers: result.wrongAnswers,
        successPercentage: result.successPercentage
      });
    });

    // Convert to array and calculate success percentage
    const performance = Array.from(studentMap.values()).map(student => {
      const successPercentage = student.totalQuestions > 0 
        ? Math.round((student.totalCorrect / student.totalQuestions) * 100) 
        : 0;

      return {
        studentName: student.studentName,
        totalQuizzes: student.totalQuizzes.size,
        totalSessions: student.totalSessions,
        totalQuestions: student.totalQuestions,
        totalPoints: student.totalPoints,
        totalCorrect: student.totalCorrect,
        totalWrong: student.totalWrong,
        successPercentage: successPercentage,
        sessions: student.sessions.sort((a, b) => new Date(b.date) - new Date(a.date))
      };
    });

    // Sort by total points (highest first)
    performance.sort((a, b) => b.totalPoints - a.totalPoints);

    // Calculate totals
    const totalQuizzes = new Set();
    performance.forEach(p => {
      p.sessions.forEach(s => {
        if (s.quizId) totalQuizzes.add(s.quizId);
      });
    });

    res.json({
      performance,
      totalQuizzes: totalQuizzes.size,
      totalSessions: allResults.length
    });
  } catch (error) {
    console.error('Error getting all students performance:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get game stats (Flashcards and Spelling)
exports.getGameStats = async (req, res) => {
  try {
    const { studentName, module, dateFrom, dateTo } = req.query;
    const User = require('../models/User');

    // Build query for game modules (Flashcards and Spelling)
    const query = {
      module: { $in: ['Flashcards', 'Spelling'] },
      isActive: false
    };

    // Apply date filters if provided
    if (dateFrom || dateTo) {
      query.date = {};
      if (dateFrom) query.date.$gte = dateFrom;
      if (dateTo) query.date.$lte = dateTo;
    }

    // Get all study sessions for game modules
    const studySessions = await StudySession.find(query).populate('userId', 'username');

    // Group by student (username) and module
    const gameStatsMap = new Map();

    studySessions.forEach(session => {
      const username = session.userId?.username || 'Unknown';
      
      // Apply student name filter if provided
      if (studentName && !username.toLowerCase().includes(studentName.toLowerCase())) {
        return;
      }

      // Apply module filter if provided
      if (module && session.module !== module) {
        return;
      }

      if (!gameStatsMap.has(username)) {
        gameStatsMap.set(username, {
          studentName: username,
          flashcards: {
            sessions: 0,
            totalMinutes: 0,
            totalHours: 0
          },
          spelling: {
            sessions: 0,
            totalMinutes: 0,
            totalHours: 0
          }
        });
      }

      const studentStats = gameStatsMap.get(username);
      const moduleKey = session.module.toLowerCase();
      
      if (studentStats[moduleKey]) {
        studentStats[moduleKey].sessions += 1;
        studentStats[moduleKey].totalMinutes += session.durationMinutes || 0;
        studentStats[moduleKey].totalHours = Math.floor(studentStats[moduleKey].totalMinutes / 60);
      } else {
        // Handle case where module doesn't match expected keys
        console.warn(`Unexpected module: ${session.module}`);
      }
    });

    // Convert map to array and sort by total time (flashcards + spelling)
    const gameStats = Array.from(gameStatsMap.values()).map(student => {
      const totalMinutes = student.flashcards.totalMinutes + student.spelling.totalMinutes;
      const totalSessions = student.flashcards.sessions + student.spelling.sessions;
      return {
        ...student,
        totalMinutes,
        totalHours: Math.floor(totalMinutes / 60),
        totalSessions
      };
    });

    // Sort by total minutes (highest first)
    gameStats.sort((a, b) => b.totalMinutes - a.totalMinutes);

    // Calculate totals
    const totals = {
      totalStudents: gameStats.length,
      totalFlashcardsSessions: gameStats.reduce((sum, s) => sum + s.flashcards.sessions, 0),
      totalSpellingSessions: gameStats.reduce((sum, s) => sum + s.spelling.sessions, 0),
      totalSessions: gameStats.reduce((sum, s) => sum + s.totalSessions, 0),
      totalMinutes: gameStats.reduce((sum, s) => sum + s.totalMinutes, 0),
      totalHours: Math.floor(gameStats.reduce((sum, s) => sum + s.totalMinutes, 0) / 60)
    };

    res.json({
      success: true,
      gameStats,
      totals
    });
  } catch (error) {
    console.error('Error getting game stats:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get teacher analytics (using StudentResult table)
exports.getTeacherAnalytics = async (req, res) => {
  try {
    const { studentName, quizName, level, skill, task, category, difficulty, dateFrom, dateTo } = req.query;
    
    // Build query for student results - ensure hostId is ObjectId
    // JWT token contains userId as string, but MongoDB stores it as ObjectId
    const hostIdQuery = mongoose.Types.ObjectId.isValid(req.user.userId) 
      ? new mongoose.Types.ObjectId(req.user.userId)
      : req.user.userId;
    
    const query = {
      hostId: hostIdQuery
    };

    // Apply filters - only if they have values (not empty strings)
    if (studentName && typeof studentName === 'string' && studentName.trim() !== '') {
      query.username = { $regex: studentName.trim(), $options: 'i' };
    }
    // New standardized filters
    if (level && typeof level === 'string' && level.trim() !== '') {
      query.level = level.trim();
    }
    if (skill && typeof skill === 'string' && skill.trim() !== '') {
      query.skill = skill.trim();
    }
    if (task && typeof task === 'string' && task.trim() !== '') {
      query.task = task.trim();
    }
    // Legacy filters (for backward compatibility)
    if (category && typeof category === 'string' && category.trim() !== '') {
      query.category = category.trim().toLowerCase();
    }
    if (difficulty && typeof difficulty === 'string' && difficulty.trim() !== '') {
      query.difficulty = difficulty.trim().toLowerCase();
    }
    if (dateFrom || dateTo) {
      query.completedAt = {};
      if (dateFrom && dateFrom.trim() !== '') {
        query.completedAt.$gte = new Date(dateFrom);
      }
      if (dateTo && dateTo.trim() !== '') {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        query.completedAt.$lte = toDate;
      }
    }

    // Get all student results for this teacher
    let results = await StudentResult.find(query)
      .sort({ completedAt: -1 });

    // If no results, try alternative query with preserved filters (fallback for ObjectId issues)
    if (results.length === 0 && typeof req.user.userId === 'string') {
      const altQuery = { ...query };
      altQuery.hostId = new mongoose.Types.ObjectId(req.user.userId);
      const altResults = await StudentResult.find(altQuery);
      if (altResults.length > 0) {
        results = altResults;
      }
    }

    // Verify filters are correctly applied (safety check)
    if (results.length > 0) {
      if (level && level.trim() !== '') {
        const filteredResults = results.filter(r => r.level === level.trim());
        if (filteredResults.length !== results.length) {
          results = filteredResults;
        }
      }
      if (skill && skill.trim() !== '') {
        const filteredResults = results.filter(r => r.skill === skill.trim());
        if (filteredResults.length !== results.length) {
          results = filteredResults;
        }
      }
      if (task && task.trim() !== '') {
        const filteredResults = results.filter(r => r.task === task.trim());
        if (filteredResults.length !== results.length) {
          results = filteredResults;
        }
      }
      // Legacy filters (for backward compatibility)
      if (difficulty && difficulty.trim() !== '') {
        const filteredResults = results.filter(r => r.difficulty === difficulty.toLowerCase());
        if (filteredResults.length !== results.length) {
          results = filteredResults;
        }
      }
      if (category && category.trim() !== '') {
        const filteredResults = results.filter(r => r.category === category.toLowerCase());
        if (filteredResults.length !== results.length) {
          results = filteredResults;
        }
      }
    }

    // Filter by quiz name if provided
    if (quizName && quizName.trim() !== '') {
      results = results.filter(r => 
        r.quizName.toLowerCase().includes(quizName.toLowerCase().trim())
      );
    }

    // Aggregate by student username
    const studentMap = new Map();

    results.forEach(result => {
      const username = result.username;
      
      if (!studentMap.has(username)) {
        studentMap.set(username, {
          studentName: username,
          totalQuizzes: new Set(),
          totalSessions: 0,
          totalQuestions: 0,
          totalPoints: 0,
          totalCorrect: 0,
          totalWrong: 0,
          sessions: []
        });
      }

      const student = studentMap.get(username);
      
      student.totalQuizzes.add(result.quizId.toString());
      student.totalSessions += 1; // Each result is one session
      student.totalQuestions += result.questionCount;
      student.totalPoints += result.totalPoints;
      student.totalCorrect += result.correctAnswers;
      student.totalWrong += result.wrongAnswers;

      // Add session details
      student.sessions.push({
        sessionId: result.sessionId.toString(),
        quizId: result.quizId.toString(),
        quizName: result.quizName,
        level: result.level || (result.difficulty === 'beginner' ? 'A1' : result.difficulty === 'intermediate' ? 'B1' : result.difficulty === 'advanced' ? 'C1' : 'A1'),
        skill: result.skill || (result.category === 'reading' ? 'Reading' : result.category === 'listening' ? 'Listening' : 'Reading'),
        task: result.task || (result.category === 'vocabulary' ? 'Vocabulary' : result.category === 'grammar' ? 'Grammar' : 'Vocabulary'),
        // Legacy fields for backward compatibility
        category: result.category,
        difficulty: result.difficulty,
        questionCount: result.questionCount,
        completedAt: result.completedAt,
        points: result.totalPoints,
        correctAnswers: result.correctAnswers,
        wrongAnswers: result.wrongAnswers,
        successPercentage: result.successPercentage
      });
    });

    // Convert to array and format (matching the image format)
    const analytics = Array.from(studentMap.values()).map(student => {
      const totalAnswered = student.totalCorrect + student.totalWrong;
      const successPercentage = totalAnswered > 0 
        ? Math.round((student.totalCorrect / totalAnswered) * 100) 
        : 0;

      return {
        studentName: student.studentName,
        totalQuizzes: student.totalQuizzes.size, // "Quizzes" count (unique quizzes)
        totalSessions: student.totalSessions, // Total sessions attended
        totalQuestions: student.totalQuestions, // Total questions across all quizzes
        totalPoints: student.totalPoints, // Total points
        totalCorrect: student.totalCorrect, // Total correct answers
        totalWrong: student.totalWrong, // Total wrong answers
        successPercentage: successPercentage, // "Success" percentage
        sessions: student.sessions.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
      };
    });

    // Sort by total quizzes (descending)
    analytics.sort((a, b) => b.totalQuizzes - a.totalQuizzes);

    res.json({
      analytics,
      totalSessions: results.length,
      totalStudents: analytics.length,
      filters: {
        studentName: studentName || null,
        quizName: quizName || null,
        level: level || null,
        skill: skill || null,
        task: task || null,
        // Legacy fields for backward compatibility
        category: category || null,
        difficulty: difficulty || null,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null
      }
    });
  } catch (error) {
    console.error('Error getting teacher analytics:', error);
    res.status(500).json({ message: error.message });
  }
};

