const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CX; // Custom Search Engine ID
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GOOGLE_DAILY_LIMIT = parseInt(process.env.GOOGLE_DAILY_LIMIT) || 100; // Default 100 free searches per day
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || process.env.UNSPLASH_API_KEY;

// Multiple Unsplash API keys for parallel processing
// New range logic: Each key processes 50 words per hour, ranges increment by 250 per hour
// Hour 0: Key1: 1-50, Key2: 51-100, Key3: 101-150, Key4: 151-200, Key5: 201-250
// Hour 1: Key1: 251-300, Key2: 301-350, Key3: 351-400, Key4: 401-450, Key5: 451-500
// And so on...
const UNSPLASH_KEYS = [
  process.env.UNSPLASH_ACCESS_KEY_1 || process.env.UNSPLASH_ACCESS_KEY,
  process.env.UNSPLASH_ACCESS_KEY_2,
  process.env.UNSPLASH_ACCESS_KEY_3,
  process.env.UNSPLASH_ACCESS_KEY_4,
  process.env.UNSPLASH_ACCESS_KEY_5
].filter(key => key); // Remove undefined keys

// Path to store daily usage counter
const USAGE_FILE_PATH = path.join(__dirname, '../data/google_search_usage.json');

/**
 * Generate a search query for image search using AI (OpenRouter)
 * @param {string} questionText - The quiz question text
 * @param {Array<string>} options - The answer options
 * @returns {Promise<string>} - A search query string for image search
 */
async function generateSearchQuery(questionText, options = []) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set in environment variables');
  }

  const prompt = `Extract the main visual subject from this quiz question and generate a simple, image-search-friendly query (1-3 words) for Unsplash.

Focus on:
- Main nouns/objects that can be photographed (e.g., "apple", "book", "teacher", "beach")
- Avoid abstract concepts, long phrases, or complex descriptions
- Keep it simple: single words or very short phrases work best

Question: "${questionText}"
Options: ${options.join(', ')}

Examples of good queries: "apple", "lightbulb", "eiffel tower", "cooking", "mountain", "book reading"
Examples of bad queries: "learning english grammar", "what is the meaning", "how to use present tense"

Return ONLY the search query (1-3 words), nothing else.`;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates concise image search queries. Return only the search query, no explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 20
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

    const searchQuery = response.data.choices[0]?.message?.content?.trim();
    
    if (!searchQuery) {
      throw new Error('Failed to generate search query');
    }

    // Clean up the query - remove quotes if present
    return searchQuery.replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error('Error generating search query:', error.response?.data || error.message);
    // Fallback: extract simple nouns from question text and options
    const allText = `${questionText} ${options.join(' ')}`.toLowerCase();
    const words = allText
      .replace(/[?.,!]/g, '')
      .split(' ')
      .filter(word => 
        word.length > 3 && 
        !['what', 'who', 'where', 'when', 'which', 'how', 'why', 'this', 'that', 'with', 'from', 'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'].includes(word)
      )
      .slice(0, 2); // Take only 1-2 words for simplicity
    return words.join(' ') || 'education';
  }
}

/**
 * Get today's date string (YYYY-MM-DD) for tracking daily usage
 * @returns {string} - Today's date string
 */
function getTodayDateString() {
  const today = new Date();
  return today.toISOString().split('T')[0]; // Returns YYYY-MM-DD
}

/**
 * Load daily usage counter from file
 * @returns {Promise<{date: string, count: number}>} - Usage data
 */
async function loadUsageCounter() {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(USAGE_FILE_PATH);
    await fs.mkdir(dataDir, { recursive: true });
    
    const data = await fs.readFile(USAGE_FILE_PATH, 'utf8');
    const usage = JSON.parse(data);
    
    // Check if it's a new day - reset counter if needed
    const today = getTodayDateString();
    if (usage.date !== today) {
      return { date: today, count: 0 };
    }
    
    return usage;
  } catch (error) {
    // File doesn't exist or is invalid - start fresh
    const today = getTodayDateString();
    return { date: today, count: 0 };
  }
}

/**
 * Save daily usage counter to file
 * @param {number} count - Current usage count
 * @returns {Promise<void>}
 */
async function saveUsageCounter(count) {
  try {
    const usage = {
      date: getTodayDateString(),
      count: count
    };
    
    // Ensure data directory exists
    const dataDir = path.dirname(USAGE_FILE_PATH);
    await fs.mkdir(dataDir, { recursive: true });
    
    await fs.writeFile(USAGE_FILE_PATH, JSON.stringify(usage, null, 2), 'utf8');
  } catch (error) {
    console.error('Failed to save usage counter:', error);
    // Don't throw - we can continue without saving
  }
}

/**
 * Check daily usage limit (without incrementing)
 * @returns {Promise<{allowed: boolean, count: number, remaining: number}>}
 */
async function checkUsageLimit() {
  const usage = await loadUsageCounter();
  
  if (usage.count >= GOOGLE_DAILY_LIMIT) {
    return {
      allowed: false,
      count: usage.count,
      remaining: 0
    };
  }
  
  return {
    allowed: true,
    count: usage.count,
    remaining: GOOGLE_DAILY_LIMIT - usage.count
  };
}

/**
 * Increment daily usage counter (call after successful API call)
 * @returns {Promise<{count: number, remaining: number}>}
 */
async function incrementUsageCounter() {
  const usage = await loadUsageCounter();
  const newCount = usage.count + 1;
  await saveUsageCounter(newCount);
  
  return {
    count: newCount,
    remaining: GOOGLE_DAILY_LIMIT - newCount
  };
}

/**
 * Fetch an image URL from Google Custom Search API based on a search query
 * @param {string} query - Search query for Google Images
 * @param {number} page - Page number for pagination (default: 1, random for variety)
 * @param {Array<string>} fallbackQueries - Fallback queries to try if main query fails
 * @returns {Promise<string>} - Image URL
 */
async function fetchImageFromGoogle(query, page = null, fallbackQueries = []) {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is not set in environment variables');
  }
  if (!GOOGLE_CX) {
    throw new Error('GOOGLE_CX (Custom Search Engine ID) is not set in environment variables');
  }

  // Check daily usage limit before making API call
  const usageCheck = await checkUsageLimit();
  if (!usageCheck.allowed) {
    throw new Error(`Daily Google Search API limit reached (${GOOGLE_DAILY_LIMIT} searches/day). Remaining: 0. Please try again tomorrow.`);
  }
  
  console.log(`Google Search API usage: ${usageCheck.count}/${GOOGLE_DAILY_LIMIT} (${usageCheck.remaining} remaining)`);

  const queriesToTry = [query, ...fallbackQueries];
  let apiCallMade = false;
  
  for (const searchQuery of queriesToTry) {
    try {
      // Use random start index if not specified to get different images each time
      // Google API uses start parameter (1-91, increments of 10)
      const randomStart = page ? (page - 1) * 10 + 1 : Math.floor(Math.random() * 9) * 10 + 1;
      const numResults = 10; // Get 10 images per request
      
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: GOOGLE_API_KEY,
          cx: GOOGLE_CX,
          q: searchQuery,
          searchType: 'image',
          num: numResults,
          start: randomStart,
          safe: 'active', // Safe search
          imgSize: 'large', // Prefer larger images
          imgType: 'photo' // Prefer photos over clipart/drawings
        }
      });

      // Mark that we made an API call (only increment on first successful call)
      if (!apiCallMade) {
        await incrementUsageCounter();
        apiCallMade = true;
      }

      const items = response.data.items;
      
      if (!items || items.length === 0) {
        if (queriesToTry.indexOf(searchQuery) < queriesToTry.length - 1) {
          continue;
        }
        throw new Error('No images found for the query');
      }

      // Randomly select from the results to get variety
      const randomIndex = Math.floor(Math.random() * Math.min(items.length, numResults));
      const selectedImage = items[randomIndex];

      return selectedImage.link; // Google returns direct image URL in 'link' field
    } catch (error) {
      // If this is the last query to try, throw the error
      if (queriesToTry.indexOf(searchQuery) === queriesToTry.length - 1) {
        // Only increment if we actually made an API call (not a validation error)
        if (!apiCallMade && error.response) {
          await incrementUsageCounter();
        }
        const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
        const googleError = new Error(`Failed to fetch image from Google: ${errorMessage}`);
        googleError.searchQuery = searchQuery;
        throw googleError;
      }
      continue;
    }
  }
}

/**
 * Get Unsplash API key based on word index for load balancing
 * 
 * Range logic:
 * - Each key processes 50 words per hour
 * - Hour 0: Key1: 1-50, Key2: 51-100, Key3: 101-150, Key4: 151-200, Key5: 201-250
 * - Hour 1: Key1: 251-300, Key2: 301-350, Key3: 351-400, Key4: 401-450, Key5: 451-500
 * - Hour 2: Key1: 501-550, Key2: 551-600, Key3: 601-650, Key4: 651-700, Key5: 701-750
 * - And so on, incrementing by 250 per hour
 * 
 * @param {number} wordIndex - Index of the word (0-based)
 * @returns {string} - Unsplash API key to use
 */
function getUnsplashKeyForWord(wordIndex) {
  if (UNSPLASH_KEYS.length === 0) {
    throw new Error('No Unsplash API keys configured');
  }
  
  // If only one key, use it
  if (UNSPLASH_KEYS.length === 1) {
    return UNSPLASH_KEYS[0];
  }
  
  // New range logic: 50 words per key per hour, incrementing by 250 per hour
  const WORDS_PER_KEY_PER_HOUR = 50; // Each key processes 50 words per hour
  const WORDS_PER_HOUR = 250; // Total words per hour (5 keys × 50 words)
  
  // Convert to 1-based for calculations
  const wordId = wordIndex + 1;
  
  // Determine which hour this word belongs to (0-based)
  const hour = Math.floor((wordId - 1) / WORDS_PER_HOUR);
  
  // Determine position within the hour (0-249)
  const positionInHour = (wordId - 1) % WORDS_PER_HOUR;
  
  // Determine which key within this hour (0-based, 0-4)
  const keyIndex = Math.floor(positionInHour / WORDS_PER_KEY_PER_HOUR);
  
  // Ensure we don't exceed available keys (cap at last key)
  const cappedKeyIndex = Math.min(keyIndex, UNSPLASH_KEYS.length - 1);
  const selectedKey = UNSPLASH_KEYS[cappedKeyIndex];
  
  return selectedKey;
}

/**
 * Fetch an image URL from Unsplash API based on a search query
 * @param {string} query - Search query for Unsplash
 * @param {number} page - Page number for pagination (not used by Unsplash, kept for compatibility)
 * @param {Array<string>} fallbackQueries - Fallback queries to try if main query fails
 * @param {number} wordIndex - Optional word index for key selection (for load balancing)
 * @returns {Promise<string>} - Image URL
 */
async function fetchImageFromUnsplash(query, page = null, fallbackQueries = [], wordIndex = null) {
  // Select API key based on word index if provided, otherwise use default
  const accessKey = wordIndex !== null 
    ? getUnsplashKeyForWord(wordIndex)
    : (UNSPLASH_ACCESS_KEY || UNSPLASH_KEYS[0]);
  
  if (!accessKey) {
    throw new Error('UNSPLASH_ACCESS_KEY is not set in environment variables');
  }

  const queriesToTry = [query, ...fallbackQueries];
  
  for (const searchQuery of queriesToTry) {
    try {
      const response = await axios.get('https://api.unsplash.com/search/photos', {
        params: {
          query: searchQuery,
          per_page: 10, // Get 10 images per request
          orientation: 'landscape',
          content_filter: 'high'
        },
        headers: {
          'Authorization': `Client-ID ${accessKey}`
        },
        timeout: 10000 // 10 second timeout
      });

      const results = response.data.results;
      
      if (!results || results.length === 0) {
        if (queriesToTry.indexOf(searchQuery) < queriesToTry.length - 1) {
          continue;
        }
        throw new Error('No images found for the query');
      }

      // Randomly select from the results to get variety
      const randomIndex = Math.floor(Math.random() * Math.min(results.length, 10));
      const selectedImage = results[randomIndex];

      return selectedImage.urls.regular; // Unsplash returns image URL in 'urls.regular' field
    } catch (error) {
      // Check for rate limit errors (403) - don't retry with fallback queries
      if (error.response?.status === 403) {
        const errorMessage = error.response?.data?.errors?.[0] || 'Rate limit exceeded or invalid API key';
        const unsplashError = new Error(`Rate limit exceeded (403): ${errorMessage}. Please check your API key or wait before retrying.`);
        unsplashError.searchQuery = searchQuery;
        throw unsplashError;
      }
      
      // If this is the last query to try, throw the error
      if (queriesToTry.indexOf(searchQuery) === queriesToTry.length - 1) {
        const errorMessage = error.response?.data?.errors?.[0] || error.message || 'Unknown error';
        const unsplashError = new Error(`Failed to fetch image from Unsplash: ${errorMessage}`);
        unsplashError.searchQuery = searchQuery;
        throw unsplashError;
      }
      continue;
    }
  }
}

/**
 * Generate and fetch an image for a quiz question
 * @param {string} questionText - The quiz question text
 * @param {Array<string>} options - The answer options (optional)
 * @param {number} page - Page number for pagination (optional, for variety)
 * @returns {Promise<string>} - Image URL
 */
async function generateQuestionImage(questionText, options = [], page = null) {
  let searchQuery = null;
  try {
    // Step 1: Generate search query using AI
    searchQuery = await generateSearchQuery(questionText, options);

    // Step 2: Generate fallback queries from question text and options
    const fallbackQueries = generateFallbackQueries(questionText, options, searchQuery);

    // Step 3: Fetch image from Unsplash (with random page for variety and fallbacks)
    const imageUrl = await fetchImageFromUnsplash(searchQuery, page, fallbackQueries);

    return { imageUrl, searchQuery };
  } catch (error) {
    console.error('Error generating question image:', error);
    // Attach search query to error for debugging
    error.searchQuery = searchQuery;
    throw error;
  }
}

/**
 * Generate fallback queries from question text and options
 * @param {string} questionText - The quiz question text
 * @param {Array<string>} options - The answer options
 * @param {string} originalQuery - The original AI-generated query
 * @returns {Array<string>} - Array of fallback search queries
 */
function generateFallbackQueries(questionText, options = [], originalQuery = '') {
  const fallbacks = [];
  
  // Extract nouns from options (they might be more visual)
  const allText = options.join(' ').toLowerCase();
  const words = allText
    .replace(/[?.,!]/g, '')
    .split(' ')
    .filter(word => 
      word.length > 3 && 
      !['what', 'who', 'where', 'when', 'which', 'how', 'why', 'this', 'that', 'with', 'from', 'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'synonym', 'antonym', 'definition', 'meaning', 'pronunciation', 'different', 'differences'].includes(word)
    )
    .slice(0, 2);
  
  if (words.length > 0) {
    fallbacks.push(words.join(' '));
  }
  
  // Add generic educational fallbacks
  const genericFallbacks = ['education', 'learning', 'study', 'books', 'school'];
  for (const generic of genericFallbacks) {
    if (!fallbacks.includes(generic) && fallbacks.length < 3) {
      fallbacks.push(generic);
    }
  }
  
  return fallbacks;
}

/**
 * Extract the phrase containing the target word from a sentence
 * @param {string} sentence - The sentence to search in
 * @param {string} targetWord - The target word to find
 * @returns {string} - The phrase containing the target word (e.g., "rolled down" for "down")
 */
function extractWordPhrase(sentence, targetWord) {
  if (!sentence || !targetWord) {
    return targetWord.toLowerCase();
  }

  const lowerSentence = sentence.toLowerCase();
  const lowerTargetWord = targetWord.toLowerCase();

  // Try to find the word in the sentence (case-insensitive)
  const wordRegex = new RegExp(`\\b${lowerTargetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  const match = sentence.match(wordRegex);
  
  if (!match) {
    return lowerTargetWord; // Word not found, return just the word
  }

  const matchIndex = match.index;
  const words = sentence.split(/\s+/);
  
  // Find which word index contains the match
  let currentIndex = 0;
  let wordIndex = -1;
  for (let i = 0; i < words.length; i++) {
    const wordStart = currentIndex;
    const wordEnd = currentIndex + words[i].length;
    
    if (matchIndex >= wordStart && matchIndex < wordEnd) {
      wordIndex = i;
      break;
    }
    currentIndex = wordEnd + 1; // +1 for space
  }

  if (wordIndex === -1) {
    return lowerTargetWord;
  }

  // Extract phrase: check if previous word forms a common phrase (phrasal verb, etc.)
  // Look for 2-word phrases (e.g., "rolled down", "went up", "came back")
  let phrase = '';
  
  // Check if previous word + target word form a phrase
  if (wordIndex > 0) {
    const prevWord = words[wordIndex - 1].toLowerCase().replace(/[.,!?;:()"']/g, '');
    const currentWord = words[wordIndex].toLowerCase().replace(/[.,!?;:()"']/g, '');
    phrase = `${prevWord} ${currentWord}`;
  } else {
    phrase = words[wordIndex].toLowerCase().replace(/[.,!?;:()"']/g, '');
  }

  return phrase;
}

/**
 * Extract keywords from a sentence, preserving the natural order
 * @param {string} sentence - The sentence to extract keywords from
 * @param {string} targetWord - The target word that must be included
 * @returns {string[]} - Array of keywords in sentence order (e.g., ["ball", "rolled down", "hill"])
 */
function extractKeywordsFromSentence(sentence, targetWord) {
  if (!sentence || !targetWord) {
    return [targetWord.toLowerCase()];
  }

  // Extract the phrase containing the target word (e.g., "rolled down" instead of just "down")
  const targetPhrase = extractWordPhrase(sentence, targetWord);
  const phraseWords = targetPhrase.split(/\s+/);

  // Remove punctuation and split into words, preserving order
  const words = sentence
    .toLowerCase()
    .replace(/[.,!?;:()"']/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 0);

  // Remove common stop words
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 
    'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 
    'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'there'
  ]);

  // Build keywords array preserving sentence order
  const keywords = [];
  let i = 0;
  let phraseFound = false;
  
  while (i < words.length && keywords.length < 4) {
    const word = words[i];
    
    // Skip stop words and very short words
    if (stopWords.has(word) || word.length <= 2) {
      i++;
      continue;
    }

    // Check if this word is part of the target phrase
    if (phraseWords.includes(word) && i < words.length - 1) {
      // Check if next word completes the phrase
      const nextWord = words[i + 1];
      if (phraseWords.includes(nextWord)) {
        // Add the phrase as a single unit
        keywords.push(`${word} ${nextWord}`);
        phraseFound = true;
        i += 2; // Skip both words
        continue;
      }
    }

    // Add individual word if it's not part of the phrase
    if (!phraseWords.includes(word)) {
      keywords.push(word);
    } else if (!phraseFound) {
      // If we found a phrase word but couldn't form the phrase, skip it
      // (it will be handled by the phrase insertion below if needed)
    }
    
    i++;
  }

  // If we didn't get the target phrase, add it in the correct position
  if (!phraseFound && targetPhrase !== targetWord.toLowerCase()) {
    // Try to find where "rolled" appears in the original sentence
    const phraseFirstWord = targetPhrase.split(' ')[0];
    const phraseFirstIndex = words.indexOf(phraseFirstWord);
    
    if (phraseFirstIndex > 0) {
      // Insert after words that come before the phrase
      let insertIndex = 0;
      for (let j = 0; j < phraseFirstIndex; j++) {
        if (!stopWords.has(words[j]) && words[j].length > 2 && !phraseWords.includes(words[j])) {
          insertIndex++;
        }
      }
      keywords.splice(insertIndex, 0, targetPhrase);
    } else {
      // If phrase is at the start, add it first
      keywords.unshift(targetPhrase);
    }
  }

  // Limit to 4 keywords max and remove duplicates
  const result = [];
  for (const keyword of keywords) {
    if (result.length >= 4) break;
    if (!result.includes(keyword)) {
      result.push(keyword);
    }
  }
  
  return result;
}

/**
 * Generate and fetch an image for a word
 * @param {string} englishWord - The English word
 * @param {string} wordType - The word type (noun, verb, etc.)
 * @param {string} sampleSentence - Optional sample sentence for context
 * @param {string} customKeywords - Optional custom keywords from user
 * @param {string} service - Image service to use: 'google' or 'unsplash' (default: 'google')
 * @param {number} wordIndex - Optional word index for Unsplash key selection (for load balancing)
 * @returns {Promise<{imageUrl: string, searchQuery: string}>} - Image URL and search query
 */
async function generateWordImage(englishWord, wordType = '', sampleSentence = '', customKeywords = '', service = 'google', wordIndex = null) {
  let searchQuery = englishWord.toLowerCase();
  
  // For Unsplash, use custom keywords if provided, otherwise use the word itself
  if (service === 'unsplash') {
    // If custom keywords are provided, use them (same as Google)
    if (customKeywords && customKeywords.trim()) {
      searchQuery = customKeywords.trim().toLowerCase();
    } else {
      searchQuery = englishWord.toLowerCase();
    }
    const fallbackQueries = []; // No fallback queries needed, just the word
    
    try {
      const imageUrl = await fetchImageFromUnsplash(searchQuery, null, fallbackQueries, wordIndex);
      return { imageUrl, searchQuery };
    } catch (error) {
      console.error('Error generating word image:', error);
      throw error;
    }
  }
  
  // For Google service, use the existing logic with custom keywords or sentence extraction
  // If custom keywords are provided, use them as-is (user controls the order)
  if (customKeywords && customKeywords.trim()) {
    searchQuery = customKeywords.trim().toLowerCase();
    
    // Using custom keywords (no log needed)
    
    // Use custom keywords directly, skip automatic extraction and AI refinement
    // Generate fallback queries
    const fallbackQueries = [englishWord.toLowerCase()];
    if (wordType) {
      fallbackQueries.push(`${englishWord} ${wordType}`);
    }

    try {
      // Use Google service
      const imageUrl = await fetchImageFromGoogle(searchQuery, null, fallbackQueries);
      return { imageUrl, searchQuery };
    } catch (error) {
      console.error('Error generating word image:', error);
      throw error;
    }
  }
  
  // If no custom keywords, proceed with automatic extraction
  if (sampleSentence && sampleSentence.trim()) {
    // If we have a sample sentence, extract keywords from it
    const keywords = extractKeywordsFromSentence(sampleSentence, englishWord);
    
    // Create search query: target word first, then 2-3 other keywords
    // Join with spaces for better image search results
    if (keywords.length > 1) {
      searchQuery = keywords.join(' ');
    } else {
      searchQuery = keywords[0] || englishWord.toLowerCase();
    }
    
    // Keywords extracted (no log needed)
  }

  // Skip AI refinement - use extracted keywords as they preserve sentence order
  // AI was forcing target word first, which breaks natural sentence flow

  // Generate fallback queries
  const fallbackQueries = [englishWord.toLowerCase()];
  if (wordType) {
    fallbackQueries.push(`${englishWord} ${wordType}`);
  }
  // Add a fallback with just the word if keyword extraction didn't work well
  if (searchQuery === englishWord.toLowerCase() && sampleSentence) {
    // Try a simple extraction as fallback
    const simpleKeywords = extractKeywordsFromSentence(sampleSentence, englishWord);
    if (simpleKeywords.length > 1) {
      fallbackQueries.push(simpleKeywords.join(' '));
    }
  }

  try {
    // Use Google service
    const imageUrl = await fetchImageFromGoogle(searchQuery, null, fallbackQueries);
    return { imageUrl, searchQuery };
  } catch (error) {
    console.error('Error generating word image:', error);
    throw error;
  }
}

module.exports = {
  generateQuestionImage,
  generateWordImage,
  generateSearchQuery,
  fetchImageFromUnsplash
};

