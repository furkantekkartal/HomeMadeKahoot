const FlashcardDeck = require('../models/FlashcardDeck');
const Word = require('../models/Word');
const UserWord = require('../models/UserWord');
const { generateDeckTitle, generateDeckDescription, enhanceDeckText, processMarkdownWithAI } = require('../services/aiDeckService');
const { processFileAndExtractWords, processYouTubeAndExtractWords } = require('../services/aiDeckWordExtractionService');
const { extractTextFromPDF } = require('../services/enhancedAiQuizService');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// Get all decks for user
exports.getMyDecks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { includeHidden } = req.query; // Optional query param to include hidden decks
    
    const query = { userId };
    // Only filter by visibility if includeHidden is not explicitly 'true'
    // This allows the Decks page to get all decks when needed
    if (includeHidden !== 'true') {
      query.isVisible = { $ne: false }; // Show visible decks (true or undefined/null)
    }
    
    const decks = await FlashcardDeck.find(query)
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
    }).populate('wordIds');
    
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
    const { name, description, level, skill, task, wordIds } = req.body;
    
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
      description: description || '',
      level: level || null,
      skill: skill || null,
      task: task || null,
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
    const { name, description, level, skill, task, wordIds } = req.body;
    
    const deck = await FlashcardDeck.findOne({
      _id: req.params.id,
      userId
    });
    
    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }
    
    if (name !== undefined) deck.name = name;
    if (description !== undefined) deck.description = description;
    if (level !== undefined) deck.level = level || null;
    if (skill !== undefined) deck.skill = skill || null;
    if (task !== undefined) deck.task = task || null;
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

// Generate deck title using AI
exports.generateDeckTitle = async (req, res) => {
  try {
    const { level, skill, task } = req.body;

    if (!level || !skill || !task) {
      return res.status(400).json({ message: 'Level, skill, and task are required' });
    }

    const title = await generateDeckTitle(level, skill, task);
    res.json({ title });
  } catch (error) {
    console.error('Error generating deck title:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to generate deck title' 
    });
  }
};

// Generate deck description using AI
exports.generateDeckDescription = async (req, res) => {
  try {
    const { title, level, skill, task } = req.body;

    if (!title || !level || !skill || !task) {
      return res.status(400).json({ message: 'Title, level, skill, and task are required' });
    }

    const description = await generateDeckDescription(title, level, skill, task);
    res.json({ description });
  } catch (error) {
    console.error('Error generating deck description:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to generate deck description' 
    });
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(os.tmpdir(), 'deck-uploads');
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
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.srt', '.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, SRT, and Excel files are allowed'));
    }
  }
});

// Generate deck from file
exports.generateDeckFromFile = async (req, res) => {
  let filePath = null;
  const initialLogs = [];
  
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    filePath = req.file.path;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;

    initialLogs.push('✅ File received on server');
    initialLogs.push(`📊 File details: ${fileName} (${(fileSize / 1024).toFixed(2)} KB)`);
    initialLogs.push('⏳ Starting file processing...');
    initialLogs.push('⏳ Preparing file for conversion...');

    const result = await processFileAndExtractWords(filePath, fileName, initialLogs);

    // Prepend initial logs to result logs
    if (result.logs && Array.isArray(result.logs)) {
      result.logs = [...initialLogs, ...result.logs];
    } else {
      result.logs = initialLogs;
    }

    // Clean up uploaded file
    try {
      await fs.unlink(filePath);
      result.logs.push('🧹 Temporary file cleaned up');
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

    console.error('Error generating deck from file:', error);
    initialLogs.push(`✗ Error: ${error.message}`);
    res.status(500).json({ 
      message: error.message || 'Failed to process file',
      logs: initialLogs
    });
  }
};

// Generate deck from YouTube
exports.generateDeckFromYouTube = async (req, res) => {
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

    const result = await processYouTubeAndExtractWords(videoUrl);

    res.json(result);
  } catch (error) {
    console.error('Error generating deck from YouTube:', error);
    
    // Include logs in error response if available
    const errorResponse = {
      message: error.message || 'Failed to process YouTube video',
      error: true
    };
    
    // If error has logs attached, include them
    if (error.logs && Array.isArray(error.logs)) {
      errorResponse.logs = error.logs;
    }
    
    res.status(500).json(errorResponse);
  }
};

// Debug: Step 1 - Validate URL and extract video ID
exports.debugStep1_ValidateUrl = async (req, res) => {
  console.log('🔍 Debug Step 1 called with:', req.body);
  try {
    const { videoUrl } = req.body;
    
    if (!videoUrl) {
      return res.status(400).json({ message: 'YouTube URL is required' });
    }
    
    // Validate YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(videoUrl)) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid YouTube URL format',
        videoId: null
      });
    }
    
    // Extract video ID
    let videoId = '';
    const urlPatterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of urlPatterns) {
      const match = videoUrl.match(pattern);
      if (match && match[1]) {
        videoId = match[1];
        break;
      }
    }
    
    if (!videoId) {
      return res.status(400).json({ 
        success: false,
        message: 'Could not extract video ID from URL',
        videoId: null
      });
    }
    
    res.json({
      success: true,
      message: 'URL validated successfully',
      videoId: videoId,
      videoUrl: videoUrl
    });
  } catch (error) {
    console.error('Error in debug Step 1:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to validate URL'
    });
  }
};

// Debug: Step 2 - Get video title
exports.debugStep2_GetVideoTitle = async (req, res) => {
  try {
    const { videoUrl, videoId } = req.body;
    
    if (!videoUrl && !videoId) {
      return res.status(400).json({ message: 'YouTube URL or video ID is required' });
    }
    
    const axios = require('axios');
    let videoTitle = '';
    let extractedVideoId = videoId;
    
    // Extract video ID if not provided
    if (!extractedVideoId && videoUrl) {
      const urlPatterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/watch\?.*v=([^&\n?#]+)/
      ];
      
      for (const pattern of urlPatterns) {
        const match = videoUrl.match(pattern);
        if (match && match[1]) {
          extractedVideoId = match[1];
          break;
        }
      }
    }
    
    if (!extractedVideoId) {
      return res.status(400).json({ 
        success: false,
        message: 'Could not extract video ID'
      });
    }
    
    // Get video title using oEmbed API
    try {
      const urlToUse = videoUrl || `https://www.youtube.com/watch?v=${extractedVideoId}`;
      const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(urlToUse)}&format=json`;
      const oEmbedResponse = await axios.get(oEmbedUrl);
      videoTitle = oEmbedResponse.data.title || '';
    } catch (oEmbedError) {
      return res.json({
        success: false,
        message: `Could not fetch video title: ${oEmbedError.message}`,
        videoId: extractedVideoId,
        videoTitle: `YouTube Video ${extractedVideoId}`,
        fallback: true
      });
    }
    
    res.json({
      success: true,
      message: 'Video title fetched successfully',
      videoId: extractedVideoId,
      videoTitle: videoTitle
    });
  } catch (error) {
    console.error('Error in debug Step 2:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to get video title'
    });
  }
};

// Debug: Step 3 - Extract transcript using Python
exports.debugStep3_ExtractTranscript = async (req, res) => {
  try {
    const { videoUrl, videoId } = req.body;
    
    if (!videoUrl && !videoId) {
      return res.status(400).json({ message: 'YouTube URL or video ID is required' });
    }
    
    const { extractYouTubeTranscriptWithPython } = require('../services/aiDeckWordExtractionService');
    const logs = [];
    
    let urlToUse = videoUrl;
    if (!urlToUse && videoId) {
      urlToUse = `https://www.youtube.com/watch?v=${videoId}`;
    }
    
    const result = await extractYouTubeTranscriptWithPython(urlToUse, logs);
    
    res.json({
      success: true,
      message: 'Transcript extracted successfully',
      videoId: videoId || (urlToUse.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)?.[1]),
      videoTitle: result.title,
      transcript: result.transcript,
      transcriptLength: result.transcript.length,
      logs: logs
    });
  } catch (error) {
    console.error('Error in debug Step 3:', error);
    
    // Try to get logs from error if available
    const logs = error.logs || [];
    logs.push(`❌ Error: ${error.message}`);
    
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to extract transcript',
      logs: logs
    });
  }
};

// Enhance deck text (title or description)
exports.enhanceDeckText = async (req, res) => {
  try {
    const { text, type } = req.body;

    if (!text || !type) {
      return res.status(400).json({ message: 'Text and type are required' });
    }

    if (type !== 'title' && type !== 'description') {
      return res.status(400).json({ message: 'Type must be "title" or "description"' });
    }

    const enhancedText = await enhanceDeckText(text, type);
    res.json({ enhancedText });
  } catch (error) {
    console.error('Error enhancing deck text:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to enhance text' 
    });
  }
};

// Toggle deck visibility
exports.toggleDeckVisibility = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    
    const deck = await FlashcardDeck.findOne({
      _id: id,
      userId
    });
    
    if (!deck) {
      return res.status(404).json({ message: 'Deck not found' });
    }
    
    deck.isVisible = !deck.isVisible;
    await deck.save();
    
    res.json({ 
      message: `Deck ${deck.isVisible ? 'shown' : 'hidden'} successfully`,
      isVisible: deck.isVisible
    });
  } catch (error) {
    console.error('Error toggling deck visibility:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to toggle deck visibility' 
    });
  }
};

// Process markdown with AI
exports.processMarkdownWithAI = async (req, res) => {
  console.log('processMarkdownWithAI called');
  try {
    const { markdownContent, fileType } = req.body;

    if (!markdownContent) {
      return res.status(400).json({ message: 'Markdown content is required' });
    }

    const result = await processMarkdownWithAI(markdownContent, fileType);
    res.json({ 
      response: result.response,
      prompt: result.prompt
    });
  } catch (error) {
    console.error('Error processing markdown with AI:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to process markdown with AI' 
    });
  }
};

/**
 * Convert PDF text to Markdown format
 * Attempts to preserve structure and formatting
 */
function textToMarkdown(text, fileName) {
  let markdown = `# ${fileName.replace(/\.pdf$/i, '')}\n\n`;
  
  // Split text into lines
  const lines = text.split('\n').map(line => line.trim());
  
  let inList = false;
  let previousLine = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i < lines.length - 1 ? lines[i + 1] : '';
    
    // Skip empty lines (but preserve spacing)
    if (!line) {
      if (inList && nextLine && !nextLine.match(/^[-*•]\s/)) {
        markdown += '\n';
        inList = false;
      } else {
        markdown += '\n';
      }
      continue;
    }
    
    // Detect headings (lines that are short and followed by empty line or different content)
    const isShortLine = line.length < 100;
    const isFollowedByEmpty = !nextLine || nextLine.length === 0;
    const looksLikeHeading = isShortLine && (isFollowedByEmpty || nextLine.length > line.length);
    
    if (looksLikeHeading && line.length > 0 && line.length < 80) {
      // Check if it's already a heading
      if (!line.startsWith('#')) {
        markdown += `## ${line}\n\n`;
      } else {
        markdown += `${line}\n\n`;
      }
      continue;
    }
    
    // Detect list items
    if (line.match(/^[-*•]\s/) || line.match(/^\d+[\.)]\s/)) {
      if (!inList) {
        markdown += '\n';
        inList = true;
      }
      markdown += `${line}\n`;
      continue;
    }
    
    // Regular paragraph
    if (inList) {
      markdown += '\n';
      inList = false;
    }
    
    // Preserve existing markdown formatting
    if (line.startsWith('#') || line.startsWith('*') || line.startsWith('-')) {
      markdown += `${line}\n\n`;
    } else {
      markdown += `${line}\n\n`;
    }
    
    previousLine = line;
  }
  
  // Clean up excessive newlines
  markdown = markdown.replace(/\n{3,}/g, '\n\n');
  
  return markdown.trim();
}

// Convert PDF to Markdown
exports.convertPDFToMD = async (req, res) => {
  console.log('convertPDFToMD called');
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No PDF file uploaded. Please select a PDF file.' 
      });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;

    try {
      // Extract text from PDF using the working function from enhancedAiQuizService
      const pdfText = await extractTextFromPDF(filePath);
      
      // Convert to Markdown
      const markdown = textToMarkdown(pdfText, fileName);
      
      // Clean up uploaded file
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup file:', cleanupError);
      }
      
      // Return markdown content
      res.json({
        success: true,
        markdownContent: markdown,
        fileName: fileName.replace(/\.pdf$/i, '.md'),
        stats: {
          originalTextLength: pdfText.length,
          markdownLength: markdown.length
        }
      });
      
    } catch (error) {
      console.error('Error converting PDF:', error);
      
      // Clean up uploaded file on error
      try {
        await fs.unlink(filePath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup file on error:', cleanupError);
      }
      
      res.status(500).json({ 
        error: error.message || 'Failed to convert PDF to Markdown',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  } catch (error) {
    console.error('Error in convertPDFToMD:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to convert PDF to Markdown' 
    });
  }
};

// Export multer upload middleware
exports.uploadFile = upload.single('file');

