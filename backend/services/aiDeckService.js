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

/**
 * Enhance text (title or description) using AI
 * @param {string} text - Text to enhance
 * @param {string} type - Type of text ('title' or 'description')
 * @returns {Promise<string>} - Enhanced text
 */
async function enhanceDeckText(text, type) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set in environment variables');
  }

  const prompt = type === 'title' 
    ? `Improve and enhance this flashcard deck title. Make it more engaging, clear, and professional. Keep it concise (3-6 words max). Return only the enhanced title, nothing else.

Current title: "${text}"`
    : `Improve and enhance this flashcard deck description. Make it more engaging, clear, and professional. Keep it brief (1-2 sentences). Return only the enhanced description, nothing else.

Current description: "${text}"`;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant that enhances ${type}s for English learning flashcard decks. Return only the enhanced ${type}, no explanations, no emojis.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: type === 'title' ? 30 : 100
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

    const enhancedText = response.data.choices[0]?.message?.content?.trim();
    
    if (!enhancedText) {
      throw new Error(`Failed to enhance ${type}`);
    }

    // Clean up - remove quotes if present
    return enhancedText.replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error(`Error enhancing ${type}:`, error.response?.data || error.message);
    // Return original text as fallback
    return text;
  }
}

/**
 * Process markdown content with AI
 * @param {string} markdownContent - Markdown content to process
 * @param {string} fileType - Type of file: 'pdf', 'srt', 'txt', or null
 * @returns {Promise<{response: string, prompt: string}>} - AI response and prompt used
 */
async function processMarkdownWithAI(markdownContent, fileType = null) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set in environment variables');
  }

  let prompt;
  let systemMessage;

  if (fileType === 'pdf') {
    // PDF-specific prompt: Clean and extract vocabulary
    prompt = `This content was converted from a PDF file. Your task has two steps:

STEP 1: Clean the content
- Remove unnecessary parts: table of contents, index, ISBN numbers, page numbers, headers, footers
- Remove navigation elements: "click here" buttons, links to other pages, advertisement text
- Remove metadata: publication info, copyright notices (unless relevant to content)
- Keep only the main readable content about the primary topic
- If it's a story book, keep only the story text (no index, ISBN, etc.)
- If it's a newspaper webpage, keep only the news article (no buttons, links, other news)
- If it's a document, keep only the main content (no headers, footers, page numbers)

STEP 2: Extract vocabulary from the cleaned content
Extract ONLY:
1. Individual words (nouns, verbs, adjectives, adverbs) - extract each unique word
2. Common/important idioms (e.g., "break the ice", "hit the nail on the head") - NOT regular phrases
3. Phrasal verbs (e.g., "give up", "look after", "turn down") - verbs with prepositions that have special meaning
4. V1 of a verb. For example; "swimming", "swim," "swam," and "swum" " should be swim in your output. 

DO NOT extract:
- Regular phrases that are not idioms or phrasal verbs
- Common everyday phrases like "going into", "gets three", "snap is good"
- Simple word combinations that don't have special meaning
- Only extract idioms/phrasal verbs that are actually idioms/phrasal verbs with special meanings

IMPORTANT:
- Return ONLY plain text, nothing else
- No explanations, no conversational messages
- No markdown formatting, no code blocks, no backticks
- Each word, idiom, or phrasal verb should be on a new line
- One item per line
- Just the extracted items, nothing more

Example format:
word1
word2
idiom example
phrasal verb

Content converted from PDF:
${markdownContent}`;

    systemMessage = 'You are a content cleaning and vocabulary extraction tool for PDF files. First, clean the PDF content by removing unnecessary parts (index, ISBN, buttons, links, headers, footers). Then extract vocabulary: 1) Individual words (nouns, verbs, adjectives, adverbs), 2) Common/important idioms (only real idioms with special meaning), 3) Phrasal verbs (verbs with prepositions that have special meaning). DO NOT extract regular phrases that are not idioms or phrasal verbs. Return ONLY plain text. No explanations, no conversational messages, no markdown formatting. Plain text, each word, idiom, or phrasal verb on a new line. One item per line. Just the extracted items, nothing more.';
  } else {
    // SRT/TXT prompt (original)
    prompt = `Extract vocabulary from the following text. Extract ONLY:

1. Individual words (nouns, verbs, adjectives, adverbs) - extract each unique word
2. Common/important idioms (e.g., "break the ice", "hit the nail on the head") - NOT regular phrases
3. Phrasal verbs (e.g., "give up", "look after", "turn down") - verbs with prepositions that have special meaning

DO NOT extract:
- Regular phrases that are not idioms or phrasal verbs
- Common everyday phrases like "going into", "gets three", "snap is good"
- Simple word combinations that don't have special meaning
- Only extract idioms/phrasal verbs that are actually idioms/phrasal verbs with special meanings

IMPORTANT:
- Return ONLY plain text, nothing else
- No explanations, no conversational messages
- No markdown formatting, no code blocks, no backticks
- Each word, idiom, or phrasal verb should be on a new line
- One item per line
- Just the extracted items, nothing more

Example format:
word1
word2
idiom example
phrasal verb

Text to extract from:
${markdownContent}`;

    systemMessage = 'You are a vocabulary extraction tool. Extract: 1) Individual words (nouns, verbs, adjectives, adverbs), 2) Common/important idioms (only real idioms with special meaning), 3) Phrasal verbs (verbs with prepositions that have special meaning). DO NOT extract regular phrases that are not idioms or phrasal verbs. Return ONLY plain text. No explanations, no conversational messages, no markdown formatting. Plain text, each word, idiom, or phrasal verb on a new line. One item per line. Just the extracted items, nothing more.';
  }

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-4o-mini', // Cheapest ChatGPT model on OpenRouter
        messages: [
          {
            role: 'system',
            content: systemMessage
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
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

    const aiResponse = response.data.choices[0]?.message?.content?.trim();
    
    if (!aiResponse) {
      throw new Error('Failed to get AI response');
    }

    return {
      response: aiResponse,
      prompt: prompt
    };
  } catch (error) {
    console.error('Error processing markdown with AI:', error.response?.data || error.message);
    throw new Error(`Failed to process markdown with AI: ${error.message}`);
  }
}

/**
 * Fill empty columns for words using AI
 * @param {Array<string>} words - Array of word strings to fill columns for
 * @param {Array<Object>} exampleWords - Example words from database to show structure
 * @returns {Promise<{response: string, prompt: string}>} - AI response and prompt used
 */
async function fillWordColumnsWithAI(words, exampleWords) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set in environment variables');
  }

  // Format example words as JSON
  const exampleJson = JSON.stringify(exampleWords, null, 2);

  // Format words as a clear list (one per line for clarity)
  const wordsList = words.map((word, index) => `${index + 1}. ${word}`).join('\n');

  const prompt = `You are filling database columns for English words. Below are example records from our database showing the structure and format.

Example database records (10 records):
[
  {
    "wordId": 1,
    "englishWord": "aback",
    "wordType": "adverb",
    "turkishMeaning": "şaşkın",
    "category1": null,
    "category2": null,
    "category3": null,
    "englishLevel": "C1",
    "sampleSentenceEn": "I was somewhat taken aback by her honesty.",
    "sampleSentenceTr": "Dürüstlüğü beni biraz şaşırttı.",
    "isKnown": null
  },
  {
    "wordId": 2,
    "englishWord": "abandon",
    "wordType": "verb",
    "turkishMeaning": "terk etmek",
    "category1": null,
    "category2": null,
    "category3": null,
    "englishLevel": "B2",
    "sampleSentenceEn": "We had to abandon the car.",
    "sampleSentenceTr": "Arabayı terk etmek zorunda kaldık.",
    "isKnown": null
  },
  {
    "wordId": 3,
    "englishWord": "abash",
    "wordType": "verb",
    "turkishMeaning": "utangaç",
    "category1": null,
    "category2": null,
    "category3": null,
    "englishLevel": "C2",
    "sampleSentenceEn": "Her elder cousins abashed her by commenting on her shyness.",
    "sampleSentenceTr": "Büyük kuzenleri onun utangaçlığına dair yorumlarda bulunarak onu utandırıyorlardı.",
    "isKnown": null
  },
  {
    "wordId": 4,
    "englishWord": "abate",
    "wordType": "verb",
    "turkishMeaning": "azaltmak",
    "category1": null,
    "category2": null,
    "category3": null,
    "englishLevel": "B1",
    "sampleSentenceEn": "Our desire for consumer goods has not abated.",
    "sampleSentenceTr": "Tüketim mallarına olan arzumuz azalmadı.",
    "isKnown": null
  },
  {
    "wordId": 5,
    "englishWord": "abattoir",
    "wordType": "noun",
    "turkishMeaning": "mezbaha",
    "category1": null,
    "category2": null,
    "category3": null,
    "englishLevel": "A1",
    "sampleSentenceEn": "He was out at the abattoirs; where after a three-mile drive we obtained him.",
    "sampleSentenceTr": "Mezbahalardaydı; üç mil yol gittikten sonra onu bulduk.",
    "isKnown": null
  },
  {
    "wordId": 6,
    "englishWord": "abberance",
    "wordType": "noun",
    "turkishMeaning": "sapma",
    "category1": null,
    "category2": null,
    "category3": null,
    "englishLevel": "A1",
    "sampleSentenceEn": "This is an aberrance from the normal.",
    "sampleSentenceTr": "Bu normalden bir sapmadır.",
    "isKnown": null
  },
  {
    "wordId": 7,
    "englishWord": "abberant",
    "wordType": "noun",
    "turkishMeaning": "sapkın",
    "category1": null,
    "category2": null,
    "category3": null,
    "englishLevel": "A1",
    "sampleSentenceEn": "The aberrant behavior was unusual.",
    "sampleSentenceTr": "Sapkın davranış alışılmadıktı.",
    "isKnown": null
  },
  {
    "wordId": 8,
    "englishWord": "abbey",
    "wordType": "noun",
    "turkishMeaning": "manastır",
    "category1": null,
    "category2": null,
    "category3": null,
    "englishLevel": "A1",
    "sampleSentenceEn": "We glimpsed the ruined abbey from the windows of the train.",
    "sampleSentenceTr": "Trenin penceresinden harap olmuş manastırı gördük.",
    "isKnown": null
  },
  {
    "wordId": 9,
    "englishWord": "abbot",
    "wordType": "noun",
    "turkishMeaning": "başrahip",
    "category1": null,
    "category2": null,
    "category3": null,
    "englishLevel": "A2",
    "sampleSentenceEn": "The abbot leads the monks.",
    "sampleSentenceTr": "Başrahip rahiplere önderlik eder.",
    "isKnown": null
  },
  {
    "wordId": 10,
    "englishWord": "abbreviate",
    "wordType": "verb",
    "turkishMeaning": "kısaltmak",
    "category1": null,
    "category2": null,
    "category3": null,
    "englishLevel": "C1",
    "sampleSentenceEn": "We had to abbreviate the names of the states.",
    "sampleSentenceTr": "Eyaletlerin isimlerini kısaltmak zorunda kaldık.",
    "isKnown": null
  }
]

Now, fill in the empty columns for these words:
${wordsList}

For each word, return a JSON array of objects with these fields:
- englishWord (string) - the word itself
- wordType (string) - e.g., "Noun", "Verb", "Adjective", "Adverb", "Phrase", "Idiom", "Phrasal Verb"
- turkishMeaning (string) - Turkish translation
- category1 (string) - optional subcategory
- category2 (string) - optional subcategory
- category3 (string) - optional subcategory
- englishLevel (string) - one of: "A1", "A2", "B1", "B2", "C1", "C2"
- sampleSentenceEn (string) - example sentence in English using this word
- sampleSentenceTr (string) - example sentence in Turkish translation

IMPORTANT:
- Return ONLY a valid JSON array of objects, nothing else
- No explanations, no conversational messages
- No markdown formatting, no code blocks, no backticks
- Match the format and style of the example records
- Ensure all fields are filled (no null values)
- Start with [ and end with ]`;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-4o-mini', // Cheapest ChatGPT model on OpenRouter
        messages: [
          {
            role: 'system',
            content: 'You are a database column filler. Fill empty columns for English words based on example database records. Return ONLY a valid JSON array of objects. No explanations, no conversational messages, no markdown formatting. Just the JSON array starting with [ and ending with ].'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 16000 // Increased for larger word lists (100 words with all fields)
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

    const aiResponse = response.data.choices[0]?.message?.content?.trim();
    
    if (!aiResponse) {
      throw new Error('Failed to get AI response');
    }

    return {
      response: aiResponse,
      prompt: prompt
    };
  } catch (error) {
    console.error('Error filling word columns with AI:', error.response?.data || error.message);
    throw new Error(`Failed to fill word columns with AI: ${error.message}`);
  }
}

module.exports = {
  generateDeckTitle,
  generateDeckDescription,
  enhanceDeckText,
  processMarkdownWithAI,
  fillWordColumnsWithAI
};

