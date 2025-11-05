const Session = require('../models/Session');
const Quiz = require('../models/Quiz');
const Result = require('../models/Result');
const StudentResult = require('../models/StudentResult');
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
      .populate('quizId', 'title category difficulty')
      .sort({ completedAt: -1 })
      .limit(50);
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get teacher analytics (using StudentResult table)
exports.getTeacherAnalytics = async (req, res) => {
  try {
    const { studentName, quizName, category, difficulty, dateFrom, dateTo } = req.query;
    
    console.log('Getting analytics for teacher:', req.user.userId);
    console.log('Teacher userId type:', typeof req.user.userId);
    console.log('Filters:', { studentName, quizName, category, difficulty, dateFrom, dateTo });
    
    // Build query for student results - ensure hostId is ObjectId
    // JWT token contains userId as string, but MongoDB stores it as ObjectId
    // Always convert to ObjectId for proper matching
    const hostIdQuery = mongoose.Types.ObjectId.isValid(req.user.userId) 
      ? new mongoose.Types.ObjectId(req.user.userId)
      : req.user.userId;
    
    // Start with base query using ObjectId
    const query = {
      hostId: hostIdQuery
    };
    
    console.log('Teacher userId from JWT:', req.user.userId, 'Type:', typeof req.user.userId);
    console.log('Converted hostIdQuery:', hostIdQuery.toString(), 'Type:', hostIdQuery instanceof mongoose.Types.ObjectId ? 'ObjectId' : typeof hostIdQuery);

    // Apply filters - only if they have values (not empty strings)
    if (studentName && typeof studentName === 'string' && studentName.trim() !== '') {
      query.username = { $regex: studentName.trim(), $options: 'i' };
      console.log('Applied studentName filter:', studentName);
    }
    if (category && typeof category === 'string' && category.trim() !== '') {
      // Ensure lowercase to match enum
      query.category = category.trim().toLowerCase();
      console.log('Applied category filter:', query.category);
    }
    if (difficulty && typeof difficulty === 'string' && difficulty.trim() !== '') {
      // Ensure lowercase to match enum
      query.difficulty = difficulty.trim().toLowerCase();
      console.log('Applied difficulty filter:', query.difficulty);
    }
    if (dateFrom || dateTo) {
      query.completedAt = {};
      if (dateFrom && dateFrom.trim() !== '') {
        query.completedAt.$gte = new Date(dateFrom);
        console.log('Applied dateFrom filter:', dateFrom);
      }
      if (dateTo && dateTo.trim() !== '') {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        query.completedAt.$lte = toDate;
        console.log('Applied dateTo filter:', dateTo);
      }
    }
    
    console.log('Final query with filters:', JSON.stringify(query, null, 2));

    // Debug: Check all results first
    const allResults = await StudentResult.find({}).limit(5);
    const totalCount = await StudentResult.countDocuments({});
    console.log('Total StudentResults in DB:', totalCount);
    if (allResults.length > 0) {
      console.log('Sample results from DB:', allResults.map(r => ({
        username: r.username,
        quizName: r.quizName,
        hostId: r.hostId?.toString(),
        hostIdIsObjectId: r.hostId instanceof mongoose.Types.ObjectId
      })));
      console.log('Query hostId:', hostIdQuery?.toString(), 'Type:', typeof hostIdQuery, 'Is ObjectId:', hostIdQuery instanceof mongoose.Types.ObjectId);
    }

    // Get all student results for this teacher
    let results = await StudentResult.find(query)
      .sort({ completedAt: -1 });

    console.log('Found', results.length, 'student results for teacher with filters');
    if (results.length === 0 && totalCount > 0) {
      console.log('WARNING: Results exist but query returned 0. Checking hostId match...');
      console.log('All hostIds in DB:', [...new Set(allResults.map(r => r.hostId?.toString()))]);
      console.log('Query hostId:', hostIdQuery?.toString());
      
      // If no results, try alternative query BUT preserve all filters
      if (typeof req.user.userId === 'string') {
        // Rebuild query with correct ObjectId but preserve all filters
        const altQuery = { ...query };
        altQuery.hostId = new mongoose.Types.ObjectId(req.user.userId);
        console.log('Trying alternative query with preserved filters:', JSON.stringify(altQuery, null, 2));
        const altResults = await StudentResult.find(altQuery);
        if (altResults.length > 0) {
          console.log('SUCCESS: Found', altResults.length, 'results with alternative query (filters preserved)');
          results = altResults;
        } else {
          console.log('Alternative query also returned 0 results - filters are working correctly, no matching data');
        }
      }
    }
    if (results.length > 0) {
      console.log('Sample result:', {
        username: results[0].username,
        quizName: results[0].quizName,
        category: results[0].category,
        difficulty: results[0].difficulty,
        hostId: results[0].hostId,
        completedAt: results[0].completedAt
      });
      // Verify filters are actually applied
      if (difficulty && difficulty.trim() !== '') {
        const filteredResults = results.filter(r => r.difficulty === difficulty.toLowerCase());
        if (filteredResults.length !== results.length) {
          console.log('WARNING: Filter mismatch! Expected difficulty:', difficulty.toLowerCase(), 'but found:', results.map(r => r.difficulty));
          results = filteredResults;
          console.log('Filtered to', results.length, 'matching results');
        }
      }
      if (category && category.trim() !== '') {
        const filteredResults = results.filter(r => r.category === category.toLowerCase());
        if (filteredResults.length !== results.length) {
          console.log('WARNING: Category filter mismatch! Expected:', category.toLowerCase(), 'but found:', results.map(r => r.category));
          results = filteredResults;
          console.log('Filtered to', results.length, 'matching results');
        }
      }
    }

    // Filter by quiz name if provided (client-side filter for regex)
    if (quizName && quizName.trim() !== '') {
      const beforeCount = results.length;
      results = results.filter(r => 
        r.quizName.toLowerCase().includes(quizName.toLowerCase().trim())
      );
      console.log('After quiz name filter:', results.length, 'results (was', beforeCount, ')');
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

    console.log('Returning analytics for', analytics.length, 'students');
    console.log('Sample analytics:', analytics.length > 0 ? {
      studentName: analytics[0].studentName,
      totalQuizzes: analytics[0].totalQuizzes,
      totalQuestions: analytics[0].totalQuestions
    } : 'No analytics');

    res.json({
      analytics,
      totalSessions: results.length,
      totalStudents: analytics.length,
      filters: {
        studentName: studentName || null,
        quizName: quizName || null,
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

