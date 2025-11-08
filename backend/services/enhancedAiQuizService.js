const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { generateQuestionImage } = require('./imageService');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY is not set in environment variables');
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
// Use Gemini 2.0 Flash (latest and fastest)
// Model can be configured via GEMINI_MODEL env variable
// Common model names: 'gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.5-pro'
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';

// List of models to try in order (most preferred first)
const MODEL_FALLBACKS = [
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash-thinking-exp',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-2.5-pro'
];

let cachedModel = null;
let cachedModelName = null;

const getModel = () => {
  if (!genAI) return null;
  
  // If we have a cached working model, use it
  if (cachedModel && cachedModelName === GEMINI_MODEL) {
    return cachedModel;
  }
  
  // Try the configured model first
  const modelToTry = GEMINI_MODEL;
  cachedModel = genAI.getGenerativeModel({ model: modelToTry });
  cachedModelName = modelToTry;
  return cachedModel;
};

// Helper function to get a working model with fallback
// Caches the first working model to avoid repeated tests
const getWorkingModel = async () => {
  if (!genAI) return null;
  
  // If we already have a cached working model, use it
  if (cachedModel && cachedModelName) {
    return cachedModel;
  }
  
  // Try configured model first, then fallbacks
  const modelsToTry = [GEMINI_MODEL, ...MODEL_FALLBACKS.filter(m => m !== GEMINI_MODEL)];
  
  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      // Test if model works with a minimal call
      const testResult = await model.generateContent('Hi');
      if (testResult && testResult.response) {
        cachedModel = model;
        cachedModelName = modelName;
        console.log(`✓ Using Gemini model: ${modelName}`);
        return model;
      }
    } catch (error) {
      // Model not available, try next one
      console.warn(`✗ Model ${modelName} not available: ${error.message.split('\n')[0]}`);
      continue;
    }
  }
  
  throw new Error('No available Gemini models found. Please check your API key and available models. Try setting GEMINI_MODEL in .env to a specific model name.');
};

// Retry helper with exponential backoff for rate limiting
const retryWithBackoff = async (fn, maxRetries = 3, initialDelay = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const errorMessage = error.message || '';
      
      // Check if it's a rate limit error (429)
      if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests') || errorMessage.includes('Resource exhausted')) {
        if (attempt < maxRetries - 1) {
          // Exponential backoff: 1s, 2s, 4s, etc.
          const delay = initialDelay * Math.pow(2, attempt);
          console.warn(`Rate limit hit. Retrying in ${delay / 1000}s... (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          throw new Error('Rate limit exceeded. Please wait a few minutes and try again. The API has temporary usage limits.');
        }
      }
      
      // For other errors, throw immediately
      throw error;
    }
  }
  
  throw lastError;
};

// Helper to add delay between requests to avoid rate limits
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Extract text from PDF file
 */
async function extractTextFromPDF(filePath) {
  try {
    const pdfParse = require('pdf-parse');
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Extract text from SRT subtitle file
 */
async function extractTextFromSRT(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    // Remove SRT timestamps and formatting, keep only text
    const text = content
      .replace(/\d+\n/g, '') // Remove sequence numbers
      .replace(/\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}\n/g, '') // Remove timestamps
      .replace(/<[^>]+>/g, '') // Remove HTML tags
      .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
      .trim();
    return text;
  } catch (error) {
    throw new Error(`Failed to extract text from SRT: ${error.message}`);
  }
}

/**
 * Analyze video file directly using Gemini's video capabilities
 * Gemini 2.0 Flash can process video files (MP4, MOV, etc.)
 */
async function analyzeVideoFileWithGemini(filePath) {
  if (!genAI) {
    throw new Error('Gemini API key is not configured');
  }

  const currentModel = await getWorkingModel();
  if (!currentModel) {
    throw new Error('Failed to initialize Gemini model');
  }

  try {
    // Read video file
    const videoData = await fs.readFile(filePath);
    const videoBase64 = videoData.toString('base64');
    
    // Determine MIME type from file extension
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.webm': 'video/webm',
      '.avi': 'video/x-msvideo'
    };
    const mimeType = mimeTypes[ext] || 'video/mp4';
    
    // Use Gemini to analyze the video
    const prompt = `Analyze this video and create a comprehensive study sheet. Extract:
1. All spoken words and dialogue
2. Visual content and concepts shown
3. Key topics and themes
4. Important vocabulary and terminology
5. Educational content and explanations

Format as a detailed study guide.`;
    
    await delay(500);
    const result = await retryWithBackoff(async () => {
      return await currentModel.generateContent([
        { text: prompt },
        {
          inlineData: {
            data: videoBase64,
            mimeType: mimeType
          }
        }
      ]);
    });
    
    const analyzedContent = await result.response.text();
    
    return analyzedContent;
  } catch (error) {
    console.error('Error analyzing video file with Gemini:', error);
    throw new Error(`Failed to analyze video file: ${error.message}`);
  }
}

/**
 * Extract transcript from YouTube video
 * Note: Gemini cannot directly access YouTube URLs, but can analyze video files
 * For YouTube, we extract transcript and use Gemini to analyze it
 */
async function extractYouTubeTranscript(videoUrl) {
  try {
    // Extract video ID from URL
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
      throw new Error('Invalid YouTube URL format');
    }
    
    // Try to get transcript using youtube-transcript
    let transcript = '';
    try {
      const { YoutubeTranscript } = require('youtube-transcript');
      const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
      transcript = transcriptData.map(item => item.text).join(' ');
    } catch (transcriptError) {
      console.warn('Could not fetch transcript, using alternative method:', transcriptError.message);
      // Transcript not available, we'll proceed with just title and description
    }
    
    // Get video metadata using oEmbed API (more reliable than ytdl-core)
    let videoTitle = '';
    let videoDescription = '';
    
    try {
      const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
      const oEmbedResponse = await axios.get(oEmbedUrl);
      videoTitle = oEmbedResponse.data.title || '';
    } catch (oEmbedError) {
      console.warn('Could not fetch video title from oEmbed:', oEmbedError.message);
      // Fallback: try ytdl-core as last resort
      try {
        const ytdl = require('ytdl-core');
        const info = await ytdl.getInfo(videoUrl);
        videoTitle = info.videoDetails.title || '';
        videoDescription = info.videoDetails.description || '';
      } catch (ytdlError) {
        console.warn('ytdl-core also failed:', ytdlError.message);
        // Use video ID as fallback title
        videoTitle = `YouTube Video ${videoId}`;
      }
    }
    
    // Combine all available content
    const contentParts = [];
    if (videoTitle) contentParts.push(`Video Title: ${videoTitle}`);
    if (videoDescription) contentParts.push(`Description: ${videoDescription}`);
    if (transcript) contentParts.push(`Transcript: ${transcript}`);
    
    if (contentParts.length === 0) {
      throw new Error('Could not extract any content from YouTube video. The video may be private or unavailable.');
    }
    
    return {
      title: videoTitle || `YouTube Video ${videoId}`,
      description: videoDescription || '',
      transcript: contentParts.join('\n\n')
    };
  } catch (error) {
    throw new Error(`Failed to extract YouTube video info: ${error.message}`);
  }
}

/**
 * Analyze content and create study sheet using Gemini AI
 */
async function analyzeContentAndCreateStudySheet(content, sourceType) {
  if (!genAI) {
    throw new Error('Gemini API key is not configured');
  }

  // Get working model with fallback
  const currentModel = await getWorkingModel();
  if (!currentModel) {
    throw new Error('Failed to initialize Gemini model');
  }

  const prompt = `Analyze the following ${sourceType} content and create a comprehensive study sheet.

Content:
${content}

Create a detailed study sheet that includes:
1. Key concepts and topics
2. Important facts and information
3. Main themes and ideas
4. Vocabulary and terminology
5. Summary of important points

Format the study sheet in a clear, organized manner that can be used to generate educational quiz questions.`;

  try {
    // Add small delay to avoid rate limits
    await delay(500);
    
    const result = await retryWithBackoff(async () => {
      return await currentModel.generateContent(prompt);
    });
    
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error analyzing content:', error);
    throw new Error(`Failed to analyze content: ${error.message}`);
  }
}

/**
 * Determine quiz parameters based on content analysis
 */
async function determineQuizParameters(studySheet, content) {
  if (!genAI) {
    throw new Error('Gemini API key is not configured');
  }

  const currentModel = await getWorkingModel();
  if (!currentModel) {
    throw new Error('Failed to initialize Gemini model');
  }

  const prompt = `Based on the following study sheet and content, determine the appropriate quiz parameters.

Study Sheet:
${studySheet}

Content Summary:
${content.substring(0, 1000)}...

Analyze the content depth and complexity, then determine:
1. Category: vocabulary, grammar, reading, or listening
2. Difficulty: beginner, intermediate, or advanced
3. Question Number: How many questions should this quiz have? (Consider the depth of the topic - if it's a deep/complex topic, suggest more questions like 40-60. If it's simpler, suggest 10-20)

Return your response as a JSON object in this exact format:
{
  "category": "vocabulary|grammar|reading|listening",
  "difficulty": "beginner|intermediate|advanced",
  "questionNumber": <number between 5 and 60>,
  "reasoning": "Brief explanation of why these parameters were chosen"
}

Only return the JSON object, no other text.`;

  try {
    // Add small delay to avoid rate limits
    await delay(500);
    
    const result = await retryWithBackoff(async () => {
      return await currentModel.generateContent(prompt);
    });
    
    const response = await result.response;
    const text = response.text().trim();
    
    // Extract JSON from response
    let jsonString = text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }
    
    const params = JSON.parse(jsonString);
    
    // Validate and normalize
    const validCategories = ['vocabulary', 'grammar', 'reading', 'listening'];
    const validDifficulties = ['beginner', 'intermediate', 'advanced'];
    
    return {
      category: validCategories.includes(params.category) ? params.category : 'vocabulary',
      difficulty: validDifficulties.includes(params.difficulty) ? params.difficulty : 'beginner',
      questionNumber: Math.min(60, Math.max(5, parseInt(params.questionNumber) || 10)),
      reasoning: params.reasoning || ''
    };
  } catch (error) {
    console.error('Error determining quiz parameters:', error);
    // Return defaults
    return {
      category: 'vocabulary',
      difficulty: 'intermediate',
      questionNumber: 10,
      reasoning: 'Default parameters due to analysis error'
    };
  }
}

/**
 * Generate simplified title and description
 */
async function generateSimplifiedTitleAndDescription(studySheet, category, difficulty) {
  if (!genAI) {
    throw new Error('Gemini API key is not configured');
  }

  const currentModel = await getWorkingModel();
  if (!currentModel) {
    throw new Error('Failed to initialize Gemini model');
  }

  const prompt = `Based on this study sheet, generate a simple, concise quiz title and description.

Study Sheet:
${studySheet}

Category: ${category}
Difficulty: ${difficulty}

Generate:
1. A short, simple title (3-6 words max). Make it clear and direct.
2. A brief description (1-2 sentences max). Keep it simple and to the point.

Return as JSON:
{
  "title": "Simple title here",
  "description": "Brief description here"
}

Only return the JSON, no other text.`;

  try {
    // Add small delay to avoid rate limits
    await delay(500);
    
    const result = await retryWithBackoff(async () => {
      return await currentModel.generateContent(prompt);
    });
    
    const response = await result.response;
    const text = response.text().trim();
    
    // Extract JSON
    let jsonString = text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }
    
    const data = JSON.parse(jsonString);
    
    return {
      title: (data.title || 'Quiz').replace(/^["']|["']$/g, '').trim(),
      description: (data.description || '').replace(/^["']|["']$/g, '').trim()
    };
  } catch (error) {
    console.error('Error generating title/description:', error);
    return {
      title: `${category.charAt(0).toUpperCase() + category.slice(1)} Quiz`,
      description: `Test your ${category} knowledge at ${difficulty} level.`
    };
  }
}

/**
 * Generate quiz questions based on study sheet
 */
async function generateQuizFromStudySheet(studySheet, title, description, category, difficulty, questionNumber) {
  if (!genAI) {
    throw new Error('Gemini API key is not configured');
  }

  const currentModel = await getWorkingModel();
  if (!currentModel) {
    throw new Error('Failed to initialize Gemini model');
  }

  const prompt = `Generate ${questionNumber} multiple-choice quiz questions based on this study sheet.

Study Sheet:
${studySheet}

Quiz Title: ${title}
Description: ${description}
Category: ${category}
Difficulty: ${difficulty}

Requirements:
- Each question must have exactly 4 options
- One option must be clearly correct
- Questions should test understanding of the study sheet content
- Difficulty level: ${difficulty}
- Focus on: ${category}

Return as JSON array:
[
  {
    "questionText": "Question here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0
  }
]

Only return the JSON array, no other text.`;

  try {
    // Add small delay to avoid rate limits
    await delay(500);
    
    const result = await retryWithBackoff(async () => {
      return await currentModel.generateContent(prompt);
    });
    
    const response = await result.response;
    const text = response.text().trim();
    
    // Extract JSON array
    let jsonString = text;
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }
    
    const questions = JSON.parse(jsonString);
    
    if (!Array.isArray(questions)) {
      throw new Error('Invalid response format: expected array');
    }
    
    // Calculate default points and time limit
    const calculatePoints = (cat, diff) => {
      const catCoef = { vocabulary: 1, grammar: 2, reading: 2, listening: 2 };
      const diffCoef = { beginner: 1, intermediate: 3, advanced: 5 };
      return (catCoef[cat] || 1) * (diffCoef[diff] || 1);
    };
    
    const calculateTimeLimit = (diff) => {
      const limits = { beginner: 20, intermediate: 40, advanced: 60 };
      return limits[diff] || 20;
    };
    
    const defaultPoints = calculatePoints(category, difficulty);
    const defaultTimeLimit = calculateTimeLimit(difficulty);
    
    // Format questions
    const formattedQuestions = questions.map((q, index) => ({
      questionText: q.questionText || `Question ${index + 1}`,
      options: Array.isArray(q.options) && q.options.length === 4 
        ? q.options 
        : ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer < 4
        ? q.correctAnswer
        : 0,
      points: defaultPoints,
      timeLimit: defaultTimeLimit,
      imageUrl: null
    })).slice(0, questionNumber);
    
    // Generate images for all questions
    console.log(`Generating images for ${formattedQuestions.length} questions...`);
    for (let i = 0; i < formattedQuestions.length; i++) {
      try {
        // Add delay between image generations to avoid rate limits
        if (i > 0) {
          await delay(500);
        }
        
        const question = formattedQuestions[i];
        const imageResult = await generateQuestionImage(question.questionText, question.options);
        formattedQuestions[i].imageUrl = imageResult.imageUrl;
        console.log(`✓ Generated image for question ${i + 1}/${formattedQuestions.length}`);
      } catch (error) {
        console.warn(`⚠ Failed to generate image for question ${i + 1}: ${error.message}`);
        // Continue with other questions even if one fails
        formattedQuestions[i].imageUrl = null;
      }
    }
    
    return formattedQuestions;
  } catch (error) {
    console.error('Error generating quiz questions:', error);
    throw new Error(`Failed to generate quiz questions: ${error.message}`);
  }
}

/**
 * Process video file and generate complete quiz using Gemini's video analysis
 */
async function processVideoFileAndGenerateQuiz(filePath) {
  try {
    // Step 1: Analyze video file directly with Gemini
    console.log('Analyzing video file with Gemini...');
    const videoAnalysis = await analyzeVideoFileWithGemini(filePath);
    
    // Step 2: Create study sheet from video analysis
    const studySheet = await analyzeContentAndCreateStudySheet(videoAnalysis, 'video file');
    
    // Add delay between steps
    await delay(1000);
    
    // Step 3: Determine quiz parameters
    const params = await determineQuizParameters(studySheet, videoAnalysis);
    
    // Add delay between steps
    await delay(1000);
    
    // Step 4: Generate simplified title and description
    const { title, description } = await generateSimplifiedTitleAndDescription(
      studySheet,
      params.category,
      params.difficulty
    );
    
    // Add delay between steps
    await delay(1000);
    
    // Step 5: Generate quiz questions
    const questions = await generateQuizFromStudySheet(
      studySheet,
      title,
      description,
      params.category,
      params.difficulty,
      params.questionNumber
    );
    
    return {
      title,
      description,
      category: params.category,
      difficulty: params.difficulty,
      questions,
      studySheet,
      reasoning: params.reasoning
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Process uploaded file and generate complete quiz
 */
async function processFileAndGenerateQuiz(filePath, sourceType) {
  try {
    // Extract content based on file type
    let content = '';
    if (sourceType === 'pdf') {
      content = await extractTextFromPDF(filePath);
    } else if (sourceType === 'srt') {
      content = await extractTextFromSRT(filePath);
    } else {
      throw new Error(`Unsupported file type: ${sourceType}`);
    }
    
    if (!content || content.trim().length === 0) {
      throw new Error('No content extracted from file');
    }
    
    // Step 1: Analyze content and create study sheet
    const studySheet = await analyzeContentAndCreateStudySheet(content, sourceType);
    
    // Add delay between steps to avoid rate limits
    await delay(1000);
    
    // Step 2: Determine quiz parameters
    const params = await determineQuizParameters(studySheet, content);
    
    // Add delay between steps
    await delay(1000);
    
    // Step 3: Generate simplified title and description
    const { title, description } = await generateSimplifiedTitleAndDescription(
      studySheet,
      params.category,
      params.difficulty
    );
    
    // Add delay between steps
    await delay(1000);
    
    // Step 4: Generate quiz questions
    const questions = await generateQuizFromStudySheet(
      studySheet,
      title,
      description,
      params.category,
      params.difficulty,
      params.questionNumber
    );
    
    return {
      title,
      description,
      category: params.category,
      difficulty: params.difficulty,
      questions,
      studySheet,
      reasoning: params.reasoning
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Process YouTube URL and generate complete quiz
 */
async function processYouTubeAndGenerateQuiz(videoUrl) {
  try {
    // Try to use Gemini's video analysis capabilities
    // First attempt: Use Gemini to analyze transcript if available
    let videoData;
    try {
      videoData = await analyzeYouTubeVideoWithGemini(videoUrl);
      console.log('✓ Used Gemini to analyze YouTube video content');
    } catch (geminiError) {
      console.warn('Gemini video analysis failed, using fallback:', geminiError.message);
      // Fallback to basic extraction
      videoData = await extractYouTubeTranscript(videoUrl);
    }
    
    const content = `${videoData.title}\n\n${videoData.description}\n\n${videoData.transcript}`;
    
    if (!content || content.trim().length === 0) {
      throw new Error('No content extracted from YouTube video. Please ensure the video has captions enabled.');
    }
    
    // Step 1: Analyze content and create study sheet
    const studySheet = await analyzeContentAndCreateStudySheet(content, 'YouTube video');
    
    // Add delay between steps to avoid rate limits
    await delay(1000);
    
    // Step 2: Determine quiz parameters
    const params = await determineQuizParameters(studySheet, content);
    
    // Add delay between steps
    await delay(1000);
    
    // Step 3: Generate simplified title and description
    const { title, description } = await generateSimplifiedTitleAndDescription(
      studySheet,
      params.category,
      params.difficulty
    );
    
    // Add delay between steps
    await delay(1000);
    
    // Step 4: Generate quiz questions
    const questions = await generateQuizFromStudySheet(
      studySheet,
      title,
      description,
      params.category,
      params.difficulty,
      params.questionNumber
    );
    
    return {
      title,
      description,
      category: params.category,
      difficulty: params.difficulty,
      questions,
      studySheet,
      reasoning: params.reasoning
    };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  processFileAndGenerateQuiz,
  processVideoFileAndGenerateQuiz,
  processYouTubeAndGenerateQuiz,
  extractTextFromPDF,
  extractTextFromSRT,
  extractYouTubeTranscript,
  analyzeVideoFileWithGemini
};

