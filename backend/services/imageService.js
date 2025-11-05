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

  const prompt = `Given this quiz question and its options, generate a concise, relevant search query (2-4 words) for finding an appropriate image on Unsplash. The query should be descriptive and related to the main topic of the question.

Question: "${questionText}"
Options: ${options.join(', ')}

Generate only the search query, nothing else. Examples: "lightbulb invention", "eiffel tower", "mountain landscape", "cooking ingredients"`;

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
    // Fallback: extract keywords from question text
    const words = questionText.toLowerCase()
      .replace(/[?.,!]/g, '')
      .split(' ')
      .filter(word => word.length > 3 && !['what', 'who', 'where', 'when', 'which', 'how', 'why', 'this', 'that', 'with', 'from'].includes(word))
      .slice(0, 3);
    return words.join(' ') || 'education';
  }
}

/**
 * Fetch an image URL from Unsplash based on a search query
 * @param {string} query - Search query for Unsplash
 * @param {number} page - Page number for pagination (default: 1, random for variety)
 * @returns {Promise<string>} - Image URL (regular size, optimized for web)
 */
async function fetchImageFromUnsplash(query, page = null) {
  if (!UNSPLASH_ACCESS_KEY) {
    throw new Error('UNSPLASH_ACCESS_KEY is not set in environment variables');
  }

  try {
    // Fetch more images per page for variety
    // Use random page if not specified to get different images each time
    const randomPage = page || Math.floor(Math.random() * 5) + 1;
    const perPage = 10; // Get 10 images per request for more variety
    
    const response = await axios.get('https://api.unsplash.com/search/photos', {
      params: {
        query: query,
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
      throw new Error('No images found for the query');
    }

    // Randomly select from the results to get variety
    const randomIndex = Math.floor(Math.random() * Math.min(results.length, perPage));
    const selectedImage = results[randomIndex];

    // Return regular size URL (good balance between quality and file size)
    // Other options: raw, full, regular, small, thumb
    return selectedImage.urls.regular;
  } catch (error) {
    console.error('Error fetching image from Unsplash:', error.response?.data || error.message);
    throw new Error('Failed to fetch image from Unsplash');
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
  try {
    // Step 1: Generate search query using AI
    const searchQuery = await generateSearchQuery(questionText, options);

    // Step 2: Fetch image from Unsplash (with random page for variety)
    const imageUrl = await fetchImageFromUnsplash(searchQuery, page);

    return imageUrl;
  } catch (error) {
    console.error('Error generating question image:', error);
    throw error;
  }
}

module.exports = {
  generateQuestionImage,
  generateSearchQuery,
  fetchImageFromUnsplash
};

