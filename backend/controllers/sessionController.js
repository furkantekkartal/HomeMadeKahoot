const Session = require('../models/Session');
const Quiz = require('../models/Quiz');
const Result = require('../models/Result');

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

