const Quiz = require('../models/Quiz');
const { generateQuestionImage } = require('../services/imageService');
const { generateQuizTitle, generateQuizDescription, generateQuizQuestions } = require('../services/aiQuizService');

// Get all quizzes
exports.getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find().populate('creatorId', 'username').sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user's quizzes
exports.getMyQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find({ creatorId: req.user.userId }).sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single quiz
exports.getQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('creatorId', 'username');
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create quiz
exports.createQuiz = async (req, res) => {
  try {
    const { title, description, category, difficulty, questions } = req.body;

    if (!questions || questions.length === 0) {
      return res.status(400).json({ message: 'Quiz must have at least one question' });
    }

    const quiz = await Quiz.create({
      title,
      description,
      category,
      difficulty,
      questions,
      creatorId: req.user.userId
    });

    res.status(201).json(quiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update quiz
exports.updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.creatorId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { title, description, category, difficulty, questions } = req.body;
    quiz.title = title || quiz.title;
    quiz.description = description !== undefined ? description : quiz.description;
    quiz.category = category || quiz.category;
    quiz.difficulty = difficulty || quiz.difficulty;
    quiz.questions = questions || quiz.questions;
    quiz.updatedAt = Date.now();

    await quiz.save();
    res.json(quiz);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete quiz
exports.deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    if (quiz.creatorId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await quiz.deleteOne();
    res.json({ message: 'Quiz deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generate image for a question
exports.generateQuestionImage = async (req, res) => {
  try {
    const { questionText, options } = req.body;

    if (!questionText) {
      return res.status(400).json({ message: 'Question text is required' });
    }

    const result = await generateQuestionImage(questionText, options || []);
    res.json({ 
      imageUrl: result.imageUrl,
      searchQuery: result.searchQuery // Include search query for debugging
    });
  } catch (error) {
    console.error('Error generating question image:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to generate image for question',
      searchQuery: error.searchQuery || null // Include search query in error response for debugging
    });
  }
};

// Generate quiz title using AI
exports.generateQuizTitle = async (req, res) => {
  try {
    const { category, difficulty } = req.body;

    if (!category || !difficulty) {
      return res.status(400).json({ message: 'Category and difficulty are required' });
    }

    const title = await generateQuizTitle(category, difficulty);
    res.json({ title });
  } catch (error) {
    console.error('Error generating quiz title:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to generate quiz title' 
    });
  }
};

// Generate quiz description using AI
exports.generateQuizDescription = async (req, res) => {
  try {
    const { title, category, difficulty } = req.body;

    if (!title || !category || !difficulty) {
      return res.status(400).json({ message: 'Title, category, and difficulty are required' });
    }

    const description = await generateQuizDescription(title, category, difficulty);
    res.json({ description });
  } catch (error) {
    console.error('Error generating quiz description:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to generate quiz description' 
    });
  }
};

// Generate quiz questions using AI
exports.generateQuizQuestions = async (req, res) => {
  try {
    const { title, description, category, difficulty, questionCount } = req.body;

    if (!title || !category || !difficulty || !questionCount) {
      return res.status(400).json({ 
        message: 'Title, category, difficulty, and question count are required' 
      });
    }

    if (questionCount < 1 || questionCount > 50) {
      return res.status(400).json({ 
        message: 'Question count must be between 1 and 50' 
      });
    }

    const questions = await generateQuizQuestions(title, description, category, difficulty, questionCount);
    res.json({ questions });
  } catch (error) {
    console.error('Error generating quiz questions:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to generate quiz questions' 
    });
  }
};

