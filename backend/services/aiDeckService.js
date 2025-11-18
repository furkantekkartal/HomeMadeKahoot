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
async function processMarkdownWithAI(markdownContent, fileType = null, customPrompt = null) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set in environment variables');
  }

  let prompt;
  let systemMessage;

  // Use custom prompt if provided, otherwise build it
  if (customPrompt && customPrompt.trim()) {
    prompt = customPrompt;
    // Determine system message based on file type
    if (fileType === 'pdf') {
      systemMessage = 'You are a content cleaning and vocabulary extraction tool for PDF files and webpages. First, clean the content by removing unnecessary parts (index, ISBN, buttons, links, headers, footers). Then extract vocabulary: 1) Individual words (nouns, verbs, adjectives, adverbs), 2) Common/important idioms (only real idioms with special meaning), 3) Phrasal verbs (verbs with prepositions that have special meaning). DO NOT extract regular phrases that are not idioms or phrasal verbs. Return ONLY plain text. No explanations, no conversational messages, no markdown formatting. Plain text, each word, idiom, or phrasal verb on a new line. One item per line. Just the extracted items, nothing more.';
    } else {
      systemMessage = 'You are a vocabulary extraction tool. Extract: 1) Individual words (nouns, verbs, adjectives, adverbs), 2) Common/important idioms (only real idioms with special meaning), 3) Phrasal verbs (verbs with prepositions that have special meaning). DO NOT extract regular phrases that are not idioms or phrasal verbs. Return ONLY plain text. No explanations, no conversational messages, no markdown formatting. Plain text, each word, idiom, or phrasal verb on a new line. One item per line. Just the extracted items, nothing more.';
    }
  } else if (fileType === 'pdf') {
    // PDF-specific prompt: Clean and extract vocabulary (also used for webpages)
    prompt = `This content was converted from a PDF file or webpage. Your task has two steps:

STEP 1: Clean the content
* Remove unnecessary parts: table of contents, index, ISBN numbers, page numbers, headers, footers
* Remove navigation elements: "click here" buttons, links to other pages, advertisement text
* Remove metadata: publication info, copyright notices (unless relevant to content)
* Keep only the main readable content about the primary topic
** If it's a story book, keep only the story text (no index, ISBN, etc.)
** If it's a newspaper webpage, keep only the news article (no buttons, links, other news)
** If it's a document, keep only the main content (no headers, footers, page numbers)

STEP 2: Extract vocabulary from the cleaned content
Extract ONLY:
1. Individual words (nouns, verbs, adjectives, adverbs) - extract each unique word
2. Common/important idioms (e.g., "break the ice", "hit the nail on the head") - NOT regular phrases
3. Phrasal verbs (e.g., "give up", "look after", "turn down") - verbs with prepositions that have special meaning
4. Always basic form of a verb. For example; "swimming", "swim," "swam," and "swum" " should be swim in your output. Similarly looked, waiting, liked, etc should be lean like look, wait, like etc.
5. Don't return persons names like "John", "Donna", "Smith", etc. Also don't return to city or state name like "Sydney", "NSW", "New York"
6. Don't return the example in this prompt like "break the ice", "idiom example", etc. You should check the text given after "Text to extract from: " part.

DO NOT extract:
* Regular phrases that are not idioms or phrasal verbs
* Common everyday phrases like "going into", "gets three", "snap is good"
* Simple word combinations that don't have special meaning
* Only extract idioms/phrasal verbs that are actually idioms/phrasal verbs with special meanings

IMPORTANT:
* Return ONLY plain text, nothing else
* No explanations, no conversational messages
* No markdown formatting, no code blocks, no backticks
* Each word, idiom, or phrasal verb should be on a new line
* One item per line
* Just the extracted items, nothing more

Example format:
word1
word2
idiom example
phrasal verb

Content converted from PDF or webpage:
${markdownContent}`;

    systemMessage = 'You are a content cleaning and vocabulary extraction tool for PDF files and webpages. First, clean the content by removing unnecessary parts (index, ISBN, buttons, links, headers, footers). Then extract vocabulary: 1) Individual words (nouns, verbs, adjectives, adverbs), 2) Common/important idioms (only real idioms with special meaning), 3) Phrasal verbs (verbs with prepositions that have special meaning). DO NOT extract regular phrases that are not idioms or phrasal verbs. Return ONLY plain text. No explanations, no conversational messages, no markdown formatting. Plain text, each word, idiom, or phrasal verb on a new line. One item per line. Just the extracted items, nothing more.';
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
    "englishWord": "afraid",
    "wordType": "adjective",
    "turkishMeaning": "korkmuş",
    "category1": "Oxford-3000",
    "category2": null,
    "category3": null,
    "englishLevel": "A1",
    "sampleSentenceEn": "She was afraid for her children (= feared that they might be hurt).",
    "sampleSentenceTr": "Çocukları için korkuyordu (= onlara zarar gelmesinden korkuyordu).",
    "isKnown": true
  },
  {
    "wordId": 2,
    "englishWord": "amazing",
    "wordType": "adjective",
    "turkishMeaning": "inanılmaz",
    "category1": "Oxford-3000",
    "category2": null,
    "category3": null,
    "englishLevel": "A1",
    "sampleSentenceEn": "This stain remover really works - it's amazing!",
    "sampleSentenceTr": "Bu leke çıkarıcı gerçekten işe yarıyor - harika!",
    "isKnown": true
  },
 
  {
    "wordId": 3,
    "englishWord": "locate",
    "wordType": "verb",
    "turkishMeaning": "yerini tespit etmek",
    "category1": "Oxford-3000",
    "category2": null,
    "category3": null,
    "englishLevel": "B1",
    "sampleSentenceEn": "Our office is located in midtown Manhattan.",
    "sampleSentenceTr": "Ofisimiz Manhattan'ın merkezinde bulunmaktadır.",
    "isKnown": null
  },
  {
    "wordId": 4,
    "englishWord": "located",
    "wordType": "verb",
    "turkishMeaning": "bulunan",
    "category1": "Oxford-3000",
    "category2": null,
    "category3": null,
    "englishLevel": "B1",
    "sampleSentenceEn": "Our office is located in midtown Manhattan.",
    "sampleSentenceTr": "Ofisimiz Manhattan'ın merkezinde bulunmaktadır.",
    "isKnown": null
  },
  {
    "wordId": 5,
    "englishWord": "grocery",
    "wordType": "noun",
    "turkishMeaning": "bakkal",
    "category1": "Oxford-5000",
    "category2": null,
    "category3": null,
    "englishLevel": "B2",
    "sampleSentenceEn": "America's largest grocery store chain will be bringing two new stores to Oakland.",
    "sampleSentenceTr": "Amerika'nın en büyük market zinciri Oakland'a iki yeni mağaza açıyor.",
    "isKnown": null
  },
  {
    "wordId": 6,
    "englishWord": "guideline",
    "wordType": "noun",
    "turkishMeaning": "kılavuz",
    "category1": "Oxford-5000",
    "category2": null,
    "category3": null,
    "englishLevel": "B2",
    "sampleSentenceEn": "Please follow the guidelines",
    "sampleSentenceTr": "Lütfen yönergeleri izleyin",
    "isKnown": null
  },
  {
    "wordId": 7,
    "englishWord": "loop",
    "wordType": "noun",
    "turkishMeaning": "döngü",
    "category1": "Oxford-5000",
    "category2": null,
    "category3": null,
    "englishLevel": "C1",
    "sampleSentenceEn": "Tie the ends of the rope together in a loop.",
    "sampleSentenceTr": "İpin uçlarını bir ilmek oluşturacak şekilde birbirine bağlayın.",
    "isKnown": null
  },
  {
    "wordId": 8,
    "englishWord": "loyalty",
    "wordType": "noun",
    "turkishMeaning": "bağlılık",
    "category1": "Oxford-5000",
    "category2": null,
    "category3": null,
    "englishLevel": "C1",
    "sampleSentenceEn": "His loyalty was never in question.",
    "sampleSentenceTr": "Sadakati hiçbir zaman sorgulanmadı.",
    "isKnown": null
  },
  {
    "wordId": 9,
    "englishWord": "godless",
    "wordType": "adjective",
    "turkishMeaning": "tanrısız",
    "category1": "Gemini-15000",
    "category2": null,
    "category3": null,
    "englishLevel": "C2",
    "sampleSentenceEn": "The villagers believed he was a godless man.",
    "sampleSentenceTr": "Köylüler onun tanrısız bir adam olduğuna inanıyorlardı.",
    "isKnown": null
  },
  {
    "wordId": 10,
    "englishWord": "wrecking",
    "wordType": "verb",
    "turkishMeaning": "yıkım",
    "category1": "Gemini-15000",
    "category2": null,
    "category3": null,
    "englishLevel": "C2",
    "sampleSentenceEn": "The wrecking ball demolished the old building.",
    "sampleSentenceTr": "Yıkım topu eski binayı yıktı.",
    "isKnown": null
  }
]

Now, fill in the empty columns for these words:
${wordsList}

For each word, return a JSON array of objects with these fields:
- englishWord (string) - the word itself
- wordType (string) - e.g., "Noun", "Verb", "Adjective", "Adverb", "Phrase", "Idiom", "Phrasal Verb"
- turkishMeaning (string) - Turkish translation
- category1 (null) - MUST ALWAYS be null, never fill this field
- category2 (null) - MUST ALWAYS be null, never fill this field
- category3 (string or null) - optional subcategory, you may fill this if relevant, otherwise null
- englishLevel (string) - one of: "A1", "A2", "B1", "B2", "C1", "C2"
- sampleSentenceEn (string) - example sentence in English using this word
- sampleSentenceTr (string) - example sentence in Turkish translation

IMPORTANT:
- Return ONLY a valid JSON array of objects, nothing else
- No explanations, no conversational messages
- No markdown formatting, no code blocks, no backticks
- Match the format and style of the example records
- category1 and category2 MUST ALWAYS be null (never fill these fields)
- category3 can be filled with a relevant subcategory or left as null
- Ensure all other fields are filled (no null values except for category1, category2, and optionally category3)
- Start with [ and end with ]`;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-4o-mini', // Cheapest ChatGPT model on OpenRouter
        messages: [
          {
            role: 'system',
            content: 'You are a database column filler. Fill empty columns for English words based on example database records. IMPORTANT: category1 and category2 must ALWAYS be null - never fill these fields. category3 can be filled optionally. Return ONLY a valid JSON array of objects. No explanations, no conversational messages, no markdown formatting. Just the JSON array starting with [ and ending with ].'
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

/**
 * Generate meaningful source title and description using AI
 * @param {string} originalSourceName - Original source name (e.g., "7news.com.au.md", "9-1-1.Lone.Star.S01e01-en.srt")
 * @param {string} sourceType - Type of source ('pdf', 'srt', 'txt', 'youtube', 'other')
 * @param {string} contentPreview - First 500 characters of the content for context
 * @param {string} url - URL of the webpage (for news articles)
 * @param {string} pageTitle - Page title extracted from the webpage (from Firecrawl)
 * @returns {Promise<{title: string, description: string}>} - Generated title and description
 */
async function generateSourceInfo(originalSourceName, sourceType, contentPreview = '', url = '', pageTitle = '') {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set in environment variables');
  }

  // Log inputs for debugging
  console.log('generateSourceInfo called with:', {
    originalSourceName,
    sourceType,
    contentPreviewLength: contentPreview.length,
    url,
    pageTitle,
    hasPageTitle: !!pageTitle
  });

  // Determine source category based on type, name, and URL
  let sourceCategory = 'Content';
  if (sourceType === 'srt') {
    sourceCategory = 'TvSeries';
  } else if (sourceType === 'youtube') {
    sourceCategory = 'YouTube';
  } else if (sourceType === 'pdf' || sourceType === 'other') {
    // Try to extract domain from URL first (most reliable)
    let domain = '';
    if (url) {
      try {
        const urlObj = new URL(url);
        domain = urlObj.hostname.replace(/^www\./, '');
      } catch (e) {
        // URL parsing failed, try from source name
      }
    }
    
    // If no URL, try to extract from source name
    if (!domain && originalSourceName) {
      const domainMatch = originalSourceName.match(/([a-zA-Z0-9-]+\.(com|com\.au|org|net|co\.uk))/);
      if (domainMatch) {
        domain = domainMatch[1];
      }
    }
    
    // Determine category based on domain
    if (domain) {
      // Extract base domain (e.g., "bbc" from "bbc.com")
      const baseDomain = domain.split('.')[0].toLowerCase();
      
      // Map common news domains
      if (baseDomain === 'bbc') {
        sourceCategory = 'BBC News';
      } else if (baseDomain === '7news' || baseDomain === '7') {
        sourceCategory = '7News';
      } else if (baseDomain.includes('news')) {
        sourceCategory = baseDomain.charAt(0).toUpperCase() + baseDomain.slice(1);
      } else if (domain.includes('news') || domain.includes('.com.au') || domain.includes('.com')) {
        // Generic news site
        sourceCategory = baseDomain.charAt(0).toUpperCase() + baseDomain.slice(1) + ' News';
      } else {
        sourceCategory = 'Document';
      }
    } else if (originalSourceName.includes('news') || originalSourceName.includes('.com.au') || originalSourceName.includes('.com')) {
      sourceCategory = '7News'; // Default fallback
    } else {
      sourceCategory = 'Document';
    }
  }

  // For news/webpages, we need to extract the actual headline from URL
  // For TV series, we can use the filename pattern
  const isNewsOrWebpage = (sourceType === 'pdf' || sourceType === 'other') && 
                          (originalSourceName.includes('news') || originalSourceName.includes('.com') || originalSourceName.includes('.com.au') || url);
  
  let prompt;
  if (isNewsOrWebpage && url) {
    // Check if URL has meaningful slug or if we have page title
    const urlPath = new URL(url).pathname;
    const urlSlug = urlPath.split('/').pop() || '';
    const hasMeaningfulSlug = urlSlug && urlSlug.length > 10 && !/^[a-z0-9]+$/i.test(urlSlug); // Not just random ID
    
    if (pageTitle && pageTitle.trim()) {
      // Use page title extracted from Firecrawl
      prompt = `You are analyzing a news article. Use the page title provided below to generate a meaningful source title.

URL: "${url}"
Page Title: "${pageTitle}"
Original source name: "${originalSourceName}"
Source type: ${sourceType}

Your task:
1. Use the page title provided above - it's the actual headline from the webpage
2. Extract a specific 4-5 word headline from the page title
3. Examples:
   - Page Title: "A Chinese firm bought an insurer for CIA agents - part of Beijing's trillion dollar spending spree"
     Headline: "Chinese Firm Bought CIA Insurer"
   - Page Title: "TPG Confirms Fatal 000 Failure in Emergency Services"
     Headline: "TPG Confirms Fatal 000 Failure"
   - Page Title: "Lachlan Young Sentenced to 28 Years for Murder"
     Headline: "Lachlan Young Sentenced to 28 Years"
   
4. DO NOT use generic descriptions like:
   - "Comprehensive Coverage of News"
   - "Latest News Updates"
   - "News and Lifestyle"
   - "Breaking News Stories"

5. Extract the core 4-5 word headline from the page title, removing any extra context or subtitles.

Generate:
1. Title: Format as "${sourceCategory} | [4-5 word specific headline]" (e.g., "BBC News | Chinese Firm Bought CIA Insurer")
2. Description: A short, specific description (1-2 sentences) about what this article is actually about

Return ONLY a JSON object with this exact structure:
{
  "title": "Generated title here",
  "description": "Generated description here"
}

No explanations, no markdown, just the JSON object.`;
    } else if (hasMeaningfulSlug) {
      // URL has meaningful slug - extract from URL
      prompt = `You are analyzing a news article URL. Extract the actual news headline or main topic from the URL.

URL: "${url}"
Original source name: "${originalSourceName}"
Source type: ${sourceType}

Your task:
1. Analyze the URL and extract the main news headline or topic
2. News URLs often contain the headline in the path or slug (the part after the domain)
3. Extract a specific 4-5 word headline that describes what the article is actually about
4. Examples of good headlines from URLs:
   - URL: "https://7news.com.au/news/lachlan-young-sentenced-to-28-years-for-the-murder-of-hannah-mcguire"
     Headline: "Lachlan Young Sentenced to 28 Years"
   - URL: "https://7news.com.au/news/tpg-confirms-fatal-000-failure"
     Headline: "TPG Confirms Fatal 000 Failure"
   - URL: "https://news.com.au/article/new-covid-restrictions-announced"
     Headline: "New COVID Restrictions Announced"
   
5. DO NOT use generic descriptions like:
   - "Comprehensive Coverage of News"
   - "Latest News Updates"
   - "News and Lifestyle"
   - "Breaking News Stories"
   - Just the domain name or website name

6. Extract the actual article topic from the URL path/slug. Convert URL slugs (with hyphens) to readable headlines.

Generate:
1. Title: Format as "${sourceCategory} | [4-5 word specific headline]" (e.g., "7News | TPG Confirms Fatal 000 Failure")
2. Description: A short, specific description (1-2 sentences) about what this article is actually about

Return ONLY a JSON object with this exact structure:
{
  "title": "Generated title here",
  "description": "Generated description here"
}

No explanations, no markdown, just the JSON object.`;
    } else {
      // URL doesn't have meaningful slug - use content preview
      prompt = `You are analyzing a news article. The URL doesn't contain a meaningful headline, so read the content below to extract the actual news headline.

URL: "${url}"
Original source name: "${originalSourceName}"
Source type: ${sourceType}

Content (first 1000 characters):
${contentPreview.substring(0, 1000)}

Your task:
1. Read the content carefully and identify the main news headline or topic
2. Extract a specific 4-5 word headline that describes what the article is actually about
3. Look for the main headline in the content (usually at the beginning)
4. Examples of good headlines:
   - "Chinese Firm Bought CIA Insurer"
   - "TPG Confirms Fatal 000 Failure"
   - "Lachlan Young Sentenced to 28 Years"
   
5. DO NOT use generic descriptions like:
   - "Comprehensive Coverage of News"
   - "Latest News Updates"
   - "News and Lifestyle"
   - "Breaking News Stories"

Generate:
1. Title: Format as "${sourceCategory} | [4-5 word specific headline]" (e.g., "BBC News | Chinese Firm Bought CIA Insurer")
2. Description: A short, specific description (1-2 sentences) about what this article is actually about

Return ONLY a JSON object with this exact structure:
{
  "title": "Generated title here",
  "description": "Generated description here"
}

No explanations, no markdown, just the JSON object.`;
    }
  } else if (sourceType === 'youtube') {
    // For YouTube videos: Use video title and content
    prompt = `Generate a meaningful title and description for this YouTube video.

Video Title: "${pageTitle || originalSourceName}"
Original source name: "${originalSourceName}"
Source type: ${sourceType}

Content (first 1000 characters):
${contentPreview.substring(0, 1000)}

Your task:
1. Use the video title provided above as the main title
2. Extract a specific 4-5 word headline from the video title if it's long
3. Examples:
   - Video Title: "How to Learn English Fast - 10 Tips for Beginners"
     Headline: "Learn English Fast Tips"
   - Video Title: "BBC News - Breaking: Major Event Happens"
     Headline: "BBC News Major Event"
   - Video Title: "English Conversation Practice - Daily Dialogues"
     Headline: "English Conversation Practice"
   
4. DO NOT use generic descriptions like:
   - "YouTube Video Content"
   - "Video Transcript"
   - "Online Video"

Generate:
1. Title: Format as "${sourceCategory} | [4-5 word specific headline]" (e.g., "YouTube | Learn English Fast Tips")
2. Description: A short, specific description (1-2 sentences) about what this video is about

Return ONLY a JSON object with this exact structure:
{
  "title": "Generated title here",
  "description": "Generated description here"
}

No explanations, no markdown, just the JSON object.`;
  } else if (sourceType === 'srt') {
    // For TV series: Use filename pattern
    prompt = `Generate a meaningful title and description for this TV series subtitle file.

Original source name: "${originalSourceName}"
Source type: ${sourceType}

Generate:
1. Title: Format as "TvSeries or Movie | [Series or Movie Name] [Season Episode]" (e.g., "TvSeries | 9-1-1 Lone Star S01E01")
   - Extract series or movie name and episode info from the filename
   - Format season/episode as S##E## (e.g., S01E01, S02E05)
   - If it's a movie, format as "Movie | [Movie Name]" (e.g., "Movie | The Dark Knight")

2. Description: A short description (1-2 sentences) about this TV series episode.

Return ONLY a JSON object with this exact structure:
{
  "title": "Generated title here",
  "description": "Generated description here"
}

No explanations, no markdown, just the JSON object.`;
  } else {
    // For other content types
    prompt = `Generate a meaningful title and description for this English learning source.

Original source name: "${originalSourceName}"
Source type: ${sourceType}
Source category: ${sourceCategory}

${contentPreview ? `Content preview (first 500 chars):\n${contentPreview.substring(0, 500)}` : ''}

Generate:
1. Title: A meaningful, concise title in the format "[Category] | [Brief Description]"
2. Description: A short, appropriate description (1-2 sentences) explaining what this source is about.

Return ONLY a JSON object with this exact structure:
{
  "title": "Generated title here",
  "description": "Generated description here"
}

No explanations, no markdown, just the JSON object.`;
  }

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that generates meaningful titles and descriptions for English learning sources. Return ONLY valid JSON, no explanations, no markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 300
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

    const responseText = response.data.choices[0]?.message?.content?.trim();
    
    if (!responseText) {
      throw new Error('Failed to generate source info');
    }

    // Extract JSON from response (might be wrapped in markdown code blocks)
    let jsonText = responseText;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const result = JSON.parse(jsonText);
    
    return {
      title: result.title || `${sourceCategory} | ${originalSourceName}`,
      description: result.description || `English learning content from ${originalSourceName}`
    };
  } catch (error) {
    console.error('Error generating source info:', error.response?.data || error.message);
    // Fallback
    const fallbackTitle = sourceType === 'srt' 
      ? `TvSeries | ${originalSourceName.replace(/\.srt$/i, '')}`
      : sourceType === 'other' && originalSourceName.includes('news')
      ? `7News | ${originalSourceName.replace(/\.md$/i, '')}`
      : `${sourceCategory} | ${originalSourceName}`;
    
    return {
      title: fallbackTitle,
      description: `English learning content from ${originalSourceName}`
    };
  }
}

module.exports = {
  generateDeckTitle,
  generateDeckDescription,
  enhanceDeckText,
  processMarkdownWithAI,
  fillWordColumnsWithAI,
  generateSourceInfo
};

