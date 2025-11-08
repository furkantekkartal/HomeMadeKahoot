const Quiz = require('../models/Quiz');
const { generateQuestionImage } = require('../services/imageService');
const { generateQuizTitle, generateQuizDescription, generateQuizQuestions } = require('../services/aiQuizService');
const { processFileAndGenerateQuiz, processYouTubeAndGenerateQuiz } = require('../services/enhancedAiQuizService');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

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

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(os.tmpdir(), 'quiz-uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit (increased for video files)
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.srt', '.mp4', '.mov', '.webm', '.avi'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, SRT, and video files (MP4, MOV, WEBM, AVI) are allowed'));
    }
  }
});

// Enhanced AI Quiz Maker - Process file upload
exports.generateQuizFromFile = async (req, res) => {
  let filePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    
    // Check if it's a video file
    const videoExtensions = ['.mp4', '.mov', '.webm', '.avi'];
    if (videoExtensions.includes(fileExt)) {
      // Process video file using Gemini's video analysis
      const { processVideoFileAndGenerateQuiz } = require('../services/enhancedAiQuizService');
      const result = await processVideoFileAndGenerateQuiz(filePath);
      
      // Clean up uploaded file
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup file:', cleanupError);
      }
      
      return res.json(result);
    }
    
    const sourceType = fileExt === '.pdf' ? 'pdf' : 'srt';

    // Process file and generate quiz
    const result = await processFileAndGenerateQuiz(filePath, sourceType);

    // Clean up uploaded file
    try {
      await fs.unlink(filePath);
    } catch (cleanupError) {
      console.warn('Failed to cleanup file:', cleanupError);
    }

    res.json(result);
  } catch (error) {
    // Clean up uploaded file on error
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup file on error:', cleanupError);
      }
    }

    console.error('Error generating quiz from file:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to generate quiz from file' 
    });
  }
};

// Enhanced AI Quiz Maker - Process YouTube URL
exports.generateQuizFromYouTube = async (req, res) => {
  try {
    const { videoUrl } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ message: 'YouTube URL is required' });
    }

    // Validate YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(videoUrl)) {
      return res.status(400).json({ message: 'Invalid YouTube URL' });
    }

    // Process YouTube video and generate quiz
    const result = await processYouTubeAndGenerateQuiz(videoUrl);

    res.json(result);
  } catch (error) {
    console.error('Error generating quiz from YouTube:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to generate quiz from YouTube video' 
    });
  }
};

// Export multer upload middleware
exports.uploadFile = upload.single('file');

