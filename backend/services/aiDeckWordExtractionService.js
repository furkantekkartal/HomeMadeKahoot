const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const Word = require('../models/Word');
const { extractTextFromPDF, extractTextFromSRT, extractYouTubeTranscript, analyzeVideoFileWithGemini } = require('./enhancedAiQuizService');

const execAsync = promisify(exec);
// Try to require xlsx, but handle if not installed
let XLSX = null;
try {
  XLSX = require('xlsx');
} catch (error) {
  console.warn('xlsx package not found. Excel file processing will not be available.');
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';

// Helper to get working model
const getWorkingModel = async () => {
  if (!genAI) return null;
  try {
    return genAI.getGenerativeModel({ model: GEMINI_MODEL });
  } catch (error) {
    console.warn('Model not available:', error.message);
    return null;
  }
};

/**
 * Extract words from content using Gemini AI (for YouTube videos)
 * This matches the user's workflow: transcript -> Gemini -> words
 */
async function extractWordsFromContentWithGemini(content, sourceName, logs = []) {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const stepStartTime = Date.now();
  logs.push('🔄 Step 1: Starting word extraction from content using Gemini...');
  logs.push(`⏱️ Content length: ${content.length} characters`);

  // Truncate content if too long (Gemini has token limits)
  const contentToProcess = content.substring(0, 100000); // ~100k chars should be safe
  
  const prompt = `Extract all words, phrases, idioms, and phrasal verbs from this YouTube video transcript. Return ONLY a JSON array of strings, nothing else. Each item should be a single word, phrase, idiom, or phrasal verb.

IMPORTANT: Return a complete, valid JSON array. The array must be properly closed with ].

Example format:
["word1", "phrase example", "idiom example", "phrasal verb"]

Transcript:
${contentToProcess}`;

  logs.push('📤 Preparing to send transcript to Gemini...');
  logs.push(`⏳ Waiting for Gemini response...`);

  try {
    const model = await getWorkingModel();
    if (!model) {
      throw new Error('Failed to initialize Gemini model');
    }

    const aiRequestStart = Date.now();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    const aiRequestTime = ((Date.now() - aiRequestStart) / 1000).toFixed(2);
    logs.push(`✅ Gemini responded in ${aiRequestTime} seconds`);

    if (!text) {
      throw new Error('No words extracted from Gemini');
    }

    logs.push('📝 Processing Gemini response...');
    logs.push(`📏 Response length: ${text.length} characters`);

    // Extract JSON array from response
    logs.push('🔍 Extracting JSON array from response...');
    let jsonMatch = text.match(/\[[\s\S]*\]/);
    
    if (!jsonMatch) {
      // Try to find incomplete JSON and complete it
      const incompleteMatch = text.match(/\[[\s\S]*/);
      if (incompleteMatch) {
        logs.push('⚠️ Found incomplete JSON, attempting to fix...');
        jsonMatch = [incompleteMatch[0] + ']'];
      } else {
        throw new Error('No JSON array found in Gemini response');
      }
    }

    const jsonString = jsonMatch[0];
    let words = [];
    
    try {
      words = JSON.parse(jsonString);
      if (!Array.isArray(words)) {
        throw new Error('Response is not a JSON array');
      }
    } catch (parseError) {
      logs.push(`⚠️ JSON parse error: ${parseError.message}`);
      logs.push(`📄 Attempting to extract words manually...`);
      
      // Fallback: try to extract quoted strings
      const quotedMatches = text.match(/"([^"]+)"/g);
      if (quotedMatches) {
        words = quotedMatches.map(match => match.replace(/^"|"$/g, ''));
        logs.push(`✅ Extracted ${words.length} words using fallback method`);
      } else {
        throw new Error(`Failed to parse JSON: ${parseError.message}`);
      }
    }

    const stepTime = ((Date.now() - stepStartTime) / 1000).toFixed(2);
    logs.push(`✅ Step 1 completed in ${stepTime} seconds`);
    logs.push(`📊 Extracted ${words.length} words/phrases from transcript`);

    // Filter out empty strings and normalize
    words = words
      .map(word => word.trim())
      .filter(word => word.length > 0)
      .filter((word, index, self) => self.indexOf(word) === index); // Remove duplicates

    logs.push(`📊 After filtering: ${words.length} unique words/phrases`);

    return words;
  } catch (error) {
    const stepTime = ((Date.now() - stepStartTime) / 1000).toFixed(2);
    logs.push(`✗ Step 1 failed after ${stepTime} seconds`);
    logs.push(`✗ Error: ${error.message}`);
    throw new Error(`Failed to extract words with Gemini: ${error.message}`);
  }
}

// Step 1: Extract words from content using AI
async function extractWordsFromContent(content, sourceName, logs = []) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  const stepStartTime = Date.now();
  logs.push('🔄 Step 1: Starting word extraction from content...');
  logs.push(`⏱️ Content length: ${content.length} characters`);

  // Calculate content size and adjust max_tokens accordingly
  const contentToProcess = content.substring(0, 50000);
  const estimatedWords = Math.ceil(contentToProcess.length / 5); // Rough estimate: 5 chars per word
  // Increase max_tokens based on content size (minimum 8000, up to 32000)
  // For large files, we need more tokens for the response
  const maxTokens = Math.min(Math.max(estimatedWords * 2, 8000), 32000);
  
  logs.push(`📊 Estimated words: ~${estimatedWords}, Setting max_tokens: ${maxTokens}`);

  const prompt = `Extract all words, phrases, idioms, and phrasal verbs from this text. Return ONLY a JSON array of strings, nothing else. Each item should be a single word, phrase, idiom, or phrasal verb.

IMPORTANT: If the response is too long, ensure the JSON array is complete and properly closed with ].

Example format:
["word1", "phrase example", "idiom example", "phrasal verb"]

Text:
${contentToProcess}`;

  logs.push('📤 Preparing to send content to AI...');
  logs.push('--Prompt1:');
  logs.push(prompt.substring(0, 500) + (prompt.length > 500 ? '...' : ''));
  logs.push(`⏳ Waiting for AI response (max_tokens: ${maxTokens})...`);

  try {
    const aiRequestStart = Date.now();
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a word extraction tool. Return only a JSON array of words/phrases, no explanations. Always return a complete, valid JSON array ending with ].'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: maxTokens
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

    const aiRequestTime = ((Date.now() - aiRequestStart) / 1000).toFixed(2);
    logs.push(`✅ AI responded in ${aiRequestTime} seconds`);

    const text = response.data.choices[0]?.message?.content?.trim();
    if (!text) {
      throw new Error('No words extracted');
    }

    logs.push('📝 Processing AI response...');
    logs.push(`📏 Response length: ${text.length} characters`);
    
    // Check if response might be truncated
    const isTruncated = response.data.choices[0]?.finish_reason === 'length';
    if (isTruncated) {
      logs.push('⚠️ WARNING: Response was truncated due to token limit. Attempting to recover...');
    }
    
    // Log AI response (first 30 and last 30 words)
    const words = text.split(/\s+/);
    const first30 = words.slice(0, 30).join(' ');
    const last30 = words.slice(-30).join(' ');
    logs.push('--Response preview:');
    logs.push(`"${first30} ... ${last30}"`);

    // Extract JSON array from response - try multiple strategies
    logs.push('🔍 Extracting JSON array from response...');
    let jsonMatch = text.match(/\[[\s\S]*\]/);
    
    // If no match and response might be truncated, try to find incomplete JSON
    if (!jsonMatch && isTruncated) {
      // Try to find the start of JSON array and complete it
      const arrayStart = text.indexOf('[');
      if (arrayStart !== -1) {
        // Extract from [ to end, then try to close it
        const partialJson = text.substring(arrayStart);
        // Try to find the last complete entry and close the array
        const lastQuote = partialJson.lastIndexOf('"');
        if (lastQuote !== -1) {
          // Find the last comma before the last quote
          const beforeLastQuote = partialJson.substring(0, lastQuote);
          const lastComma = beforeLastQuote.lastIndexOf(',');
          if (lastComma !== -1) {
            // Extract up to the last complete entry
            const completePart = partialJson.substring(0, lastComma + 1);
            const lastEntry = partialJson.substring(lastComma + 1, lastQuote + 1);
            // Try to parse what we have
            try {
              const testJson = completePart + lastEntry + ']';
              JSON.parse(testJson); // Test if it's valid
              jsonMatch = [testJson];
              logs.push('✅ Recovered truncated JSON response');
            } catch (e) {
              // If that doesn't work, just take what we have and close it
              jsonMatch = [partialJson.substring(0, lastQuote + 1) + ']'];
              logs.push('⚠️ Attempted to recover JSON, but may be incomplete');
            }
          }
        }
      }
    }
    
    if (!jsonMatch) {
      logs.push('❌ Could not find JSON array in response');
      logs.push(`Response preview: ${text.substring(0, 500)}...`);
      throw new Error('Invalid response format: No JSON array found');
    }

    logs.push('📊 Parsing extracted words...');
    let extractedWords;
    try {
      extractedWords = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      logs.push(`❌ JSON parse error: ${parseError.message}`);
      logs.push(`JSON preview: ${jsonMatch[0].substring(0, 500)}...`);
      throw new Error(`Invalid JSON format: ${parseError.message}`);
    }
    const filteredWords = extractedWords.filter(w => w && typeof w === 'string' && w.trim().length > 0);
    
    const stepTime = ((Date.now() - stepStartTime) / 1000).toFixed(2);
    logs.push(`✅ Step 1 completed in ${stepTime} seconds`);
    logs.push(`📊 Extracted ${filteredWords.length} unique words/phrases`);
    
    return filteredWords;
  } catch (error) {
    const stepTime = ((Date.now() - stepStartTime) / 1000).toFixed(2);
    console.error('Error extracting words:', error);
    logs.push(`✗ Step 1 failed after ${stepTime} seconds: ${error.message}`);
    throw new Error('Failed to extract words: ' + error.message);
  }
}

// Step 2-3: Check database and remove duplicates
async function checkAndRemoveDuplicates(words, logs = []) {
  const stepStartTime = Date.now();
  logs.push('🔄 Step 2-3: Starting duplicate check in database...');
  logs.push(`📊 Checking ${words.length} words against database...`);
  
  logs.push('⏳ Processing unique words...');
  const uniqueWords = [...new Set(words.map(w => w.trim()).filter(w => w.length > 0))];
  logs.push(`📝 Found ${uniqueWords.length} unique words after deduplication`);
  
  logs.push('⏳ Querying database for existing words...');
  const dbQueryStart = Date.now();
  // Find existing words (case-insensitive)
  const existingWords = await Word.find({
    $or: uniqueWords.map(w => ({
      englishWord: { $regex: new RegExp(`^${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    }))
  });
  const dbQueryTime = ((Date.now() - dbQueryStart) / 1000).toFixed(2);
  logs.push(`✅ Database query completed in ${dbQueryTime} seconds`);
  logs.push(`📊 Found ${existingWords.length} existing words in database`);

  logs.push('⏳ Filtering new words...');
  const existingWordSet = new Set(existingWords.map(w => w.englishWord.toLowerCase()));
  const newWords = uniqueWords.filter(w => !existingWordSet.has(w.toLowerCase()));
  
  const stepTime = ((Date.now() - stepStartTime) / 1000).toFixed(2);
  logs.push(`✅ Step 2-3 completed in ${stepTime} seconds`);
  logs.push(`✓ ${existingWords.length} words already exist in database`);
  logs.push(`📝 ${newWords.length} new words to add`);

  return {
    existingWords: existingWords.map(w => w.englishWord),
    newWords: newWords,
    existingWordIds: existingWords.map(w => w._id.toString())
  };
}

// Step 4-6: Get sample data and send to AI for filling columns
async function fillWordColumns(words, sourceName, wordCount, categoryTag, logs = [], batchIndex = 0) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  // Get sample data from database
  const sampleWords = await Word.find().limit(5).select('englishWord wordType turkishMeaning category1 category2 category3 englishLevel sampleSentenceEn sampleSentenceTr');
  
  // Create CSV sample (replace commas with semicolons to avoid CSV format issues)
  const csvSample = sampleWords.map(w => ({
    englishWord: (w.englishWord || '').toString().replace(/,/g, ';'),
    wordType: (w.wordType || '').toString().replace(/,/g, ';'),
    turkishMeaning: (w.turkishMeaning || '').toString().replace(/,/g, ';'),
    category1: (w.category1 || '').toString().replace(/,/g, ';'),
    category2: (w.category2 || '').toString().replace(/,/g, ';'),
    category3: (w.category3 || '').toString().replace(/,/g, ';'),
    englishLevel: (w.englishLevel || '').toString().replace(/,/g, ';'),
    sampleSentenceEn: (w.sampleSentenceEn || '').toString().replace(/,/g, ';'),
    sampleSentenceTr: (w.sampleSentenceTr || '').toString().replace(/,/g, ';')
  }));

  const prompt = `Fill in the database columns for these words. Use the sample data below as reference for format and style.

Sample data (CSV format - note: commas in content are replaced with semicolons):
${csvSample.map(w => Object.values(w).join(',')).join('\n')}

Words to process:
${words.slice(0, 100).join(', ')}

Return ONLY a JSON array of objects with these fields:
- englishWord (string)
- wordType (string, e.g., "Noun", "Verb", "Adjective", "Phrase", "Idiom", "Phrasal Verb")
- turkishMeaning (string)
- category1 (string, e.g., "verb", "noun", "adjective", "phrase", "idiom", "phrasal verb")
- category2 (string, optional)
- category3 (string, set to: "${categoryTag}")
- englishLevel (string, one of: "A1", "A2", "B1", "B2", "C1", "C2")
- sampleSentenceEn (string, example sentence in English)
- sampleSentenceTr (string, example sentence in Turkish)

Return only the JSON array, no explanations.`;

  const promptNum = batchIndex + 1;
  const stepStartTime = Date.now();
  logs.push(`🔄 Step 4-6 (Batch ${promptNum}): Starting column filling for ${words.length} words...`);
  logs.push(`📤 Preparing to send cleaned list to AI...`);
  logs.push(`--Prompt${promptNum}:`);
  logs.push(prompt.substring(0, 500) + (prompt.length > 500 ? '...' : ''));
  logs.push('⏳ Waiting for AI to fill word columns...');

  try {
    const aiRequestStart = Date.now();
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a database filling tool. Return only JSON arrays, no explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 16000  // Increased for larger word lists
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

    const aiRequestTime = ((Date.now() - aiRequestStart) / 1000).toFixed(2);
    logs.push(`✅ AI responded in ${aiRequestTime} seconds`);
    
    const text = response.data.choices[0]?.message?.content?.trim();
    
    logs.push('📝 Processing AI response...');
    logs.push(`📏 Response length: ${text.length} characters`);
    
    // Check if response might be truncated
    const isTruncated = response.data.choices[0]?.finish_reason === 'length';
    if (isTruncated) {
      logs.push('⚠️ WARNING: Response was truncated due to token limit. Attempting to recover...');
    }
    
    // Log AI response (first 30 and last 30 words)
    const responseWords = text.split(/\s+/);
    const first30 = responseWords.slice(0, 30).join(' ');
    const last30 = responseWords.slice(-30).join(' ');
    logs.push('--Response preview:');
    logs.push(`"${first30} ... ${last30}"`);

    logs.push('🔍 Extracting JSON data from response...');
    let jsonMatch = text.match(/\[[\s\S]*\]/);
    
    // If no match and response might be truncated, try to recover
    if (!jsonMatch && isTruncated) {
      const arrayStart = text.indexOf('[');
      if (arrayStart !== -1) {
        const partialJson = text.substring(arrayStart);
        const lastQuote = partialJson.lastIndexOf('"');
        if (lastQuote !== -1) {
          const beforeLastQuote = partialJson.substring(0, lastQuote);
          const lastComma = beforeLastQuote.lastIndexOf(',');
          if (lastComma !== -1) {
            const completePart = partialJson.substring(0, lastComma + 1);
            const lastEntry = partialJson.substring(lastComma + 1, lastQuote + 1);
            try {
              const testJson = completePart + lastEntry + ']';
              JSON.parse(testJson);
              jsonMatch = [testJson];
              logs.push('✅ Recovered truncated JSON response');
            } catch (e) {
              jsonMatch = [partialJson.substring(0, lastQuote + 1) + ']'];
              logs.push('⚠️ Attempted to recover JSON, but may be incomplete');
            }
          }
        }
      }
    }
    
    if (!jsonMatch) {
      logs.push('❌ Could not find JSON array in response');
      logs.push(`Response preview: ${text.substring(0, 500)}...`);
      throw new Error('Invalid response format: No JSON array found');
    }

    logs.push('📊 Parsing word data...');
    let wordData;
    try {
      wordData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      logs.push(`❌ JSON parse error: ${parseError.message}`);
      logs.push(`JSON preview: ${jsonMatch[0].substring(0, 500)}...`);
      throw new Error(`Invalid JSON format: ${parseError.message}`);
    }
    
    const stepTime = ((Date.now() - stepStartTime) / 1000).toFixed(2);
    logs.push(`✅ Step 4-6 (Batch ${promptNum}) completed in ${stepTime} seconds`);
    logs.push(`📊 Processed ${wordData.length} words with column data`);
    
    return wordData;
  } catch (error) {
    console.error('Error filling word columns:', error);
    logs.push(`✗ Error filling word columns: ${error.message}`);
    throw new Error('Failed to fill word columns: ' + error.message);
  }
}

// Process Excel file
async function processExcelFile(filePath) {
  if (!XLSX) {
    throw new Error('Excel file processing requires xlsx package. Please install it: npm install xlsx');
  }
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    // Convert to CSV
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    // Replace commas with semicolons to avoid CSV format issues
    const text = csv.replace(/,/g, ';');
    return text;
  } catch (error) {
    throw new Error('Failed to process Excel file: ' + error.message);
  }
}

// Main function: Process file and extract/add words
async function processFileAndExtractWords(filePath, fileName, logs = []) {
  const startTime = Date.now();
  let content = '';
  const fileExt = path.extname(fileName).toLowerCase();
  
  // If logs array is not provided, create a new one
  if (!Array.isArray(logs)) {
    logs = [];
  }

  try {
    logs.push('📁 File ready for processing');
    logs.push(`📄 File type detected: ${fileExt.toUpperCase()}`);
    logs.push('⏳ Reading file from disk...');
    
    // Check if file exists and get its size
    try {
      const stats = await fs.stat(filePath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      logs.push(`📊 File size: ${fileSizeMB} MB`);
      if (parseFloat(fileSizeMB) > 10) {
        logs.push('⚠️ Large file detected - processing may take longer');
      }
    } catch (statError) {
      logs.push('⚠️ Could not read file stats');
    }
    
    // Extract content based on file type
    const conversionStart = Date.now();
    if (fileExt === '.pdf') {
      logs.push('🔄 Starting file conversion...');
      logs.push('📄 File type: PDF');
      logs.push('⏳ Initializing PDF parser...');
      logs.push('⏳ Extracting text from PDF pages (this may take a moment for large files)...');
      content = await extractTextFromPDF(filePath);
      const conversionTime = ((Date.now() - conversionStart) / 1000).toFixed(2);
      logs.push(`✅ PDF conversion completed in ${conversionTime} seconds`);
      logs.push(`📊 Extracted ${content.length.toLocaleString()} characters from PDF`);
      if (content.length > 50000) {
        logs.push(`ℹ️ Large content detected - will process first 50,000 characters for word extraction`);
      }
    } else if (fileExt === '.srt') {
      logs.push('🔄 Starting file conversion...');
      logs.push('📄 File type: SRT (Subtitle)');
      logs.push('⏳ Reading SRT file...');
      logs.push('⏳ Parsing subtitle timestamps and text...');
      content = await extractTextFromSRT(filePath);
      const conversionTime = ((Date.now() - conversionStart) / 1000).toFixed(2);
      logs.push(`✅ SRT conversion completed in ${conversionTime} seconds`);
      logs.push(`📊 Extracted ${content.length.toLocaleString()} characters from SRT`);
      const subtitleCount = content.split('\n\n').filter(s => s.trim()).length;
      logs.push(`📊 Estimated subtitle entries: ${subtitleCount}`);
    } else if (fileExt === '.xlsx' || fileExt === '.xls') {
      logs.push('🔄 Starting file conversion...');
      logs.push('📄 File type: Excel');
      logs.push('⏳ Loading Excel workbook...');
      logs.push('⏳ Reading worksheet data...');
      logs.push('⏳ Converting cells to CSV format...');
      content = await processExcelFile(filePath);
      const conversionTime = ((Date.now() - conversionStart) / 1000).toFixed(2);
      logs.push(`✅ Excel conversion completed in ${conversionTime} seconds`);
      logs.push(`📊 Extracted ${content.length.toLocaleString()} characters from Excel`);
      logs.push('ℹ️ Commas replaced with semicolons to avoid CSV format issues');
    } else {
      throw new Error(`Unsupported file type: ${fileExt}`);
    }

    if (!content || content.trim().length === 0) {
      throw new Error('No content extracted from file');
    }
    logs.push('');

    // Step 1: Extract words
    const extractedWords = await extractWordsFromContent(content, fileName, logs);
    
    // Step 2-3: Check duplicates
    const { existingWords, newWords, existingWordIds } = await checkAndRemoveDuplicates(extractedWords, logs);
    
    // Step 4-6: Fill columns for new words
    let newWordData = [];
    let allColumnsFilled = true;
    let categoryTag = '';
    let wordIds = [...existingWordIds];
    let firstWordSample = null;
    let lastWordSample = null;

    if (newWords.length > 0) {
      logs.push(`🔄 Step 4-6: Starting column filling for ${newWords.length} new words...`);
      // Process in batches if more than 100 words
      const batches = [];
      for (let i = 0; i < newWords.length; i += 100) {
        batches.push(newWords.slice(i, i + 100));
      }
      logs.push(`📦 Split into ${batches.length} batch(es) for processing`);

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        logs.push(`⏳ Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} words)...`);
        const baseName = path.basename(fileName, fileExt);
        const partTag = newWords.length > 50 && batches.length > 1 
          ? `${baseName}-Part${batchIndex + 1}` 
          : baseName;
        
        const batchData = await fillWordColumns(batch, fileName, newWords.length, partTag, logs, batchIndex);
        newWordData = newWordData.concat(batchData);
        logs.push(`✅ Batch ${batchIndex + 1}/${batches.length} completed`);
        
        if (!categoryTag) categoryTag = partTag;
      }

      // Step 7: Add to database
      const dbUpdateStart = Date.now();
      logs.push('🔄 Step 7: Starting database update...');
      logs.push(`⏳ Preparing to add ${newWordData.length} words to database...`);
      let currentWordId = 1;
      
      // Get max wordId once
      logs.push('⏳ Getting next wordId from database...');
      const maxWord = await Word.findOne().sort({ wordId: -1 });
      if (maxWord) {
        currentWordId = maxWord.wordId + 1;
        logs.push(`📊 Next wordId: ${currentWordId}`);
      } else {
        logs.push('📊 Starting from wordId: 1 (first word in database)');
      }

      logs.push(`⏳ Saving ${newWordData.length} words to database...`);
      let savedCount = 0;
      for (let i = 0; i < newWordData.length; i++) {
        const wordData = newWordData[i];
        try {
          const word = new Word({
            wordId: currentWordId++,
            englishWord: wordData.englishWord,
            wordType: wordData.wordType || null,
            turkishMeaning: wordData.turkishMeaning || null,
            category1: wordData.category1 || null,
            category2: wordData.category2 || null,
            category3: wordData.category3 || null,
            englishLevel: wordData.englishLevel || null,
            sampleSentenceEn: wordData.sampleSentenceEn || null,
            sampleSentenceTr: wordData.sampleSentenceTr || null
          });

          await word.save();
          wordIds.push(word._id.toString());
          savedCount++;

          // Log progress every 10 words
          if ((i + 1) % 10 === 0 || i === newWordData.length - 1) {
            logs.push(`⏳ Progress: ${i + 1}/${newWordData.length} words saved...`);
          }

          // Store first and last word samples
          if (i === 0) {
            firstWordSample = {
              englishWord: word.englishWord,
              wordType: word.wordType,
              turkishMeaning: word.turkishMeaning,
              category1: word.category1,
              category2: word.category2,
              category3: word.category3,
              englishLevel: word.englishLevel,
              sampleSentenceEn: word.sampleSentenceEn,
              sampleSentenceTr: word.sampleSentenceTr
            };
          }
          if (i === newWordData.length - 1) {
            lastWordSample = {
              englishWord: word.englishWord,
              wordType: word.wordType,
              turkishMeaning: word.turkishMeaning,
              category1: word.category1,
              category2: word.category2,
              category3: word.category3,
              englishLevel: word.englishLevel,
              sampleSentenceEn: word.sampleSentenceEn,
              sampleSentenceTr: word.sampleSentenceTr
            };
          }

          // Check if all columns filled
          if (!wordData.wordType || !wordData.turkishMeaning || !wordData.englishLevel) {
            allColumnsFilled = false;
          }
        } catch (error) {
          console.error('Error saving word:', error);
          logs.push(`⚠️ Warning: Failed to save word "${wordData.englishWord}": ${error.message}`);
          allColumnsFilled = false;
        }
      }

      const dbUpdateTime = ((Date.now() - dbUpdateStart) / 1000).toFixed(2);
      logs.push(`✅ Step 7 completed in ${dbUpdateTime} seconds`);
      logs.push(`💾 Successfully saved ${savedCount} words to database`);
      logs.push('📊 Sample words added:');
      
      // Log sample words
      if (firstWordSample) {
        logs.push('--(First word and its filled up values):');
        logs.push(JSON.stringify(firstWordSample, null, 2));
      }
      if (lastWordSample && firstWordSample && lastWordSample.englishWord !== firstWordSample.englishWord) {
        logs.push('--(Last word and its filled up values):');
        logs.push(JSON.stringify(lastWordSample, null, 2));
      }
    }

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
    logs.push('');
    logs.push('═══════════════════════════════════════');
    logs.push(`✅ ALL STEPS COMPLETED IN ${processingTime} SECONDS`);
    logs.push(`📊 Summary:`);
    logs.push(`   - Total words extracted: ${extractedWords.length}`);
    logs.push(`   - Existing words: ${existingWords.length}`);
    logs.push(`   - New words added: ${newWordData.length}`);
    logs.push(`   - All columns filled: ${allColumnsFilled ? 'Yes ✓' : 'No ✗'}`);
    logs.push(`   - Category tag: ${categoryTag || 'N/A'}`);
    logs.push('═══════════════════════════════════════');

    return {
      totalWords: extractedWords.length,
      existingWords: existingWords.length,
      newWords: newWordData.length,
      allColumnsFilled,
      categoryTag,
      wordIds: wordIds,
      processingTime: parseFloat(processingTime),
      logs: logs
    };
  } catch (error) {
    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
    logs.push('');
    logs.push('═══════════════════════════════════════');
    logs.push(`✗ PROCESS FAILED AFTER ${processingTime} SECONDS`);
    logs.push(`✗ Error: ${error.message}`);
    logs.push('═══════════════════════════════════════');
    throw new Error('Failed to process file: ' + error.message);
  }
}

/**
 * Extract YouTube transcript using Python script (3rd party tool)
 * This function calls the Python script and reads the transcript file
 */
async function extractYouTubeTranscriptWithPython(videoUrl, logs = []) {
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
    
    logs.push(`📹 Extracted video ID: ${videoId}`);
    
    // Get video title using oEmbed API
    let videoTitle = '';
    try {
      const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
      const oEmbedResponse = await axios.get(oEmbedUrl);
      videoTitle = oEmbedResponse.data.title || '';
      logs.push(`📊 Video title: ${videoTitle || 'N/A'}`);
    } catch (oEmbedError) {
      console.warn('Could not fetch video title from oEmbed:', oEmbedError.message);
      videoTitle = `YouTube Video ${videoId}`;
    }
    
    // Prepare paths
    const scriptPath = path.join(__dirname, '..', 'scripts', 'transcript_all_languages.py');
    const outputDir = path.join(__dirname, '..', 'uploads');
    const outputFile = path.join(outputDir, `transcript_${videoId}_${Date.now()}.txt`);
    
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    logs.push(`🐍 Calling Python script: ${scriptPath}`);
    logs.push(`📝 Output file: ${outputFile}`);
    
    // Try different Python commands (python, python3, py)
    const pythonCommands = ['python', 'python3', 'py'];
    let pythonCommand = null;
    let stdout = '';
    let stderr = '';
    let execError = null;
    
    for (const cmd of pythonCommands) {
      try {
        const fullCommand = `${cmd} "${scriptPath}" "${videoId}" "${outputFile}"`;
        logs.push(`⏳ Trying: ${fullCommand}`);
        
        const result = await execAsync(fullCommand, {
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          timeout: 60000 // 60 second timeout
        });
        
        stdout = result.stdout || '';
        stderr = result.stderr || '';
        pythonCommand = cmd;
        logs.push(`✅ Python command '${cmd}' worked!`);
        break;
      } catch (error) {
        execError = error;
        logs.push(`⚠️ Python command '${cmd}' failed: ${error.message}`);
        continue;
      }
    }
    
    if (!pythonCommand) {
      throw new Error(`Failed to execute Python script. Tried: ${pythonCommands.join(', ')}. Make sure Python is installed and in PATH.`);
    }
    
    if (stdout) {
      logs.push(`📄 Python script output: ${stdout.trim()}`);
    }
    if (stderr) {
      logs.push(`⚠️ Python script stderr: ${stderr.trim()}`);
    }
    
    // Read transcript file
    let transcript = '';
    try {
      transcript = await fs.readFile(outputFile, 'utf-8');
      logs.push(`✅ Transcript file read successfully`);
      logs.push(`📊 Transcript length: ${transcript.length} characters`);
      
      // Clean up the transcript file after reading
      try {
        await fs.unlink(outputFile);
        logs.push(`🗑️ Cleaned up temporary transcript file`);
      } catch (unlinkError) {
        // Ignore cleanup errors
        console.warn('Could not delete transcript file:', unlinkError.message);
      }
    } catch (readError) {
      throw new Error(`Failed to read transcript file: ${readError.message}`);
    }
    
    // Validate transcript content
    const trimmedTranscript = transcript.trim();
    if (!trimmedTranscript || trimmedTranscript.length === 0) {
      // Check Python script output to understand why
      const errorMsg = stdout.includes('No transcript') || stdout.includes('Transcripts are disabled') || stdout.includes('No transcripts available')
        ? 'No transcript available for this video. The video may not have captions enabled.'
        : 'Python script executed but produced empty transcript file. Check Python script output above.';
      logs.push(`❌ Transcript validation failed: ${errorMsg}`);
      logs.push(`📄 Python stdout: ${stdout || '(empty)'}`);
      logs.push(`📄 Python stderr: ${stderr || '(empty)'}`);
      throw new Error(errorMsg);
    }
    
    logs.push(`✅ Transcript validated: ${trimmedTranscript.length} characters`);
    
    return {
      title: videoTitle || `YouTube Video ${videoId}`,
      description: '',
      transcript: trimmedTranscript
    };
  } catch (error) {
    logs.push(`❌ Transcript extraction failed: ${error.message}`);
    throw new Error(`Failed to extract YouTube transcript: ${error.message}`);
  }
}

// Process YouTube video
async function processYouTubeAndExtractWords(videoUrl) {
  const startTime = Date.now();
  const logs = [];

  try {
    const transcriptStart = Date.now();
    logs.push('🔄 Starting YouTube transcript extraction...');
    logs.push('📹 Extracting transcript from YouTube video...');
    logs.push(`⏳ Processing YouTube URL: ${videoUrl}`);
    logs.push('⏳ Waiting for transcript extraction...');
    
    // Extract transcript using Python script
    let videoData;
    try {
      videoData = await extractYouTubeTranscriptWithPython(videoUrl, logs);
      const transcriptTime = ((Date.now() - transcriptStart) / 1000).toFixed(2);
      logs.push(`✅ YouTube transcript extracted successfully in ${transcriptTime} seconds`);
      logs.push(`📊 Video title: ${videoData.title || 'N/A'}`);
      logs.push(`📊 Transcript length: ${videoData.transcript?.length || 0} characters`);
      
      // CRITICAL: Validate transcript before proceeding
      if (!videoData.transcript || videoData.transcript.trim().length === 0) {
        throw new Error('Transcript extraction succeeded but transcript is empty. Cannot proceed to word extraction.');
      }
    } catch (error) {
      logs.push(`❌ Transcript extraction failed: ${error.message}`);
      logs.push(`🛑 STOPPING: Cannot proceed to word extraction without transcript.`);
      throw new Error(`Failed to extract YouTube transcript: ${error.message}`);
    }
    logs.push('');

    // Use transcript as the content to send to Gemini for word extraction
    // This matches the user's workflow: transcript -> Gemini -> words
    const transcriptContent = videoData.transcript;
    const sourceName = videoData.title || videoUrl;

    // Double-check (should never reach here if transcript is empty due to validation above)
    if (!transcriptContent || transcriptContent.trim().length === 0) {
      throw new Error('FATAL: Transcript is empty but passed validation. This should not happen.');
    }

    logs.push('');
    logs.push('🤖 Step 2: Sending transcript to Gemini AI for word extraction...');
    logs.push('📝 This matches your workflow: transcript -> Gemini -> words');
    logs.push(`📊 Transcript size: ${transcriptContent.length} characters`);
    
    // Step 1: Extract words from transcript using Gemini AI (as requested by user)
    const extractedWords = await extractWordsFromContentWithGemini(transcriptContent, sourceName, logs);
    
    // Step 2-3: Check duplicates
    const { existingWords, newWords, existingWordIds } = await checkAndRemoveDuplicates(extractedWords, logs);
    
    // Step 4-6: Fill columns for new words
    let newWordData = [];
    let allColumnsFilled = true;
    let categoryTag = '';
    let wordIds = [...existingWordIds];
    let firstWordSample = null;
    let lastWordSample = null;

    if (newWords.length > 0) {
      logs.push(`🔄 Step 4-6: Starting column filling for ${newWords.length} new words...`);
      // Process in batches
      const batches = [];
      for (let i = 0; i < newWords.length; i += 100) {
        batches.push(newWords.slice(i, i + 100));
      }
      logs.push(`📦 Split into ${batches.length} batch(es) for processing`);

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        logs.push(`⏳ Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} words)...`);
        const baseName = videoData.title || 'YouTubeVideo';
        const partTag = newWords.length > 50 && batches.length > 1 
          ? `${baseName}-Part${batchIndex + 1}` 
          : baseName;
        
        const batchData = await fillWordColumns(batch, sourceName, newWords.length, partTag, logs, batchIndex);
        newWordData = newWordData.concat(batchData);
        logs.push(`✅ Batch ${batchIndex + 1}/${batches.length} completed`);
        
        if (!categoryTag) categoryTag = partTag;
      }

      // Step 7: Add to database
      const dbUpdateStart = Date.now();
      logs.push('🔄 Step 7: Starting database update...');
      logs.push(`⏳ Preparing to add ${newWordData.length} words to database...`);
      let currentWordId = 1;
      
      // Get max wordId once
      logs.push('⏳ Getting next wordId from database...');
      const maxWord = await Word.findOne().sort({ wordId: -1 });
      if (maxWord) {
        currentWordId = maxWord.wordId + 1;
        logs.push(`📊 Next wordId: ${currentWordId}`);
      } else {
        logs.push('📊 Starting from wordId: 1 (first word in database)');
      }

      logs.push(`⏳ Saving ${newWordData.length} words to database...`);
      let savedCount = 0;
      for (let i = 0; i < newWordData.length; i++) {
        const wordData = newWordData[i];
        try {
          const word = new Word({
            wordId: currentWordId++,
            englishWord: wordData.englishWord,
            wordType: wordData.wordType || null,
            turkishMeaning: wordData.turkishMeaning || null,
            category1: wordData.category1 || null,
            category2: wordData.category2 || null,
            category3: wordData.category3 || null,
            englishLevel: wordData.englishLevel || null,
            sampleSentenceEn: wordData.sampleSentenceEn || null,
            sampleSentenceTr: wordData.sampleSentenceTr || null
          });

          await word.save();
          wordIds.push(word._id.toString());
          savedCount++;

          // Log progress every 10 words
          if ((i + 1) % 10 === 0 || i === newWordData.length - 1) {
            logs.push(`⏳ Progress: ${i + 1}/${newWordData.length} words saved...`);
          }

          // Store first and last word samples
          if (i === 0) {
            firstWordSample = {
              englishWord: word.englishWord,
              wordType: word.wordType,
              turkishMeaning: word.turkishMeaning,
              category1: word.category1,
              category2: word.category2,
              category3: word.category3,
              englishLevel: word.englishLevel,
              sampleSentenceEn: word.sampleSentenceEn,
              sampleSentenceTr: word.sampleSentenceTr
            };
          }
          if (i === newWordData.length - 1) {
            lastWordSample = {
              englishWord: word.englishWord,
              wordType: word.wordType,
              turkishMeaning: word.turkishMeaning,
              category1: word.category1,
              category2: word.category2,
              category3: word.category3,
              englishLevel: word.englishLevel,
              sampleSentenceEn: word.sampleSentenceEn,
              sampleSentenceTr: word.sampleSentenceTr
            };
          }

          if (!wordData.wordType || !wordData.turkishMeaning || !wordData.englishLevel) {
            allColumnsFilled = false;
          }
        } catch (error) {
          console.error('Error saving word:', error);
          logs.push(`⚠️ Warning: Failed to save word "${wordData.englishWord}": ${error.message}`);
          allColumnsFilled = false;
        }
      }

      const dbUpdateTime = ((Date.now() - dbUpdateStart) / 1000).toFixed(2);
      logs.push(`✅ Step 7 completed in ${dbUpdateTime} seconds`);
      logs.push(`💾 Successfully saved ${savedCount} words to database`);
      logs.push('📊 Sample words added:');
      
      // Log sample words
      if (firstWordSample) {
        logs.push('--(First word and its filled up values):');
        logs.push(JSON.stringify(firstWordSample, null, 2));
      }
      if (lastWordSample && firstWordSample && lastWordSample.englishWord !== firstWordSample.englishWord) {
        logs.push('--(Last word and its filled up values):');
        logs.push(JSON.stringify(lastWordSample, null, 2));
      }
    }

    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
    logs.push('');
    logs.push('═══════════════════════════════════════');
    logs.push(`✅ ALL STEPS COMPLETED IN ${processingTime} SECONDS`);
    logs.push(`📊 Summary:`);
    logs.push(`   - Total words extracted: ${extractedWords.length}`);
    logs.push(`   - Existing words: ${existingWords.length}`);
    logs.push(`   - New words added: ${newWordData.length}`);
    logs.push(`   - All columns filled: ${allColumnsFilled ? 'Yes ✓' : 'No ✗'}`);
    logs.push(`   - Category tag: ${categoryTag || 'N/A'}`);
    logs.push('═══════════════════════════════════════');

    return {
      videoTitle: videoData.title || videoUrl,
      totalWords: extractedWords.length,
      existingWords: existingWords.length,
      newWords: newWordData.length,
      allColumnsFilled,
      categoryTag,
      wordIds: wordIds,
      processingTime: parseFloat(processingTime),
      logs: logs
    };
  } catch (error) {
    const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
    logs.push('');
    logs.push('═══════════════════════════════════════');
    logs.push(`✗ PROCESS FAILED AFTER ${processingTime} SECONDS`);
    logs.push(`✗ Error: ${error.message}`);
    logs.push('═══════════════════════════════════════');
    
    // Create error object with logs so they can be returned to frontend
    const errorWithLogs = new Error('Failed to process YouTube video: ' + error.message);
    errorWithLogs.logs = logs;
    throw errorWithLogs;
  }
}

module.exports = {
  processFileAndExtractWords,
  processYouTubeAndExtractWords
};

