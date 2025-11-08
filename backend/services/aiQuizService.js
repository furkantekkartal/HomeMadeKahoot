const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

/**
 * Calculate default points based on category and difficulty
 * @param {string} category - Quiz category
 * @param {string} difficulty - Quiz difficulty
 * @returns {number} - Calculated points
 */
function calculatePoints(category, difficulty) {
  const categoryCoefficients = {
    vocabulary: 1,
    grammar: 2,
    reading: 2,
    listening: 2
  };

  const difficultyCoefficients = {
    beginner: 1,
    intermediate: 3,
    advanced: 5
  };

  const categoryCoef = categoryCoefficients[category] || 1;
  const difficultyCoef = difficultyCoefficients[difficulty] || 1;

  return categoryCoef * difficultyCoef;
}

/**
 * Calculate default time limit based on difficulty
 * @param {string} difficulty - Quiz difficulty
 * @returns {number} - Time limit in seconds
 */
function calculateTimeLimit(difficulty) {
  const timeLimits = {
    beginner: 20,
    intermediate: 40,
    advanced: 60
  };

  return timeLimits[difficulty] || 20;
}

/**
 * Generate a quiz title using AI
 * @param {string} category - Quiz category
 * @param {string} difficulty - Quiz difficulty
 * @returns {Promise<string>} - Generated quiz title
 */
async function generateQuizTitle(category, difficulty) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set in environment variables');
  }

  const prompt = `Generate a simple, concise quiz title for an English learning quiz. The quiz is about ${category} at ${difficulty} level. 

Return only the title, nothing else. Keep it short (3-6 words max), clear and direct. Examples: "Everyday Vocabulary", "Present Tenses", "Short Stories"`;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates quiz titles for English learning. Return only the title, no explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 30
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

    const title = response.data.choices[0]?.message?.content?.trim();
    
    if (!title) {
      throw new Error('Failed to generate quiz title');
    }

    // Clean up the title - remove quotes if present
    return title.replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error('Error generating quiz title:', error.response?.data || error.message);
    // Fallback title
    return `${category.charAt(0).toUpperCase() + category.slice(1)} Quiz - ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}`;
  }
}

/**
 * Generate a quiz description using AI
 * @param {string} title - Quiz title
 * @param {string} category - Quiz category
 * @param {string} difficulty - Quiz difficulty
 * @returns {Promise<string>} - Generated quiz description
 */
async function generateQuizDescription(title, category, difficulty) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set in environment variables');
  }

  const prompt = `Generate a simple, brief description for an English learning quiz. 

Title: "${title}"
Category: ${category}
Difficulty: ${difficulty}

Write 1-2 short sentences only. Keep it simple and to the point.`;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates quiz descriptions for English learning. Return only the description, no explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 100
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

    const description = response.data.choices[0]?.message?.content?.trim();
    
    if (!description) {
      throw new Error('Failed to generate quiz description');
    }

    // Clean up the description - remove quotes if present
    return description.replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error('Error generating quiz description:', error.response?.data || error.message);
    // Fallback description
    return `Practice your ${category} skills with this ${difficulty} level quiz. Test your knowledge and improve your English!`;
  }
}

/**
 * Generate quiz questions using AI
 * @param {string} title - Quiz title
 * @param {string} description - Quiz description
 * @param {string} category - Quiz category
 * @param {string} difficulty - Quiz difficulty
 * @param {number} questionCount - Number of questions to generate
 * @returns {Promise<Array>} - Array of question objects
 */
async function generateQuizQuestions(title, description, category, difficulty, questionCount) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set in environment variables');
  }

  const prompt = `Generate ${questionCount} multiple-choice questions for an English learning quiz.

Quiz Title: "${title}"
Description: "${description}"
Category: ${category}
Difficulty: ${difficulty}

Requirements:
- Each question must have exactly 4 options (A, B, C, D)
- One option must be clearly correct
- Questions should be appropriate for ${difficulty} level
- Focus on ${category} topics
- Make questions engaging and educational

Return the questions as a JSON array in this exact format:
[
  {
    "questionText": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0
  },
  ...
]

Note: Do NOT include "points" or "timeLimit" fields - these will be calculated automatically based on category and difficulty.
Only return the JSON array with questionText, options, and correctAnswer fields, no other text.`;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates quiz questions for English learning. Always return valid JSON arrays only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 2000
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

    const content = response.data.choices[0]?.message?.content?.trim();
    
    if (!content) {
      throw new Error('Failed to generate quiz questions');
    }

    // Extract JSON from the response (might be wrapped in markdown code blocks)
    let jsonString = content;
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }

    const questions = JSON.parse(jsonString);

    // Validate and format questions
    if (!Array.isArray(questions)) {
      throw new Error('Invalid response format: expected array');
    }

    // Calculate default points and time limit based on category and difficulty
    const defaultPoints = calculatePoints(category, difficulty);
    const defaultTimeLimit = calculateTimeLimit(difficulty);

    // Ensure all questions have required fields and valid format
    const formattedQuestions = questions.map((q, index) => ({
      questionText: q.questionText || `Question ${index + 1}`,
      options: Array.isArray(q.options) && q.options.length === 4 
        ? q.options 
        : ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: typeof q.correctAnswer === 'number' && q.correctAnswer >= 0 && q.correctAnswer < 4
        ? q.correctAnswer
        : 0,
      points: defaultPoints, // Use calculated default points
      timeLimit: defaultTimeLimit, // Use calculated default time limit
      imageUrl: null
    }));

    // Ensure we have the requested number of questions
    if (formattedQuestions.length < questionCount) {
      console.warn(`Generated ${formattedQuestions.length} questions, requested ${questionCount}`);
    }

    return formattedQuestions.slice(0, questionCount);
  } catch (error) {
    console.error('Error generating quiz questions:', error.response?.data || error.message);
    throw new Error('Failed to generate quiz questions. Please try again.');
  }
}

module.exports = {
  generateQuizTitle,
  generateQuizDescription,
  generateQuizQuestions
};

