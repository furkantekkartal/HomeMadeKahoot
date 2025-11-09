const axios = require('axios');

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

/**
 * Generate a search query for Unsplash using AI (OpenRouter)
 * @param {string} questionText - The quiz question text
 * @param {Array<string>} options - The answer options
 * @returns {Promise<string>} - A search query string for Unsplash
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
 * Fetch an image URL from Unsplash based on a search query
 * @param {string} query - Search query for Unsplash
 * @param {number} page - Page number for pagination (default: 1, random for variety)
 * @param {Array<string>} fallbackQueries - Fallback queries to try if main query fails
 * @returns {Promise<string>} - Image URL (regular size, optimized for web)
 */
async function fetchImageFromUnsplash(query, page = null, fallbackQueries = []) {
  if (!UNSPLASH_ACCESS_KEY) {
    throw new Error('UNSPLASH_ACCESS_KEY is not set in environment variables');
  }

  const queriesToTry = [query, ...fallbackQueries];
  
  for (const searchQuery of queriesToTry) {
    try {
      // Fetch more images per page for variety
      // Use random page if not specified to get different images each time
      const randomPage = page || Math.floor(Math.random() * 5) + 1;
      const perPage = 10; // Get 10 images per request for more variety
      
      const response = await axios.get('https://api.unsplash.com/search/photos', {
        params: {
          query: searchQuery,
          per_page: perPage,
          page: randomPage,
          orientation: 'landscape'
        },
        headers: {
          'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`
        }
      });

      const results = response.data.results;
      
      if (!results || results.length === 0) {
        if (queriesToTry.indexOf(searchQuery) < queriesToTry.length - 1) {
          continue;
        }
        throw new Error('No images found for the query');
      }

      // Randomly select from the results to get variety
      const randomIndex = Math.floor(Math.random() * Math.min(results.length, perPage));
      const selectedImage = results[randomIndex];

      return selectedImage.urls.regular;
    } catch (error) {
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
 * Generate and fetch an image for a word
 * @param {string} englishWord - The English word
 * @param {string} wordType - The word type (noun, verb, etc.)
 * @param {string} sampleSentence - Optional sample sentence for context
 * @returns {Promise<{imageUrl: string, searchQuery: string}>} - Image URL and search query
 */
async function generateWordImage(englishWord, wordType = '', sampleSentence = '') {
  // Create a simple query from the word itself
  // For words, we can use the word directly or extract from sample sentence
  let searchQuery = englishWord.toLowerCase();
  
  // If we have a sample sentence, try to extract a more visual noun from it
  if (sampleSentence && OPENROUTER_API_KEY) {
    try {
      // Use AI to generate a better search query for the word
      const prompt = `Generate a simple, image-search-friendly query (1-2 words) for this English word. Focus on the visual representation of the word.

Word: "${englishWord}"
Type: ${wordType}
Context: "${sampleSentence}"

Return ONLY the search query (1-2 words), nothing else. Examples: "apple", "running", "book", "teacher"`;

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
          max_tokens: 15
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

      const aiQuery = response.data.choices[0]?.message?.content?.trim();
      if (aiQuery) {
        searchQuery = aiQuery.replace(/^["']|["']$/g, '');
      }
    } catch (error) {
      console.warn('Failed to generate AI search query for word, using word directly:', error.message);
      // Fallback to using the word directly
    }
  }

  // Generate fallback queries
  const fallbackQueries = [englishWord.toLowerCase()];
  if (wordType) {
    fallbackQueries.push(`${englishWord} ${wordType}`);
  }

  try {
    const imageUrl = await fetchImageFromUnsplash(searchQuery, null, fallbackQueries);
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

