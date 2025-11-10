const axios = require('axios');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

/**
 * Generate a deck title using AI
 * @param {string} level - Deck level (A1-C2)
 * @param {string} skill - Deck skill (Speaking, Reading, Writing, Listening)
 * @param {string} task - Deck task (Vocabulary, Grammar, etc.)
 * @returns {Promise<string>} - Generated deck title
 */
async function generateDeckTitle(level, skill, task) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set in environment variables');
  }

  const prompt = `Generate a simple, concise flashcard deck title for an English learning deck. 
Level: ${level}
Skill: ${skill}
Task: ${task}

Return only the title, nothing else. Keep it short (3-6 words max), clear and direct. Examples: "A1 Vocabulary Basics", "B2 Grammar Practice", "Speaking Essentials"`;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates flashcard deck titles for English learning. Return only the title, no explanations.'
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
      throw new Error('Failed to generate deck title');
    }

    // Clean up the title - remove quotes if present
    return title.replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error('Error generating deck title:', error.response?.data || error.message);
    // Fallback title
    return `${level} ${task} - ${skill}`;
  }
}

/**
 * Generate a deck description using AI
 * @param {string} title - Deck title
 * @param {string} level - Deck level (A1-C2)
 * @param {string} skill - Deck skill (Speaking, Reading, Writing, Listening)
 * @param {string} task - Deck task (Vocabulary, Grammar, etc.)
 * @returns {Promise<string>} - Generated deck description
 */
async function generateDeckDescription(title, level, skill, task) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set in environment variables');
  }

  const prompt = `Generate a simple, brief description for an English learning flashcard deck. 

Title: "${title}"
Level: ${level}
Skill: ${skill}
Task: ${task}

Write 1-2 short sentences only. Keep it simple and to the point.`;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates flashcard deck descriptions for English learning. Return only the description, no explanations.'
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
      throw new Error('Failed to generate deck description');
    }

    // Clean up the description - remove quotes if present
    return description.replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error('Error generating deck description:', error.response?.data || error.message);
    // Fallback description
    return `Practice your ${skill.toLowerCase()} skills with this ${level} level ${task.toLowerCase()} deck. Improve your English vocabulary and understanding!`;
  }
}

module.exports = {
  generateDeckTitle,
  generateDeckDescription
};

