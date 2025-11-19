const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { generateQuestionImage } = require('./imageService');

// OpenRouter API key
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) {
  console.warn('OPENROUTER_API_KEY is not set in environment variables');
}

// OpenRouter API call function
const callOpenRouter = async (prompt, systemPrompt = null) => {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured');
  }

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: 'openai/gpt-4o-mini',
      messages,
      temperature: 0.3,
      max_tokens: 16000
    },
    {
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'HomeMadeKahoot'
      }
    }
  );

  return response.data.choices[0]?.message?.content || '';
};

// Helper to add delay between requests to avoid rate limits
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to add timestamped log entry
const addLog = (logs, message, indent = false) => {
  const timestamp = new Date().toLocaleTimeString('en-GB', { hour12: false });
  const prefix = indent ? `[${timestamp}]    ` : `[${timestamp}]`;
  logs.push(`${prefix} ${message}`);
};

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
 * Extract text from SRT file
 */
async function extractTextFromSRT(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    // Remove SRT timestamps and formatting, keep only text
    const lines = content.split('\n');
    const textLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Skip empty lines, sequence numbers, and timestamps
      if (!line || /^\d+$/.test(line) || /^\d{2}:\d{2}:\d{2}/.test(line)) {
        continue;
      }
      // Keep actual subtitle text
      if (line.length > 0) {
        textLines.push(line);
      }
    }
    
    return textLines.join(' ');
  } catch (error) {
    throw new Error(`Failed to extract text from SRT: ${error.message}`);
  }
}

/**
 * Extract YouTube video transcript and metadata
 */
async function extractYouTubeTranscript(videoUrl) {
  try {
    const { extractYouTubeTranscriptWithPython } = require('./aiDeckWordExtractionService');
    const logs = [];
    const result = await extractYouTubeTranscriptWithPython(videoUrl, logs);
    
    return {
      title: result.title || '',
      description: result.description || '',
      transcript: result.transcript || ''
    };
  } catch (error) {
    throw new Error(`Failed to extract YouTube video info: ${error.message}`);
  }
}

/**
 * Clean content using AI (same as create-deck)
 */
async function cleanContentWithAI(markdownContent, sourceType, logs = []) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured');
  }

  let prompt;
  let systemMessage;

  if (sourceType === 'pdf' || sourceType === 'webpage') {
    addLog(logs, '⏳ AI is cleaning content...', true);
    const cleaningStartTime = Date.now();
    
    prompt = `This content was converted from a ${sourceType === 'pdf' ? 'PDF file' : 'webpage'}. Your task is to clean the content:

STEP 1: Clean the content
* Remove unnecessary parts: table of contents, index, ISBN numbers, page numbers, headers, footers
* Remove navigation elements: "click here" buttons, links to other pages, advertisement text
* Remove metadata: publication info, copyright notices (unless relevant to content)
* Keep only the main readable content about the primary topic
** If it's a story book, keep only the story text (no index, ISBN, etc.)
** If it's a newspaper webpage, keep only the news article (no buttons, links, other news)
** If it's a document, keep only the main content (no headers, footers, page numbers)

Return ONLY the cleaned content. No explanations, no markdown formatting. Just the cleaned text.

Content to clean:
${markdownContent.substring(0, 50000)}`;

    systemMessage = 'You are a content cleaning tool. Clean the content by removing unnecessary parts (index, ISBN, buttons, links, headers, footers). Return only the cleaned content, no explanations.';

    try {
      const cleanedContent = await callOpenRouter(prompt, systemMessage);
      const cleaningTime = ((Date.now() - cleaningStartTime) / 1000).toFixed(2);
      const cleanedWordCount = cleanedContent.split(/\s+/).filter(w => w.length > 0).length;
      addLog(logs, `✅ Content cleaned (${cleaningTime}s): ${cleanedContent.length} characters = ${cleanedWordCount} words`, true);
      return cleanedContent.trim();
    } catch (error) {
      console.error('Error cleaning content:', error);
      // Return original content if cleaning fails
      addLog(logs, `⚠ Content cleaning failed, using original content`, true);
      return markdownContent;
    }
  } else {
    // For SRT/YouTube, just return as-is (already cleaned)
    addLog(logs, 'Content already clean (SRT/YouTube), skipping AI cleaning', true);
    return markdownContent;
  }
}

/**
 * Single AI call to generate complete quiz from cleaned content
 * Returns JSON with level, skill, task, title, description, and questions
 */
async function generateCompleteQuizFromContent(cleanedContent, sourceType, logs = []) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured');
  }

  const sourceTypeLabel = sourceType === 'pdf' ? 'PDF file' : 
                         sourceType === 'srt' ? 'SRT subtitle file' :
                         sourceType === 'txt' ? 'text file' :
                         sourceType === 'youtube' ? 'YouTube video transcript' :
                         sourceType === 'webpage' ? 'webpage' : sourceType;

  const prompt = `Analyze the following ${sourceTypeLabel} content and generate a complete quiz in JSON format.

Content:
${cleanedContent.substring(0, 50000)}

Your task:
1. Analyze the content depth and complexity to determine the CEFR level (A1, A2, B1, B2, C1, or C2)
2. Determine the appropriate skill (Speaking, Reading, Writing, or Listening)
3. Determine the appropriate task (Vocabulary, Grammar, Spelling, Essay, Repeat, or Read Aloud)
4. Determine how many questions to generate (5-60, based on content depth)
5. Generate a simple title (3-6 words) matching the detected level
6. Generate a brief description (1-2 sentences) matching the detected level
7. Generate multiple-choice quiz questions (each with exactly 4 options)

CRITICAL REQUIREMENTS:
- Level detection: Analyze vocabulary complexity, sentence structure, and content difficulty
  * A1: Very basic, simple words, short sentences (5-10 words)
  * A2: Basic, common words, simple sentences (8-15 words)
  * B1: Intermediate, everyday vocabulary, moderate sentences (12-20 words)
  * B2: Upper-intermediate, varied vocabulary, complex sentences (15-25 words)
  * C1: Advanced, sophisticated vocabulary, very complex sentences (20-30 words)
  * C2: Near-native, highly sophisticated vocabulary and structures (25+ words)

- Title and description MUST use vocabulary and sentence complexity matching the detected level
- Questions, options, and all text MUST strictly match the detected level
- Each question must have exactly 4 options
- One option must be the correct answer (correctAnswer: 0, 1, 2, or 3)
- Questions should test understanding of the content

Return ONLY a JSON object in this exact format:
{
  "level": "A1|A2|B1|B2|C1|C2",
  "skill": "Speaking|Reading|Writing|Listening",
  "task": "Vocabulary|Grammar|Spelling|Essay|Repeat|Read Aloud",
  "questionNumber": <number between 5 and 60>,
  "reasoning": "Brief explanation of why this level was chosen",
  "title": "Simple title here (3-6 words, matching level)",
  "description": "Brief description here (1-2 sentences, matching level)",
  "questions": [
    {
      "questionText": "Question text here (matching level complexity)",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": 0
    }
  ]
}

Only return the JSON object, no other text.`;

  const systemMessage = 'You are an educational quiz generator. Analyze content, detect CEFR level, and generate complete quizzes. Return only valid JSON, no other text.';

  try {
    addLog(logs, '⏳ Sending request to AI for quiz generation...', true);
    
    const aiStartTime = Date.now();
    const rawResponse = await callOpenRouter(prompt, systemMessage);
    const aiTime = ((Date.now() - aiStartTime) / 1000).toFixed(2);
    
    addLog(logs, `✅ AI response received (${aiTime}s)`, true);
    
    // Extract JSON from response
    let jsonString = rawResponse;
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }
    
    const quizData = JSON.parse(jsonString);
    
    // Validate and normalize
    const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const validSkills = ['Speaking', 'Reading', 'Writing', 'Listening'];
    const validTasks = ['Vocabulary', 'Grammar', 'Spelling', 'Essay', 'Repeat', 'Read Aloud'];
    
    const level = validLevels.includes(quizData.level) ? quizData.level : 'A1';
    const skill = validSkills.includes(quizData.skill) ? quizData.skill : 'Reading';
    const task = validTasks.includes(quizData.task) ? quizData.task : 'Vocabulary';
    const questionNumber = Math.min(60, Math.max(5, parseInt(quizData.questionNumber) || 10));
    
    // Calculate default points and time limit based on level and task
    const calculatePoints = (lvl, tsk) => {
      const taskCoef = { Vocabulary: 1, Grammar: 2, Spelling: 1, Essay: 3, Repeat: 2, 'Read Aloud': 2 };
      const levelCoef = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
      return (taskCoef[tsk] || 1) * (levelCoef[lvl] || 1) * 10;
    };
    
    const calculateTimeLimit = (lvl) => {
      const limits = { A1: 20, A2: 25, B1: 30, B2: 40, C1: 50, C2: 60 };
      return limits[lvl] || 20;
    };
    
    const defaultPoints = calculatePoints(level, task);
    const defaultTimeLimit = calculateTimeLimit(level);
    
    // Format questions
    const formattedQuestions = (quizData.questions || []).map((q, index) => ({
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
    
    return {
      level,
      skill,
      task,
      questionNumber,
      reasoning: quizData.reasoning || '',
      title: (quizData.title || 'Quiz').replace(/^["']|["']$/g, '').trim(),
      description: (quizData.description || '').replace(/^["']|["']$/g, '').trim(),
      questions: formattedQuestions,
      prompt,
      rawResponse
    };
  } catch (error) {
    console.error('Error generating complete quiz:', error);
    throw new Error(`Failed to generate quiz: ${error.message}`);
  }
}

// Keep analyzeVideoFileWithGemini for video file processing (if needed)
async function analyzeVideoFileWithGemini(filePath) {
  // This function is kept for video file processing but not used in the main flow
  // If video file processing is needed, it should be implemented separately
  throw new Error('Video file analysis not implemented in OpenRouter-only mode');
}

/**
 * Process uploaded file and generate complete quiz (matches create-deck flow)
 */
async function processFileAndGenerateQuiz(filePath, sourceType, logs = []) {
  try {
    const fileName = path.basename(filePath);
    const fileSize = (await fs.stat(filePath)).size;
    
    // Step 1: File taken
    addLog(logs, `📁 Step 1: File taken | ${sourceType}`);
    addLog(logs, `✅ Step 1 Completed! File taken: ${fileName} | ${(fileSize / 1024).toFixed(2)} KB`, true);
    
    // Step 2: Extract content
    addLog(logs, `🔄 Step 2: Extracting content`);
    let markdownContent = '';
    let originalContent = '';
    
    if (sourceType === 'pdf') {
      addLog(logs, `⏳ Extracting text from PDF...`, true);
      const pdfStartTime = Date.now();
      originalContent = await extractTextFromPDF(filePath);
      const pdfTime = ((Date.now() - pdfStartTime) / 1000).toFixed(2);
      addLog(logs, `✅ PDF text extracted (${pdfTime}s)`, true);
      // Convert to Markdown (simple conversion)
      markdownContent = `# ${fileName.replace(/\.pdf$/i, '')}\n\n${originalContent}`;
    } else if (sourceType === 'srt' || sourceType === 'txt') {
      addLog(logs, `⏳ Extracting text from ${sourceType.toUpperCase()} file...`, true);
      const srtStartTime = Date.now();
      originalContent = await extractTextFromSRT(filePath);
      const srtTime = ((Date.now() - srtStartTime) / 1000).toFixed(2);
      addLog(logs, `✅ ${sourceType.toUpperCase()} text extracted (${srtTime}s)`, true);
      markdownContent = originalContent; // SRT/TXT can be used as-is
    } else {
      throw new Error(`Unsupported file type: ${sourceType}`);
    }
    
    if (!markdownContent || markdownContent.trim().length === 0) {
      throw new Error('No content extracted from file');
    }
    
    const wordCount = markdownContent.split(/\s+/).filter(w => w.length > 0).length;
    addLog(logs, `✅ Step 2 Completed! Extracted content: ${markdownContent.length} characters = ${wordCount} words`, true);
    
    // Step 3: Convert to MD (already done, but log it)
    addLog(logs, `🔄 Step 3: Converting to md`);
    addLog(logs, `✅ Step 3 Completed! ${markdownContent.length} characters = ${wordCount} words`, true);
    
    // Step 4: Clean content and send to AI
    addLog(logs, `🤖 Step 4: Sending to AI...`);
    const sourceTypeLabel = sourceType === 'pdf' ? 'PDF file' : 
                           sourceType === 'srt' ? 'SRT subtitle file' :
                           sourceType === 'txt' ? 'text file' : sourceType;
    addLog(logs, `${sourceTypeLabel} detected - AI is cleaning and preparing questions.`, true);
    
    const cleanedContent = await cleanContentWithAI(markdownContent, sourceType, logs);
    
    // Single AI call to generate complete quiz
    const quizResult = await generateCompleteQuizFromContent(cleanedContent, sourceType, logs);
    
    const responseWordCount = quizResult.rawResponse.split(/\s+/).filter(w => w.length > 0).length;
    addLog(logs, `AI response received. (${quizResult.rawResponse.length} characters = ${responseWordCount} words = ${quizResult.questions.length} Questions)`, true);
    addLog(logs, `✅ Step 4 Completed! Total: ${quizResult.questions.length} questions added`, true);
    
    // Step 5: Generate images
    addLog(logs, `💾 Step 5: Generating images for ${quizResult.questions.length} questions`);
    const imageLogs = [];
    const batchSize = 10;
    let imagesGenerated = 0;
    
    for (let i = 0; i < quizResult.questions.length; i += batchSize) {
      const batch = quizResult.questions.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const batchStart = i + 1;
      const batchEnd = Math.min(i + batchSize, quizResult.questions.length);
      
      addLog(logs, `Generating Images; Batch ${batchNumber}: questions ${batchStart}-${batchEnd} (${batch.length} questions)`, true);
      
      for (let j = 0; j < batch.length; j++) {
        const questionIndex = i + j;
        try {
          // Add delay between image generations to avoid rate limits
          if (questionIndex > 0) {
            await delay(500);
          }
          
          const question = batch[j];
          const imageResult = await generateQuestionImage(question.questionText, question.options);
          quizResult.questions[questionIndex].imageUrl = imageResult.imageUrl;
          imagesGenerated++;
          imageLogs.push(`✓ Generated image for question ${questionIndex + 1}/${quizResult.questions.length}`);
        } catch (error) {
          console.warn(`⚠ Failed to generate image for question ${questionIndex + 1}: ${error.message}`);
          quizResult.questions[questionIndex].imageUrl = null;
          imageLogs.push(`⚠ Failed to generate image for question ${questionIndex + 1}: ${error.message}`);
        }
      }
    }
    
    addLog(logs, `✅ Step 5 Completed! Total: ${imagesGenerated} images added`, true);
    
    // Step 6: Completed
    addLog(logs, `✅ All Steps Completed! | Source: ${wordCount} words | AI Response: ${responseWordCount} words = ${quizResult.questions.length} Questions Added`);
    
    return {
      title: quizResult.title,
      description: quizResult.description,
      level: quizResult.level,
      skill: quizResult.skill,
      task: quizResult.task,
      detectedLevel: quizResult.level,
      questions: quizResult.questions,
      cleanedContent: cleanedContent,
      originalContent: originalContent.substring(0, 500), // First 500 chars for preview
      markdownContent: markdownContent.substring(0, 500), // First 500 chars for preview
      aiPrompt: quizResult.prompt,
      aiResponse: quizResult.rawResponse,
      imageLogs: imageLogs,
      reasoning: quizResult.reasoning,
      logs: logs,
      sourceSummary: {
        fileName: fileName,
        fileSize: fileSize,
        sourceType: sourceType,
        wordCount: wordCount
      }
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Process YouTube URL and generate complete quiz (matches create-deck flow)
 */
async function processYouTubeAndGenerateQuiz(videoUrl, logs = []) {
  try {
    // Step 1: URL taken
    addLog(logs, `📁 Step 1: URL taken | youtube`);
    addLog(logs, `✅ Step 1 Completed! URL taken: ${videoUrl}`, true);
    
    // Step 2: Extract YouTube transcript
    addLog(logs, `🔄 Step 2: Extracting content`);
    addLog(logs, `⏳ Extracting YouTube transcript...`, true);
    const transcriptStartTime = Date.now();
    const videoData = await extractYouTubeTranscript(videoUrl);
    const transcriptTime = ((Date.now() - transcriptStartTime) / 1000).toFixed(2);
    addLog(logs, `✅ Step 2 Completed! Extracted YouTube video content (${transcriptTime}s)`, true);
    
    // Step 3: Convert to Markdown
    addLog(logs, `🔄 Step 3: Converting to md`);
    const markdownContent = `# ${videoData.title || 'YouTube Video'}\n\n${videoData.description || ''}\n\n${videoData.transcript}`;
    
    if (!markdownContent || markdownContent.trim().length === 0) {
      throw new Error('No content extracted from YouTube video. Please ensure the video has captions enabled.');
    }
    
    const wordCount = markdownContent.split(/\s+/).filter(w => w.length > 0).length;
    addLog(logs, `✅ Step 3 Completed! ${markdownContent.length} characters = ${wordCount} words`, true);
    
    // Step 4: Clean content and send to AI
    addLog(logs, `🤖 Step 4: Sending to AI...`);
    addLog(logs, `YouTube transcript detected - AI is cleaning and preparing questions.`, true);
    
    const cleanedContent = await cleanContentWithAI(markdownContent, 'youtube');
    
    // Single AI call to generate complete quiz
    const quizResult = await generateCompleteQuizFromContent(cleanedContent, 'youtube', logs);
    
    const responseWordCount = quizResult.rawResponse.split(/\s+/).filter(w => w.length > 0).length;
    addLog(logs, `AI response received. (${quizResult.rawResponse.length} characters = ${responseWordCount} words = ${quizResult.questions.length} Questions)`, true);
    addLog(logs, `✅ Step 4 Completed! Total: ${quizResult.questions.length} questions added`, true);
    
    // Step 5: Generate images
    addLog(logs, `💾 Step 5: Generating images for ${quizResult.questions.length} questions`);
    const imageLogs = [];
    const batchSize = 10;
    let imagesGenerated = 0;
    
    for (let i = 0; i < quizResult.questions.length; i += batchSize) {
      const batch = quizResult.questions.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const batchStart = i + 1;
      const batchEnd = Math.min(i + batchSize, quizResult.questions.length);
      
      addLog(logs, `Generating Images; Batch ${batchNumber}: questions ${batchStart}-${batchEnd} (${batch.length} questions)`, true);
      
      for (let j = 0; j < batch.length; j++) {
        const questionIndex = i + j;
        try {
          if (questionIndex > 0) {
            await delay(500);
          }
          
          const question = batch[j];
          const imageResult = await generateQuestionImage(question.questionText, question.options);
          quizResult.questions[questionIndex].imageUrl = imageResult.imageUrl;
          imagesGenerated++;
          imageLogs.push(`✓ Generated image for question ${questionIndex + 1}/${quizResult.questions.length}`);
        } catch (error) {
          console.warn(`⚠ Failed to generate image for question ${questionIndex + 1}: ${error.message}`);
          quizResult.questions[questionIndex].imageUrl = null;
          imageLogs.push(`⚠ Failed to generate image for question ${questionIndex + 1}: ${error.message}`);
        }
      }
    }
    
    addLog(logs, `✅ Step 5 Completed! Total: ${imagesGenerated} images added`, true);
    
    // Step 6: Completed
    addLog(logs, `✅ All Steps Completed! | Source: ${wordCount} words | AI Response: ${responseWordCount} words = ${quizResult.questions.length} Questions Added`);
    
    return {
      title: quizResult.title,
      description: quizResult.description,
      level: quizResult.level,
      skill: quizResult.skill,
      task: quizResult.task,
      detectedLevel: quizResult.level,
      questions: quizResult.questions,
      cleanedContent: cleanedContent,
      originalContent: markdownContent.substring(0, 500), // First 500 chars for preview
      markdownContent: markdownContent.substring(0, 500), // First 500 chars for preview
      videoTitle: videoData.title,
      aiPrompt: quizResult.prompt,
      aiResponse: quizResult.rawResponse,
      imageLogs: imageLogs,
      reasoning: quizResult.reasoning,
      logs: logs,
      sourceSummary: {
        url: videoUrl,
        videoTitle: videoData.title,
        wordCount: wordCount
      }
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Process webpage URL and generate complete quiz (matches create-deck flow)
 */
async function processWebpageAndGenerateQuiz(webpageUrl, logs = []) {
  try {
    // Step 1: URL taken
    addLog(logs, `📁 Step 1: URL taken | webpage`);
    addLog(logs, `✅ Step 1 Completed! URL taken: ${webpageUrl}`, true);
    
    // Step 2: Convert webpage to Markdown using Firecrawl
    addLog(logs, `🔄 Step 2: Extracting content`);
    addLog(logs, `⏳ Calling Firecrawl API to scrape webpage...`, true);
    
    const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
    
    if (!FIRECRAWL_API_KEY) {
      throw new Error('Firecrawl API key is not configured');
    }

    const firecrawlStartTime = Date.now();
    const response = await axios.post(
      'https://api.firecrawl.dev/v0/scrape',
      {
        url: webpageUrl.trim(),
        formats: ['markdown'],
        onlyMainContent: true
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
        },
        timeout: 60000
      }
    );
    const firecrawlTime = ((Date.now() - firecrawlStartTime) / 1000).toFixed(2);
    addLog(logs, `✅ Firecrawl API responded in ${firecrawlTime}s`, true);

    const firecrawlData = response.data?.data || response.data;
    const markdownContent = firecrawlData?.markdown || response.data?.markdown || '';
    const pageTitle = firecrawlData?.metadata?.title || firecrawlData?.title || '';
    
    if (!markdownContent || markdownContent.trim() === '') {
      throw new Error('Failed to extract content from webpage');
    }
    
    const wordCount = markdownContent.split(/\s+/).filter(w => w.length > 0).length;
    addLog(logs, `✅ Step 2 Completed! Extracted webpage content: ${markdownContent.length} characters = ${wordCount} words`, true);
    
    // Step 3: Convert to MD (already done, but log it)
    addLog(logs, `🔄 Step 3: Converting to md`);
    addLog(logs, `✅ Step 3 Completed! ${markdownContent.length} characters = ${wordCount} words`, true);
    
    // Step 4: Clean content and send to AI
    addLog(logs, `🤖 Step 4: Sending to AI...`);
    addLog(logs, `Webpage detected - AI is cleaning and preparing questions.`, true);
    
    const cleanedContent = await cleanContentWithAI(markdownContent, 'webpage');
    
    // Single AI call to generate complete quiz
    const quizResult = await generateCompleteQuizFromContent(cleanedContent, 'webpage', logs);
    
    const responseWordCount = quizResult.rawResponse.split(/\s+/).filter(w => w.length > 0).length;
    addLog(logs, `AI response received. (${quizResult.rawResponse.length} characters = ${responseWordCount} words = ${quizResult.questions.length} Questions)`, true);
    addLog(logs, `✅ Step 4 Completed! Total: ${quizResult.questions.length} questions added`, true);
    
    // Step 5: Generate images
    addLog(logs, `💾 Step 5: Generating images for ${quizResult.questions.length} questions`);
    const imageLogs = [];
    const batchSize = 10;
    let imagesGenerated = 0;
    
    for (let i = 0; i < quizResult.questions.length; i += batchSize) {
      const batch = quizResult.questions.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const batchStart = i + 1;
      const batchEnd = Math.min(i + batchSize, quizResult.questions.length);
      
      addLog(logs, `Generating Images; Batch ${batchNumber}: questions ${batchStart}-${batchEnd} (${batch.length} questions)`, true);
      
      for (let j = 0; j < batch.length; j++) {
        const questionIndex = i + j;
        try {
          if (questionIndex > 0) {
            await delay(500);
          }
          
          const question = batch[j];
          const imageResult = await generateQuestionImage(question.questionText, question.options);
          quizResult.questions[questionIndex].imageUrl = imageResult.imageUrl;
          imagesGenerated++;
          imageLogs.push(`✓ Generated image for question ${questionIndex + 1}/${quizResult.questions.length}`);
        } catch (error) {
          console.warn(`⚠ Failed to generate image for question ${questionIndex + 1}: ${error.message}`);
          quizResult.questions[questionIndex].imageUrl = null;
          imageLogs.push(`⚠ Failed to generate image for question ${questionIndex + 1}: ${error.message}`);
        }
      }
    }
    
    addLog(logs, `✅ Step 5 Completed! Total: ${imagesGenerated} images added`, true);
    
    // Step 6: Completed
    addLog(logs, `✅ All Steps Completed! | Source: ${wordCount} words | AI Response: ${responseWordCount} words = ${quizResult.questions.length} Questions Added`);
    
    return {
      title: quizResult.title,
      description: quizResult.description,
      level: quizResult.level,
      skill: quizResult.skill,
      task: quizResult.task,
      detectedLevel: quizResult.level,
      questions: quizResult.questions,
      cleanedContent: cleanedContent,
      originalContent: markdownContent.substring(0, 500), // First 500 chars for preview
      markdownContent: markdownContent.substring(0, 500), // First 500 chars for preview
      pageTitle: pageTitle,
      aiPrompt: quizResult.prompt,
      aiResponse: quizResult.rawResponse,
      imageLogs: imageLogs,
      reasoning: quizResult.reasoning,
      logs: logs,
      sourceSummary: {
        url: webpageUrl,
        pageTitle: pageTitle,
        wordCount: wordCount
      }
    };
  } catch (error) {
    throw error;
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
    
    // This would need to be updated to use the new single-call approach
    throw new Error('Video file processing not yet implemented with single-call approach');
  } catch (error) {
    throw error;
  }
}

module.exports = {
  processFileAndGenerateQuiz,
  processVideoFileAndGenerateQuiz,
  processYouTubeAndGenerateQuiz,
  processWebpageAndGenerateQuiz,
  extractTextFromPDF,
  extractTextFromSRT,
  extractYouTubeTranscript,
  analyzeVideoFileWithGemini,
  generateCompleteQuizFromContent
};
