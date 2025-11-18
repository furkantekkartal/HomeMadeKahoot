import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { wordAPI, flashcardAPI } from '../services/api';
import { DECK_LEVELS, DECK_SKILLS, DECK_TASKS } from '../constants/deckConstants';
import './CreateDeck.css';

// Build AI prompt based on file type and content (moved outside component for better performance)
const buildAIPrompt = (content, fileType) => {
  if (!content) return '';
  
  const isPDF = fileType === 'pdf';
  
  if (isPDF) {
    return `This content was converted from a PDF file or webpage. Your task has two steps:

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
4. Always basic form of a verb. For example; "swimming", "swim," "swam," and "swum" " should be swim in your output. Similarly looked, waiting, liked, etc should be lean like look, wait, like etc.
5. Don't return persons names like "John", "Donna", "Smith", etc. Also don't return to city or state name like "Sydney", "NSW", "New York"
6. Don't return the example in this prompt like "break the ice", "idiom example", etc. You should check the text given after "Content converted from... " part.


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

Content converted from PDF or webpage:
${content}`;
  } else {
    return `Extract vocabulary from the following text. Extract ONLY:

1. Individual words (nouns, verbs, adjectives, adverbs) - extract each unique word
2. Common/important idioms (e.g., "break the ice", "hit the nail on the head") - NOT regular phrases
3. Phrasal verbs (e.g., "give up", "look after", "turn down") - verbs with prepositions that have special meaning
4. Always basic form of a verb. For example; "swimming", "swim," "swam," and "swum" " should be swim in your output. Similarly looked, waiting, liked, etc should be lean like look, wait, like etc.
5. Don't return persons names like "John", "Donna", "Smith", etc. Also don't return to city or state name like "Sydney", "NSW", "New York"
6. Don't return the example in this prompt like "break the ice", "idiom example", etc. You should check the text given after "Text to extract from: " part.

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
${content}`;
  }
};

const CreateDeck = () => {
  const navigate = useNavigate();
  const [words, setWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [selectingAllFiltered, setSelectingAllFiltered] = useState(false);
  const [allFilteredWordIds, setAllFilteredWordIds] = useState(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deckName, setDeckName] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [level, setLevel] = useState('');
  const [skill, setSkill] = useState('');
  const [task, setTask] = useState('');
  const [deckType, setDeckType] = useState('dynamic');
  const [questionNumber, setQuestionNumber] = useState(20);
  const [creating, setCreating] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    englishLevel: '',
    wordType: '',
    category1: '',
    category2: '',
    sourceId: '',
    showKnown: true,
    showUnknown: true
  });
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    englishLevel: '',
    wordType: '',
    category1: '',
    category2: '',
    sourceId: '',
    showKnown: true,
    showUnknown: true
  });
  const [sources, setSources] = useState([]);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [generatingFromSource, setGeneratingFromSource] = useState(false);
  const [processingSummary, setProcessingSummary] = useState(null);
  const [processingLogs, setProcessingLogs] = useState([]);
  
  // Debug mode states
  const [debugFile, setDebugFile] = useState(null);
  const [debugFileContent, setDebugFileContent] = useState('');
  const [debugCleanedContent, setDebugCleanedContent] = useState('');
  const [debugConvertedContent, setDebugConvertedContent] = useState('');
  const [debugLogs, setDebugLogs] = useState([]);
  const [debugAIResponse, setDebugAIResponse] = useState('');
  const [debugAIPrompt, setDebugAIPrompt] = useState('');
  const [editableAIPrompt, setEditableAIPrompt] = useState('');
  const [isPromptExpanded, setIsPromptExpanded] = useState(false);
  const [sendingToAI, setSendingToAI] = useState(false);
  const [addingWords, setAddingWords] = useState(false);
  const [fillingColumns, setFillingColumns] = useState(false);
  const [convertingPDF, setConvertingPDF] = useState(false);
  const [webpageUrl, setWebpageUrl] = useState('');
  const [convertingWebpage, setConvertingWebpage] = useState(false);
  const [testingTitle, setTestingTitle] = useState(false);
  const [testTitleResult, setTestTitleResult] = useState(null);
  const [webpagePageTitle, setWebpagePageTitle] = useState(''); // Store page title from Firecrawl
  
  // Content Preview states
  const [originalFileContent, setOriginalFileContent] = useState('');
  const [originalFileTimestamp, setOriginalFileTimestamp] = useState(null);
  const [cleanedFileTimestamp, setCleanedFileTimestamp] = useState(null);
  const [firstAIPromptTimestamp, setFirstAIPromptTimestamp] = useState(null);
  const [firstAIResponseTimestamp, setFirstAIResponseTimestamp] = useState(null);
  const [databaseResults, setDatabaseResults] = useState(null);
  const [databaseTimestamp, setDatabaseTimestamp] = useState(null);
  const [secondAIPromptTimestamp, setSecondAIPromptTimestamp] = useState(null);
  const [secondAIResponseTimestamp, setSecondAIResponseTimestamp] = useState(null);
  const [secondAIPrompt, setSecondAIPrompt] = useState('');
  const [secondAIResponse, setSecondAIResponse] = useState('');
  const [addedWordsBatches, setAddedWordsBatches] = useState([]);
  const [fillColumnsBatches, setFillColumnsBatches] = useState([]);
  const [skippedWords, setSkippedWords] = useState([]);

  useEffect(() => {
    loadData();
    loadSources();
  }, [page, appliedFilters]);

  const loadSources = async () => {
    try {
      const response = await wordAPI.getSources();
      setSources(response.data.sources || []);
    } catch (error) {
      console.error('Error loading sources:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await wordAPI.getWordsWithStatus({
        page,
        limit: 50,
        ...appliedFilters,
        sourceId: appliedFilters.sourceId || undefined,
        showKnown: appliedFilters.showKnown ? 'true' : 'false',
        showUnknown: appliedFilters.showUnknown ? 'true' : 'false'
      });
      
      setWords(response.data.words);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load words');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
    setPage(1);
    // Clear all filtered words selection when filters change
    setAllFilteredWordIds(new Set());
  };

  const handleSelectWord = (wordId) => {
    setSelectedWords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(wordId)) {
        newSet.delete(wordId);
      } else {
        newSet.add(wordId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedWords.size === words.length && words.length > 0) {
      // Deselect all words on current page
      words.forEach(word => {
        setSelectedWords(prev => {
          const newSet = new Set(prev);
          newSet.delete(word._id);
          return newSet;
        });
      });
    } else {
      // Select all words on current page
      words.forEach(word => {
        setSelectedWords(prev => new Set([...prev, word._id]));
      });
    }
  };

  const handleSelectAllFiltered = async () => {
    // Check if all filtered words are already selected
    const allFilteredSelected = allFilteredWordIds.size > 0 && 
      Array.from(allFilteredWordIds).every(id => selectedWords.has(id));

    if (allFilteredSelected) {
      // Deselect all filtered words
      setSelectedWords(prev => {
        const newSet = new Set(prev);
        allFilteredWordIds.forEach(id => newSet.delete(id));
        return newSet;
      });
      setAllFilteredWordIds(new Set());
      return;
    }

    try {
      setSelectingAllFiltered(true);
      
      // Fetch all words matching the current filters (without pagination)
      const allWords = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await wordAPI.getWordsWithStatus({
          page: currentPage,
          limit: 1000, // Large limit to reduce API calls
          ...appliedFilters,
          sourceId: appliedFilters.sourceId || undefined,
          showKnown: appliedFilters.showKnown ? 'true' : 'false',
          showUnknown: appliedFilters.showUnknown ? 'true' : 'false'
        });

        const pageWords = response.data.words || [];
        allWords.push(...pageWords);

        const totalPages = response.data.pagination?.pages || 1;
        if (currentPage >= totalPages || pageWords.length === 0) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }

      // Extract all word IDs
      const allWordIds = allWords.map(word => word._id);
      const allWordIdsSet = new Set(allWordIds);
      setAllFilteredWordIds(allWordIdsSet);

      // Select all filtered words
      setSelectedWords(prev => new Set([...prev, ...allWordIds]));
    } catch (error) {
      console.error('Error selecting all filtered words:', error);
      alert('Failed to select all filtered words: ' + (error.response?.data?.message || error.message));
    } finally {
      setSelectingAllFiltered(false);
    }
  };

  const handleGenerateFromFile = async () => {
    if (!uploadedFile) {
      alert('Please select a file first');
      return;
    }

    setGeneratingFromSource(true);
    setProcessingSummary(null);
    setProcessingLogs([]);
    const startTime = Date.now();

    try {
      // Add log for file taken
      setProcessingLogs(prev => [...prev, `✓ File taken: ${uploadedFile.name}`]);
      setProcessingLogs(prev => [...prev, `⏳ Uploading file to server...`]);
      setProcessingLogs(prev => [...prev, `⏳ File size: ${(uploadedFile.size / 1024).toFixed(2)} KB`]);
      
      const response = await flashcardAPI.generateDeckFromFile(uploadedFile);
      const result = response.data;
      
      // Add logs from response (they already include initial logs)
      if (result.logs && Array.isArray(result.logs)) {
        setProcessingLogs(prev => [...prev, ...result.logs]);
      }
      
      const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
      setProcessingSummary({
        sourceName: uploadedFile.name,
        totalWords: result.totalWords,
        existingWords: result.existingWords,
        newWords: result.newWords,
        allColumnsFilled: result.allColumnsFilled,
        processingTime,
        categoryTag: result.categoryTag
      });
      
      const fileName = uploadedFile.name;
      setUploadedFile(null);
      
      // Reload sources to include the newly created source
      await loadSources();
      
      // Refresh the page data
      await loadData();
      
      // Wait a bit for data to load, then select words
      setTimeout(async () => {
        const response = await wordAPI.getWordsWithStatus({
          page: 1,
          limit: 50,
          // Source filtering is handled via sourceId now
          showKnown: 'true',
          showUnknown: 'true'
        });
        
        const filteredWords = response.data.words || [];
        const wordsToSelect = filteredWords.slice(0, 50).map(w => w._id);
        setSelectedWords(new Set(wordsToSelect));
        
        // Auto-fill deck information based on source
        const fileExt = fileName?.toLowerCase().split('.').pop() || '';
        const baseName = result.categoryTag?.split('-Part')[0] || fileName?.replace(/\.[^/.]+$/, '') || 'New Deck';
        
        // Remove emoji from title/description if any
        const cleanTitle = baseName.replace(/[✨🎯📚🎓💡🔥⭐🌟]/g, '').trim();
        setDeckName(cleanTitle);
        
        // Generate description based on source
        let sourceDescription = '';
        if (fileExt === 'srt') {
          sourceDescription = `Flashcard deck created from SRT subtitle file: ${baseName}`;
        } else if (fileExt === 'pdf') {
          sourceDescription = `Flashcard deck created from PDF file: ${baseName}`;
        } else if (fileExt === 'xlsx' || fileExt === 'xls') {
          sourceDescription = `Flashcard deck created from Excel file: ${baseName}`;
        } else {
          sourceDescription = `Flashcard deck created from file: ${baseName}`;
        }
        setDeckDescription(sourceDescription);
        
        // Guess skill based on file type
        if (fileExt === 'srt') {
          setSkill('Listening');
        } else if (fileExt === 'pdf') {
          setSkill('Reading');
        } else {
          setSkill('Listening'); // Default for other types
        }
        
        // Guess task (default: Vocabulary)
        setTask('Vocabulary');
        
        // Guess level from selected words (highest level)
        if (wordsToSelect.length > 0) {
          const selectedWordObjects = filteredWords.filter(w => wordsToSelect.includes(w._id));
          const levels = selectedWordObjects.map(w => w.englishLevel).filter(l => l);
          if (levels.length > 0) {
            const levelOrder = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
            const sortedLevels = levels.sort((a, b) => levelOrder.indexOf(b) - levelOrder.indexOf(a));
            setLevel(sortedLevels[0]);
          }
        }
        
        // Set question number to selected word count (max 50)
        setQuestionNumber(Math.min(wordsToSelect.length, 50));
      }, 1000);
    } catch (error) {
      console.error('Error generating deck from file:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to process file';
      setProcessingLogs(prev => [...prev, `✗ Error: ${errorMessage}`]);
      alert('Error: ' + errorMessage);
    } finally {
      setGeneratingFromSource(false);
    }
  };


  const handleCreateDeck = async () => {
    if (!deckName.trim()) {
      alert('Please enter a deck name');
      return;
    }

    if (selectedWords.size === 0) {
      alert('Please select at least one word');
      return;
    }

    try {
      setCreating(true);
      await flashcardAPI.createDeck(
        deckName.trim(),
        deckDescription.trim(),
        level || null,
        skill || null,
        task || null,
        deckType,
        Array.from(selectedWords)
      );
      alert('Deck created successfully!');
      navigate(-1); // Go back to previous page
    } catch (error) {
      console.error('Error creating deck:', error);
      alert('Failed to create deck: ' + (error.response?.data?.message || error.message));
    } finally {
      setCreating(false);
    }
  };

  const allSelected = words.length > 0 && words.every(word => selectedWords.has(word._id));
  const someSelected = words.some(word => selectedWords.has(word._id)) && !allSelected;

  // Debug functions
  const addDebugLog = (message, indent = false) => {
    const timestamp = new Date().toLocaleTimeString();
    // Always add timestamp, but use indentation for visual hierarchy
    // Main entries: [HH:MM:SS] message
    // Indented entries: align timestamp with main timestamp (10 spaces for visual indentation)
    // This creates: [12:07:47] main message
    //               [12:07:47] indented message (aligned timestamps)
    const prefix = indent ? `[${timestamp}]    ` : `[${timestamp}]`;
    setDebugLogs(prev => [...prev, `${prefix} ${message}`]);
  };

  const handleDebugFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.toLowerCase().split('.').pop();
    if (ext !== 'srt' && ext !== 'txt' && ext !== 'pdf') {
      alert('Please upload a SRT, TXT, or PDF file');
      return;
    }

    setDebugFile(file);
    setDebugFileContent('');
    setDebugCleanedContent('');
    setDebugConvertedContent('');
    setDebugLogs([]);
    setWebpageUrl(''); // Clear webpage URL when file is uploaded
    setOriginalFileContent('');
    setOriginalFileTimestamp(null);
    setCleanedFileTimestamp(null);
    setFirstAIPromptTimestamp(null);
    setFirstAIResponseTimestamp(null);
    setDatabaseResults(null);
    setDatabaseTimestamp(null);
    setSecondAIPromptTimestamp(null);
    setSecondAIResponseTimestamp(null);
    setSecondAIPrompt('');
    setSecondAIResponse('');
    setAddedWordsBatches([]);
    setFillColumnsBatches([]);
    setSkippedWords([]);
    
    addDebugLog(`📁 File selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
    
    if (ext === 'pdf') {
      // Convert PDF to MD using backend
      setConvertingPDF(true);
      addDebugLog('📄 Converting PDF to Markdown...', true);
      try {
        const response = await flashcardAPI.convertPDFToMD(file);
        const mdContent = response.data.markdownContent;
        setDebugConvertedContent(mdContent);
        setOriginalFileContent(mdContent.substring(0, 200));
        setOriginalFileTimestamp(new Date());
        addDebugLog(`Conversion completed: ${mdContent.length} characters`, true);
      } catch (error) {
        console.error('Error converting PDF:', error);
        addDebugLog(`❌ Error converting PDF: ${error.response?.data?.error || error.message}`);
      } finally {
        setConvertingPDF(false);
      }
    } else {
      // Read SRT or TXT file as text
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target.result;
        setDebugFileContent(content);
        setOriginalFileContent(content.substring(0, 200));
        setOriginalFileTimestamp(new Date());
        addDebugLog(`File loaded: ${content.length} characters`, true);
      };
      reader.onerror = () => {
        addDebugLog('❌ Error reading file');
      };
      reader.readAsText(file);
    }
  };

  const handleConvertWebpage = async () => {
    if (!webpageUrl.trim()) {
      alert('Please enter a webpage URL');
      return;
    }

    // Validate URL format
    try {
      new URL(webpageUrl.trim());
    } catch (e) {
      alert('Please enter a valid URL (e.g., https://example.com)');
      return;
    }

    setConvertingWebpage(true);
    addDebugLog(`🌐 Converting webpage to Markdown: ${webpageUrl}`);
    
    // Clear previous content
    setDebugFile(null);
    setDebugFileContent('');
    setDebugCleanedContent('');
    setDebugConvertedContent('');
    setOriginalFileContent('');
    setDatabaseResults(null);
    setSecondAIPrompt('');
    setSecondAIResponse('');
    setAddedWordsBatches([]);
    setFillColumnsBatches([]);
    setSkippedWords([]);
    setWebpagePageTitle(''); // Clear page title
    
    try {
      const response = await flashcardAPI.convertWebpageToMD(webpageUrl.trim());
      const mdContent = response.data.markdownContent;
      const fileName = response.data.fileName || 'webpage.md';
      const pageTitle = response.data.pageTitle || ''; // Store extracted page title
      
      setDebugConvertedContent(mdContent);
      setOriginalFileContent(mdContent.substring(0, 200));
      setOriginalFileTimestamp(new Date());
      setWebpagePageTitle(pageTitle); // Store page title separately
      
      // Create a virtual file object for consistency
      const virtualFile = {
        name: fileName,
        size: mdContent.length,
        type: 'text/markdown'
      };
      setDebugFile(virtualFile);
      
      addDebugLog(`Conversion completed: ${mdContent.length} characters`, true);
      addDebugLog(`Webpage converted successfully: ${fileName}`, true);
      if (pageTitle) {
        addDebugLog(`Page title extracted: ${pageTitle}`, true);
      }
    } catch (error) {
      console.error('Error converting webpage:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to convert webpage';
      addDebugLog(`❌ Error converting webpage: ${errorMessage}`);
      alert('Error: ' + errorMessage);
    } finally {
      setConvertingWebpage(false);
    }
  };

  const handleConvertToMD = () => {
    // For PDF files, conversion is done during upload
    const ext = debugFile?.name.toLowerCase().split('.').pop();
    if (ext === 'pdf') {
      if (debugConvertedContent) {
        addDebugLog('ℹ️ PDF already converted to Markdown during upload.');
      } else {
        addDebugLog('❌ PDF conversion failed. Please try uploading again.');
      }
      return;
    }

    if (!debugFileContent) {
      addDebugLog('❌ No file content to convert. Please upload a file first.');
      return;
    }

    addDebugLog('🔄 Converting to Markdown format...');
    
    // Convert raw file content to MD format
    const mdContent = `# ${debugFile?.name || 'Document'}\n\n${debugFileContent}`;
    
    setDebugConvertedContent(mdContent);
    addDebugLog(`Conversion completed: ${mdContent.length} characters`, true);
  };

  const handleCleanSRT = () => {
    // Clean the converted MD content
    if (!debugConvertedContent) {
      addDebugLog('❌ No Markdown content to clean. Please convert the file first.');
      return;
    }

    addDebugLog('🧹 Cleaning Markdown file...');
    
    // SRT format structure (that might be in the MD content):
    // 1. Sequence number (e.g., "1")
    // 2. Blank line
    // 3. Timestamp (e.g., "00:00:17,347 --> 00:00:19,542")
    // 4. Blank line
    // 5. Subtitle text (can be multiple lines)
    // 6. Blank line (separator)
    
    const lines = debugConvertedContent.split('\n');
    const textBlocks = [];
    let currentBlock = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i].trim();
      
      // Skip empty lines (they separate blocks)
      if (line === '') {
        // If we have collected text, save it as a block
        if (currentBlock.length > 0) {
          textBlocks.push(currentBlock.join('\n'));
          currentBlock = [];
        }
        i++;
        continue;
      }
      
      // Check if it's a sequence number (just digits)
      if (/^\d+$/.test(line)) {
        i++;
        continue; // Skip sequence number
      }
      
      // Check if it's a timestamp line (contains --> or time pattern)
      if (/\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/.test(line)) {
        i++;
        continue; // Skip timestamp line
      }
      
      // Check if it's a timestamp pattern without arrow (some formats)
      if (/^\d{2}:\d{2}:\d{2}[,.]\d{3}/.test(line)) {
        i++;
        continue; // Skip timestamp line
      }
      
      // It's text content - add it to current block
      currentBlock.push(lines[i]); // Keep original line (with potential formatting)
      i++;
    }
    
    // Don't forget the last block if file doesn't end with blank line
    if (currentBlock.length > 0) {
      textBlocks.push(currentBlock.join('\n'));
    }
    
    // Join all text blocks with double newlines
    let cleaned = textBlocks.join('\n\n');
    
    // Remove HTML tags
    cleaned = cleaned.replace(/<[^>]+>/g, '');
    
    // Remove any remaining timestamp patterns
    cleaned = cleaned.replace(/\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/g, '');
    
    // Remove standalone sequence numbers
    cleaned = cleaned.replace(/^\d+\s*$/gm, '');
    
    // Normalize whitespace: remove trailing spaces from lines
    cleaned = cleaned.split('\n').map(line => line.trimEnd()).join('\n');
    
    // Remove excessive blank lines (more than 2 consecutive)
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    // Final trim
    cleaned = cleaned.trim();
    
    setDebugCleanedContent(cleaned);
    setCleanedFileTimestamp(new Date());
    addDebugLog(`Cleaning completed: Original: ${debugConvertedContent.length} chars → Cleaned: ${cleaned.length} chars`, true);
  };

  const handleTestTitle = async () => {
    setTestingTitle(true);
    setTestTitleResult(null);
    addDebugLog('🧪 Testing title generation...');
    
    try {
      // Determine file type
      const ext = debugFile?.name.toLowerCase().split('.').pop() || 'webpage';
      const isPDF = ext === 'pdf';
      const isWebpage = webpageUrl && webpageUrl.trim() !== '';
      const isSRT = ext === 'srt';
      const isTXT = ext === 'txt';
      
      let contentToUse = '';
      let sourceName = debugFile?.name || 'Unknown Source';
      let sourceType = 'other';
      let urlForTitle = null;
      
      // Handle PDF conversion if needed
      if (isPDF && !debugConvertedContent) {
        addDebugLog('📄 Converting PDF to Markdown first...', true);
        try {
          const response = await flashcardAPI.convertPDFToMD(debugFile);
          const mdContent = response.data.markdownContent;
          setDebugConvertedContent(mdContent);
          addDebugLog(`PDF converted: ${mdContent.length} characters`, true);
          contentToUse = mdContent;
        } catch (error) {
          addDebugLog(`❌ Error converting PDF: ${error.response?.data?.error || error.message}`, true);
          throw error;
        }
      }
      
      // Handle webpage conversion if needed
      if (isWebpage && !debugConvertedContent) {
        addDebugLog('🌐 Converting webpage to Markdown first...', true);
        try {
          const response = await flashcardAPI.convertWebpageToMD(webpageUrl.trim());
          const mdContent = response.data.markdownContent;
          setDebugConvertedContent(mdContent);
          addDebugLog(`Webpage converted: ${mdContent.length} characters`, true);
          contentToUse = mdContent;
          urlForTitle = webpageUrl.trim();
        } catch (error) {
          addDebugLog(`❌ Error converting webpage: ${error.response?.data?.error || error.message}`, true);
          throw error;
        }
      }
      
      // Determine content to use
      if (isPDF || isWebpage) {
        contentToUse = debugConvertedContent || debugFileContent || '';
        sourceType = isPDF ? 'pdf' : 'other';
      } else {
        // For SRT/TXT, prefer cleaned content, but if not available, clean it now
        if ((isSRT || isTXT) && !debugCleanedContent && debugConvertedContent) {
          addDebugLog('🧹 Cleaning content first...', true);
          // Do cleaning inline
          const lines = debugConvertedContent.split('\n');
          const textBlocks = [];
          let currentBlock = [];
          let i = 0;
          
          while (i < lines.length) {
            const line = lines[i].trim();
            if (line === '') {
              if (currentBlock.length > 0) {
                textBlocks.push(currentBlock.join('\n'));
                currentBlock = [];
              }
              i++;
              continue;
            }
            if (/^\d+$/.test(line) || /\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/.test(line) || /^\d{2}:\d{2}:\d{2}[,.]\d{3}/.test(line)) {
              i++;
              continue;
            }
            currentBlock.push(lines[i]);
            i++;
          }
          if (currentBlock.length > 0) {
            textBlocks.push(currentBlock.join('\n'));
          }
          
          let cleaned = textBlocks.join('\n\n');
          cleaned = cleaned.replace(/<[^>]+>/g, '');
          cleaned = cleaned.replace(/\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/g, '');
          cleaned = cleaned.replace(/^\d+\s*$/gm, '');
          cleaned = cleaned.split('\n').map(line => line.trimEnd()).join('\n');
          cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
          cleaned = cleaned.trim();
          
          contentToUse = cleaned;
          addDebugLog(`Cleaning completed: ${cleaned.length} characters`, true);
        } else {
          contentToUse = debugCleanedContent || debugConvertedContent || debugFileContent || '';
        }
        sourceType = isSRT ? 'srt' : isTXT ? 'txt' : 'other';
      }
      
      if (!contentToUse && !isWebpage) {
        addDebugLog('❌ No content available. Please upload and convert/clean the file first.');
        return;
      }
      
      // Get URL and page title for webpage
      if (isWebpage && webpageUrl) {
        urlForTitle = webpageUrl.trim();
      }
      const pageTitleForTest = webpagePageTitle || null;
      
      // Call test endpoint
      addDebugLog('🤖 Generating title and description...', true);
      const response = await wordAPI.testSourceTitle(
        sourceName,
        sourceType,
        contentToUse.substring(0, 1000),
        urlForTitle,
        pageTitleForTest
      );
      
      const result = response.data.sourceInfo;
      setTestTitleResult(result);
      addDebugLog(`✅ Title generated: ${result.title}`, true);
      addDebugLog(`📝 Description: ${result.description}`, true);
      
    } catch (error) {
      console.error('Error testing title:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to generate title';
      addDebugLog(`❌ Error: ${errorMessage}`);
      setTestTitleResult({ error: errorMessage });
    } finally {
      setTestingTitle(false);
    }
  };

  const clearDebugLogs = () => {
    setDebugLogs([]);
  };

  const handleAddWordsToDatabase = async () => {
    if (!debugAIResponse) {
      addDebugLog('❌ No AI response to add. Please extract words first.');
      return;
    }

    setAddingWords(true);
    addDebugLog('📊 Adding words to database in batches of 100...');
    
    try {
      // Parse AI response (plain text, one word per line)
      const allWords = debugAIResponse
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0); // Remove empty lines

      if (allWords.length === 0) {
        addDebugLog('❌ No words found in AI response');
        return;
      }

      // Get source file information
      const sourceName = debugFile?.name || 'Unknown Source';
      // Determine sourceType: check if it's a webpage first, then check file extension
      let sourceType = 'other';
      if (webpageUrl && webpageUrl.trim() !== '') {
        sourceType = 'other'; // Webpages use 'other' type
      } else if (debugFile?.name) {
        const ext = debugFile.name.toLowerCase().split('.').pop();
        // Only use extension if it's a valid enum value
        if (['pdf', 'srt', 'txt', 'youtube'].includes(ext)) {
          sourceType = ext;
        } else {
          sourceType = 'other';
        }
      }
      const fileSize = debugFile?.size || 0;

      // Process in batches of 100 words
      const batchSize = 100;
      let totalAdded = 0;
      let totalDuplicates = 0;
      let totalSkipped = 0;
      const batches = [];
      const allSkippedWords = [];

      for (let i = 0; i < allWords.length; i += batchSize) {
        const batch = allWords.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const startIndex = i + 1;
        const endIndex = Math.min(i + batchSize, allWords.length);
        
        addDebugLog(`Processing batch ${batchNumber}: words ${startIndex}-${endIndex} (${batch.length} words)`, true);
        
        try {
          // Get content preview for AI title/description generation (use more for news articles)
          const contentPreview = debugConvertedContent || debugCleanedContent || debugFileContent || '';
          // Pass URL and page title for news articles so AI can extract title from URL or use page title
          const urlForTitle = (webpageUrl && webpageUrl.trim() !== '') ? webpageUrl.trim() : null;
          const pageTitleForAI = webpagePageTitle || null;
          // Send first 1000 chars for better headline extraction from news articles
          const response = await wordAPI.addWordsFromAI(batch, sourceName, sourceType, fileSize, contentPreview.substring(0, 1000), urlForTitle, pageTitleForAI);
          const results = response.data.results;
          
          totalAdded += results.added || 0;
          totalDuplicates += results.duplicates || 0;
          totalSkipped += results.skipped || 0;
          
          // Track skipped words from errors array
          if (results.errors && results.errors.length > 0) {
            results.errors.forEach(err => {
              if (err.word && !allSkippedWords.includes(err.word)) {
                allSkippedWords.push(err.word);
              }
            });
          }
          
          // Also track words that were skipped due to validation
          // We need to identify which words in the batch were skipped
          // Since the API doesn't return the exact skipped words, we'll track based on the count
          // For now, we'll show the skipped count per batch
          
          batches.push({
            batchNumber,
            range: `${startIndex}-${endIndex}`,
            added: results.added || 0,
            duplicates: results.duplicates || 0,
            skipped: results.skipped || 0,
            words: batch,
            skippedWords: results.errors ? results.errors.map(e => e.word).filter(Boolean) : []
          });
          
          addDebugLog(`Batch ${batchNumber} completed: ${results.added} added, ${results.duplicates} duplicates`, true);
        } catch (error) {
          console.error(`Error processing batch ${batchNumber}:`, error);
          addDebugLog(`❌ Error in batch ${batchNumber}: ${error.response?.data?.message || error.message}`, true);
        }
      }

      setAddedWordsBatches(batches);
      setSkippedWords(allSkippedWords);
      setDatabaseResults({
        total: allWords.length,
        added: totalAdded,
        duplicates: totalDuplicates,
        skipped: totalSkipped
      });
      setDatabaseTimestamp(new Date());

      addDebugLog(`✅ All batches completed! Total: ${totalAdded} added, ${totalDuplicates} duplicates, ${totalSkipped} skipped`, true);
    } catch (error) {
      console.error('Error adding words:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to add words';
      addDebugLog(`❌ Error: ${errorMessage}`);
    } finally {
      setAddingWords(false);
    }
  };

  const handleFillWordColumns = async () => {
    setFillingColumns(true);
    addDebugLog('🤖 Filling word columns with AI in batches of 50...');
    
    try {
      // Query database for words without Turkish meaning
      const wordsResponse = await wordAPI.getWordsWithoutTurkish();
      const wordsToFill = wordsResponse.data.words;

      if (!wordsToFill || wordsToFill.length === 0) {
        addDebugLog('✅ No words found without Turkish meaning. All words are already filled!');
        return;
      }

      const wordTexts = wordsToFill.map(w => w.englishWord);
      const batchSize = 50;
      const batches = [];
      let totalUpdated = 0;
      
      // Process in batches of 50 words
      for (let i = 0; i < wordTexts.length; i += batchSize) {
        const batch = wordTexts.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const startIndex = i + 1;
        const endIndex = Math.min(i + batchSize, wordTexts.length);
        
        addDebugLog(`Processing batch ${batchNumber}: words ${startIndex}-${endIndex} (${batch.length} words)`, true);
        
        try {
          // Call backend with this batch of words
          const response = await wordAPI.fillWordColumns(batch);
          const results = response.data.results;
          const aiPrompt = response.data.prompt;
          const aiResponse = response.data.response;
          
          // Store prompt and response for first batch (or combine them)
          if (batchNumber === 1) {
            setSecondAIPrompt(aiPrompt);
            setSecondAIResponse(aiResponse.substring(0, 1000));
            setSecondAIPromptTimestamp(new Date());
            setSecondAIResponseTimestamp(new Date());
          } else {
            // Append to response preview
            setSecondAIResponse(prev => prev + '\n\n... [Batch ' + batchNumber + ' response truncated]');
          }
          
          totalUpdated += results.updated || 0;
          
          batches.push({
            batchNumber,
            range: `${startIndex}-${endIndex}`,
            updated: results.updated || 0,
            words: batch
          });
          
          addDebugLog(`Batch ${batchNumber} completed: ${results.updated} words updated`, true);
          
          // Small delay between batches to avoid overwhelming the API
          if (i + batchSize < wordTexts.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error(`Error processing batch ${batchNumber}:`, error);
          addDebugLog(`❌ Error in batch ${batchNumber}: ${error.response?.data?.message || error.message}`, true);
        }
      }
      
      setFillColumnsBatches(batches);
      addDebugLog(`✅ All batches completed! Total: ${totalUpdated} words updated`, true);
    } catch (error) {
      console.error('Error filling word columns:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fill word columns';
      addDebugLog(`❌ Error: ${errorMessage}`);
      
      if (error.response?.data?.responsePreview) {
        addDebugLog(`📄 AI response preview: ${error.response.data.responsePreview}`);
      }
    } finally {
      setFillingColumns(false);
    }
  };

  // Update prompt when content changes
  useEffect(() => {
    if (!debugFile && !webpageUrl) {
      setEditableAIPrompt('');
      return;
    }
    
    const ext = debugFile?.name.toLowerCase().split('.').pop() || 'webpage';
    const isPDF = ext === 'pdf';
    const isWebpage = webpageUrl && webpageUrl.trim() !== '';
    
    // For PDF and Webpage: use converted content directly (cleaning is done by AI)
    // For SRT/TXT: prioritize cleaned content, then converted, then raw file
    const contentToUse = (isPDF || isWebpage)
      ? (debugConvertedContent || debugFileContent)
      : (debugCleanedContent || debugConvertedContent || debugFileContent);
    
    if (contentToUse) {
      const fileType = isWebpage ? 'pdf' : ext; // Treat webpage like PDF for prompt building
      const prompt = buildAIPrompt(contentToUse, fileType);
      setEditableAIPrompt(prompt);
    }
  }, [debugFile, debugConvertedContent, debugCleanedContent, debugFileContent, webpageUrl]);

  const handleSendToAI = async () => {
    // Determine file type
    const ext = debugFile?.name.toLowerCase().split('.').pop() || 'webpage';
    const isPDF = ext === 'pdf';
    const isWebpage = webpageUrl && webpageUrl.trim() !== '';
    
    // For PDF and Webpage: use converted content directly (cleaning is done by AI)
    // For SRT/TXT: prioritize cleaned content, then converted, then raw file
    const contentToSend = (isPDF || isWebpage)
      ? (debugConvertedContent || debugFileContent)
      : (debugCleanedContent || debugConvertedContent || debugFileContent);
    
    if (!contentToSend) {
      addDebugLog('❌ No content to send. Please upload and convert a file or webpage first.');
      return;
    }

    // Use the editable prompt if available, otherwise build it
    const fileType = isWebpage ? 'pdf' : ext; // Treat webpage like PDF for AI processing
    const promptToUse = editableAIPrompt.trim() || buildAIPrompt(contentToSend, fileType);

    setSendingToAI(true);
    addDebugLog('🤖 Sending content to AI...');
    if (isPDF) {
      addDebugLog('📄 PDF file detected - AI will clean and extract vocabulary', true);
    } else if (isWebpage) {
      addDebugLog('🌐 Webpage detected - AI will clean and extract vocabulary', true);
    }
    
    try {
      const response = await flashcardAPI.processMarkdownWithAI(contentToSend, fileType || null, promptToUse);
      const aiResponse = response.data.response;
      const aiPrompt = response.data.prompt;
      
      setDebugAIResponse(aiResponse);
      setDebugAIPrompt(aiPrompt);
      setFirstAIPromptTimestamp(new Date());
      setFirstAIResponseTimestamp(new Date());
      
      addDebugLog('Waiting for AI response...', true);
      addDebugLog(`AI response received. (${aiResponse.length} characters)`, true);
    } catch (error) {
      console.error('Error sending to AI:', error);
      let errorMessage = 'Failed to process with AI';
      
      if (error.response) {
        // Server responded with error status
        errorMessage = error.response.data?.message || `Server error: ${error.response.status} ${error.response.statusText}`;
        addDebugLog(`❌ Server Error: ${error.response.status}`);
        if (error.response.status === 404) {
          addDebugLog('⚠️ Route not found. Please restart the backend server.');
        }
      } else if (error.request) {
        // Request was made but no response received
        errorMessage = 'No response from server. Is the backend running?';
        addDebugLog('❌ No response from server');
      } else {
        // Error setting up the request
        errorMessage = error.message || 'Failed to process with AI';
      }
      
      addDebugLog(`❌ Error: ${errorMessage}`);
      setDebugAIResponse('');
    } finally {
      setSendingToAI(false);
    }
  };

  return (
    <div className="create-deck-container">
      <div className="create-deck-header">
        <h1>Create New Deck</h1>
        <button onClick={() => navigate(-1)} className="btn btn-secondary">
          Cancel
        </button>
      </div>

      {/* Debug Mode Section */}
      <div className="debug-section" style={{ marginBottom: '2rem', padding: '1.5rem', border: '2px solid #4a90e2', borderRadius: '8px', backgroundColor: '#f0f7ff' }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem', color: '#2c5282' }}>
          🔧 Debug Mode
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {/* File Upload */}
          <div>
            <label className="form-label">Upload File (SRT, TXT, or PDF)</label>
            <input
              type="file"
              accept=".srt,.txt,.pdf"
              onChange={handleDebugFileUpload}
              style={{ marginBottom: '0.5rem', width: '100%' }}
              disabled={convertingPDF || convertingWebpage}
            />
            {debugFile && (
              <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>
                Selected: {debugFile.name} ({(debugFile.size / 1024).toFixed(2)} KB)
              </div>
            )}
          </div>

          {/* Webpage URL Input */}
          <div>
            <label className="form-label">Or Paste Webpage URL</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={webpageUrl}
                onChange={(e) => setWebpageUrl(e.target.value)}
                placeholder="https://example.com/article"
                style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                disabled={convertingWebpage || convertingPDF || !!debugFile}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && webpageUrl.trim()) {
                    handleConvertWebpage();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleConvertWebpage}
                className="btn btn-primary"
                disabled={!webpageUrl.trim() || convertingWebpage || convertingPDF || !!debugFile}
                style={{ whiteSpace: 'nowrap' }}
              >
                {convertingWebpage ? '⏳ Converting...' : '🌐 Convert'}
              </button>
            </div>
            {webpageUrl && (
              <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
                {webpageUrl.length > 50 ? webpageUrl.substring(0, 50) + '...' : webpageUrl}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleConvertToMD}
            className="btn btn-primary"
            disabled={(!debugFileContent && !debugConvertedContent) || convertingPDF}
            style={{ flex: '1', minWidth: '120px' }}
          >
            {convertingPDF ? '⏳ Converting...' : '🔄 Convert'}
          </button>
          <button
            type="button"
            onClick={handleCleanSRT}
            className="btn btn-primary"
            disabled={!debugConvertedContent || (debugFile?.name.toLowerCase().endsWith('.pdf')) || (webpageUrl && webpageUrl.trim() !== '')}
            style={{ flex: '1', minWidth: '120px' }}
            title={(debugFile?.name.toLowerCase().endsWith('.pdf') || (webpageUrl && webpageUrl.trim() !== '')) ? 'PDF and Webpage files are cleaned automatically by AI' : ''}
          >
            🧹 Clean
          </button>
        </div>

        {/* Test Title Button */}
        <div style={{ marginBottom: '1rem' }}>
          <button
            type="button"
            onClick={handleTestTitle}
            className="btn btn-primary"
            disabled={testingTitle || (!debugFile && !webpageUrl)}
            style={{ 
              backgroundColor: '#28a745', 
              borderColor: '#28a745',
              color: 'white',
              padding: '0.75rem 1.5rem',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            {testingTitle ? '⏳ Testing...' : '🧪 Test Title & Description'}
          </button>
        </div>

        {/* Test Title Results */}
        {testTitleResult && (
          <div style={{ 
            marginBottom: '1rem', 
            padding: '1rem', 
            backgroundColor: testTitleResult.error ? '#f8d7da' : '#d4edda', 
            borderRadius: '8px', 
            border: `1px solid ${testTitleResult.error ? '#f5c6cb' : '#c3e6cb'}` 
          }}>
            {testTitleResult.error ? (
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#721c24' }}>❌ Error</h4>
                <p style={{ margin: 0, color: '#721c24' }}>{testTitleResult.error}</p>
              </div>
            ) : (
              <div>
                <h4 style={{ margin: '0 0 1rem 0', color: '#155724', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>✅ Generated Title & Description</span>
                </h4>
                <div style={{ marginBottom: '0.75rem' }}>
                  <strong style={{ color: '#155724', display: 'block', marginBottom: '0.25rem' }}>Title:</strong>
                  <div style={{ 
                    padding: '0.5rem', 
                    backgroundColor: 'white', 
                    borderRadius: '4px', 
                    border: '1px solid #c3e6cb',
                    color: '#155724',
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}>
                    {testTitleResult.title}
                  </div>
                </div>
                <div>
                  <strong style={{ color: '#155724', display: 'block', marginBottom: '0.25rem' }}>Description:</strong>
                  <div style={{ 
                    padding: '0.5rem', 
                    backgroundColor: 'white', 
                    borderRadius: '4px', 
                    border: '1px solid #c3e6cb',
                    color: '#155724'
                  }}>
                    {testTitleResult.description}
                  </div>
                </div>
                {testTitleResult.sourceType && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#155724' }}>
                    <strong>Source Type:</strong> {testTitleResult.sourceType}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* AI Prompt Preview Section - Collapsible */}
        {editableAIPrompt && (
          <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                cursor: 'pointer',
                marginBottom: isPromptExpanded ? '0.5rem' : '0'
              }}
              onClick={() => setIsPromptExpanded(!isPromptExpanded)}
            >
              <h3 style={{ margin: '0', fontSize: '0.9rem', color: '#856404', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>{isPromptExpanded ? '▼' : '▶'}</span>
                <span>AI Prompt Preview {isPromptExpanded ? '(Click to collapse)' : '(Click to expand and edit)'}</span>
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#856404' }}>
                {editableAIPrompt.length} characters
              </span>
            </div>
            {isPromptExpanded && (
              <div style={{ marginTop: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: '#856404', marginBottom: '0.25rem', display: 'block' }}>
                  Edit the prompt before sending to AI (for debugging):
                </label>
                <textarea
                  value={editableAIPrompt}
                  onChange={(e) => setEditableAIPrompt(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '300px',
                    padding: '0.75rem',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                    border: '1px solid #ffc107',
                    borderRadius: '4px',
                    backgroundColor: '#fff',
                    resize: 'vertical',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                  placeholder="AI prompt will appear here..."
                />
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#856404' }}>
                  💡 Tip: You can modify this prompt to debug or customize the AI extraction behavior.
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleSendToAI}
            className="btn btn-primary"
            disabled={
              (!debugConvertedContent && !debugCleanedContent && !debugFileContent) || 
              sendingToAI ||
              (debugFile?.name.toLowerCase().endsWith('.pdf') && !debugConvertedContent) ||
              ((webpageUrl && webpageUrl.trim() !== '') && !debugConvertedContent)
            }
            style={{ flex: '1', minWidth: '120px' }}
          >
            {sendingToAI ? '⏳ Sending...' : '🤖 Send Source to AI'}
          </button>
          <button
            type="button"
            onClick={handleAddWordsToDatabase}
            className="btn btn-primary"
            disabled={!debugAIResponse || addingWords}
            style={{ flex: '1', minWidth: '120px' }}
          >
            {addingWords ? '⏳ Adding...' : '💾 Add to DB'}
          </button>
          <button
            type="button"
            onClick={handleFillWordColumns}
            className="btn btn-primary"
            disabled={fillingColumns}
            style={{ flex: '1', minWidth: '120px' }}
          >
            {fillingColumns ? '⏳ Sending...' : '🤖 Send DB to AI'}
          </button>
          <button
            type="button"
            onClick={clearDebugLogs}
            className="btn btn-secondary"
            style={{ flex: '1', minWidth: '120px' }}
          >
            Clear Logs
          </button>
        </div>

        {/* Debug Logs Pane */}
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#1e1e1e', borderRadius: '8px', border: '1px solid #333', maxHeight: '300px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ margin: '0', fontSize: '0.9rem', color: '#4a90e2' }}>Debug Logs</h3>
            <span style={{ fontSize: '0.75rem', color: '#888' }}>{debugLogs.length} entries</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#d4d4d4', lineHeight: '1.8', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            {debugLogs.length === 0 ? (
              <div style={{ color: '#666', fontStyle: 'italic' }}>No logs yet. Upload a file to start debugging.</div>
            ) : (
              debugLogs.map((log, index) => (
                <div key={index} style={{ marginBottom: '0.25rem', wordBreak: 'break-word' }}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Content Preview - AI Request Sequence */}
        {(originalFileContent || debugCleanedContent || debugAIPrompt || debugAIResponse || databaseResults || secondAIPrompt || secondAIResponse) && (
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#2c5282' }}>Content Preview - AI Request Sequence</h3>
            
            {/* Step 1: Original File */}
            {originalFileContent && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <strong style={{ fontSize: '0.85rem', color: '#666' }}>Step 1: Original File (first 200 chars)</strong>
                  {originalFileTimestamp && (
                    <span style={{ fontSize: '0.7rem', color: '#888' }}>
                      {originalFileTimestamp.toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <pre style={{ 
                  fontSize: '0.7rem', 
                  padding: '0.5rem', 
                  backgroundColor: '#f5f5f5', 
                  borderRadius: '4px', 
                  overflow: 'auto', 
                  maxHeight: '100px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  border: '1px solid #ddd',
                  marginTop: '0.25rem'
                }}>
                  {originalFileContent}
                  {originalFileContent.length >= 200 && '...'}
                </pre>
              </div>
            )}
            
            {/* Step 2: Cleaned File */}
            {debugCleanedContent && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <strong style={{ fontSize: '0.85rem', color: '#666' }}>Step 2: Cleaned File (first 200 chars)</strong>
                  {cleanedFileTimestamp && (
                    <span style={{ fontSize: '0.7rem', color: '#888' }}>
                      {cleanedFileTimestamp.toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                  Full length: {debugCleanedContent.length} characters
                </div>
                <pre style={{ 
                  fontSize: '0.7rem', 
                  padding: '0.5rem', 
                  backgroundColor: '#e1f5fe', 
                  borderRadius: '4px', 
                  overflow: 'auto', 
                  maxHeight: '100px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  border: '1px solid #03a9f4',
                  marginTop: '0.25rem'
                }}>
                  {debugCleanedContent.substring(0, 200)}
                  {debugCleanedContent.length > 200 && '...'}
                </pre>
              </div>
            )}
            
            {/* Step 3: 1st AI Prompt */}
            {debugAIPrompt && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <strong style={{ fontSize: '0.85rem', color: '#666' }}>Step 3: 1st AI Prompt (first 1500 chars)</strong>
                  {firstAIPromptTimestamp && (
                    <span style={{ fontSize: '0.7rem', color: '#888' }}>
                      {firstAIPromptTimestamp.toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                  Full length: {debugAIPrompt.length} characters
                </div>
                <pre style={{ 
                  fontSize: '0.7rem', 
                  padding: '0.5rem', 
                  backgroundColor: '#fff3cd', 
                  borderRadius: '4px', 
                  overflow: 'auto', 
                  maxHeight: '200px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  border: '1px solid #ffc107',
                  marginTop: '0.25rem'
                }}>
                  {debugAIPrompt.substring(0, 1500)}
                  {debugAIPrompt.length > 1500 && '...'}
                </pre>
              </div>
            )}
            
            {/* Step 4: 1st AI Output */}
            {debugAIResponse && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <strong style={{ fontSize: '0.85rem', color: '#666' }}>Step 4: 1st AI Output (first 200 chars)</strong>
                  {firstAIResponseTimestamp && (
                    <span style={{ fontSize: '0.7rem', color: '#888' }}>
                      {firstAIResponseTimestamp.toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                  Full length: {debugAIResponse.length} characters
                </div>
                <pre style={{ 
                  fontSize: '0.7rem', 
                  padding: '0.5rem', 
                  backgroundColor: '#e8f5e9', 
                  borderRadius: '4px', 
                  overflow: 'auto', 
                  maxHeight: '100px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  border: '1px solid #4caf50',
                  marginTop: '0.25rem'
                }}>
                  {debugAIResponse.substring(0, 200)}
                  {debugAIResponse.length > 200 && '...'}
                </pre>
              </div>
            )}
            
            {/* Step 5: Words Added to Database */}
            {addedWordsBatches.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <strong style={{ fontSize: '0.85rem', color: '#666' }}>Step 5: Words Added to Database (in batches of 100)</strong>
                  {databaseTimestamp && (
                    <span style={{ fontSize: '0.7rem', color: '#888' }}>
                      {databaseTimestamp.toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                  Processed {addedWordsBatches.length} batch(es)
                </div>
                <div style={{ 
                  fontSize: '0.7rem', 
                  padding: '0.5rem', 
                  backgroundColor: '#f3e5f5', 
                  borderRadius: '4px', 
                  border: '1px solid #9c27b0',
                  marginTop: '0.25rem'
                }}>
                  {addedWordsBatches.map((batch, idx) => (
                    <div key={idx} style={{ marginBottom: '0.25rem' }}>
                      <strong>Batch {batch.batchNumber}</strong> (words {batch.range}): {batch.added} added, {batch.duplicates} duplicates, {batch.skipped} skipped
                      {batch.skippedWords && batch.skippedWords.length > 0 && (
                        <div style={{ marginLeft: '1rem', fontSize: '0.65rem', color: '#d32f2f', marginTop: '0.1rem' }}>
                          Skipped words: {batch.skippedWords.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Step 6: Database Handler Results */}
            {databaseResults && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <strong style={{ fontSize: '0.85rem', color: '#666' }}>Step 6: Database Handler</strong>
                  {databaseTimestamp && (
                    <span style={{ fontSize: '0.7rem', color: '#888' }}>
                      {databaseTimestamp.toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <div style={{ 
                  fontSize: '0.7rem', 
                  padding: '0.5rem', 
                  backgroundColor: '#e8f5e9', 
                  borderRadius: '4px', 
                  border: '1px solid #4caf50',
                  marginTop: '0.25rem'
                }}>
                  <div><strong>Total words processed:</strong> {databaseResults.total}</div>
                  <div><strong>New words added:</strong> {databaseResults.added}</div>
                  <div><strong>Repeated/duplicates:</strong> {databaseResults.duplicates}</div>
                  {databaseResults.skipped > 0 && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div><strong>Skipped (invalid):</strong> {databaseResults.skipped}</div>
                      {skippedWords.length > 0 && (
                        <div style={{ marginTop: '0.25rem', fontSize: '0.65rem', color: '#d32f2f' }}>
                          <strong>Skipped words:</strong> {skippedWords.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Step 7: 2nd AI Prompt */}
            {secondAIPrompt && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <strong style={{ fontSize: '0.85rem', color: '#666' }}>Step 7: 2nd AI Prompt (first 1500 chars)</strong>
                  {secondAIPromptTimestamp && (
                    <span style={{ fontSize: '0.7rem', color: '#888' }}>
                      {secondAIPromptTimestamp.toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                  Full length: {secondAIPrompt.length} characters
                </div>
                <pre style={{ 
                  fontSize: '0.7rem', 
                  padding: '0.5rem', 
                  backgroundColor: '#fff3cd', 
                  borderRadius: '4px', 
                  overflow: 'auto', 
                  maxHeight: '200px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  border: '1px solid #ffc107',
                  marginTop: '0.25rem'
                }}>
                  {secondAIPrompt.substring(0, 1500)}
                  {secondAIPrompt.length > 1500 && '...'}
                </pre>
              </div>
            )}
            
            {/* Step 8: 2nd AI Output */}
            {secondAIResponse && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <strong style={{ fontSize: '0.85rem', color: '#666' }}>Step 8: 2nd AI Output (first 1000 chars)</strong>
                  {secondAIResponseTimestamp && (
                    <span style={{ fontSize: '0.7rem', color: '#888' }}>
                      {secondAIResponseTimestamp.toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                  Processed in batches of 50 words
                </div>
                <pre style={{ 
                  fontSize: '0.7rem', 
                  padding: '0.5rem', 
                  backgroundColor: '#e8f5e9', 
                  borderRadius: '4px', 
                  overflow: 'auto', 
                  maxHeight: '200px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  border: '1px solid #4caf50',
                  marginTop: '0.25rem'
                }}>
                  {secondAIResponse.substring(0, 1000)}
                  {secondAIResponse.length > 1000 && '...'}
                </pre>
                {fillColumnsBatches.length > 0 && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: '#666' }}>
                    <strong>Batches processed:</strong> {fillColumnsBatches.length}
                    {fillColumnsBatches.map((batch, idx) => (
                      <div key={idx} style={{ marginLeft: '1rem', fontSize: '0.65rem' }}>
                        Batch {batch.batchNumber} (words {batch.range}): {batch.updated} words updated
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Deck Maker Section */}
      <div className="enhanced-ai-section" style={{ marginBottom: '2rem', padding: '1.5rem', border: '2px dashed #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>AI Deck Maker</h2>
        <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.9rem' }}>
          Upload a file (PDF, SRT, Excel). AI will extract all words, phrases, idioms, and phrasal verbs and add them to your database.
        </p>
        
        <div style={{ marginBottom: '1rem' }}>
          {/* File Upload */}
          <div>
            <label className="form-label">Upload File (PDF, SRT, Excel)</label>
            <input
              type="file"
              accept=".pdf,.srt,.xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const ext = file.name.toLowerCase().split('.').pop();
                  const allowedTypes = ['pdf', 'srt', 'xlsx', 'xls'];
                  if (allowedTypes.includes(ext)) {
                    setUploadedFile(file);
                  } else {
                    alert('Please upload a PDF, SRT, or Excel file');
                    setUploadedFile(null);
                  }
                }
              }}
              style={{ marginBottom: '0.5rem' }}
              disabled={generatingFromSource}
            />
            {uploadedFile && (
              <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>
                Selected: {uploadedFile.name}
              </div>
            )}
            <button
              type="button"
              onClick={handleGenerateFromFile}
              className="btn btn-primary"
              disabled={!uploadedFile || generatingFromSource}
              style={{ width: '100%' }}
            >
              {generatingFromSource ? '✨ Processing...' : '✨ Generate from File'}
            </button>
          </div>
        </div>
        
        {generatingFromSource && (
          <div style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>
            <div>✨ AI is extracting words from your content...</div>
            <div style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
              Processing file, extracting words, checking database, and adding new words...
            </div>
            <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#999' }}>
              This may take a minute or two
            </div>
          </div>
        )}

        {/* Processing Logs */}
        {processingLogs.length > 0 && (
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f7fafc', borderRadius: '8px', border: '1px solid #e2e8f0', maxHeight: '400px', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#2c5282', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Processing Logs</span>
              <button
                onClick={() => setProcessingLogs([])}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Clear
              </button>
            </h3>
            <div style={{ fontSize: '0.85rem', color: '#2d3748', lineHeight: '1.8', fontFamily: 'monospace' }}>
              {processingLogs.map((log, index) => (
                <div key={index} style={{ marginBottom: '0.25rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {processingSummary && (
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e6f3ff', borderRadius: '8px', border: '1px solid #bee3f8' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: '#2c5282' }}>Processing Summary</h3>
            <div style={{ fontSize: '0.9rem', color: '#2d3748', lineHeight: '1.6' }}>
              <p><strong>Source:</strong> {processingSummary.sourceName}</p>
              <p><strong>Total words found:</strong> {processingSummary.totalWords}</p>
              <p><strong>Words already in database:</strong> {processingSummary.existingWords}</p>
              <p><strong>New words added:</strong> {processingSummary.newWords}</p>
              <p><strong>All columns filled:</strong> {processingSummary.allColumnsFilled ? 'Yes ✓' : 'No ✗'}</p>
              <p><strong>Processing time:</strong> {processingSummary.processingTime} seconds</p>
              {processingSummary.categoryTag && (
                <p><strong>Category tag added:</strong> {processingSummary.categoryTag}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Deck Informations Section */}
      <div className="enhanced-ai-section" style={{ marginBottom: '2rem', padding: '1.5rem', border: '2px dashed #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
          Deck Informations
        </h2>
        
        <div>
            <div className="form-group">
              <label className="form-label">Title *</label>
                <input
                  type="text"
                  className="form-input"
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  placeholder="Enter deck title..."
                  required
                />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={deckDescription}
                  onChange={(e) => setDeckDescription(e.target.value)}
                  placeholder="Enter deck description..."
                />
            </div>

            <div className="form-group">
              <label className="form-label">Deck Type *</label>
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="deckType"
                    value="static"
                    checked={deckType === 'static'}
                    onChange={(e) => setDeckType(e.target.value)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <span>Static</span>
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
                    (All words always visible)
                  </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="deckType"
                    value="dynamic"
                    checked={deckType === 'dynamic'}
                    onChange={(e) => setDeckType(e.target.value)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <span>Dynamic</span>
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: '#666' }}>
                    (Known words hidden for you)
                  </span>
                </label>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Level *</label>
                <select
                  className="form-select"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  required
                >
                  <option value="">Select Level</option>
                  {DECK_LEVELS.map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Skill *</label>
                <select
                  className="form-select"
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                  required
                >
                  <option value="">Select Skill</option>
                  {DECK_SKILLS.map(skl => (
                    <option key={skl} value={skl}>{skl}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Task *</label>
                <select
                  className="form-select"
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  required
                >
                  <option value="">Select Task</option>
                  {DECK_TASKS.map(tsk => (
                    <option key={tsk} value={tsk}>{tsk}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Card (qty)</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="50"
                  value={questionNumber}
                  onChange={(e) => setQuestionNumber(parseInt(e.target.value) || 20)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <button
                onClick={handleCreateDeck}
                disabled={creating || !deckName.trim() || selectedWords.size === 0 || !level || !skill || !task}
                className="btn btn-primary btn-large"
                style={{ width: '100%' }}
              >
                {creating ? 'Creating...' : `Create Deck (${selectedWords.size} words)`}
              </button>
            </div>
          </div>
      </div>

      {/* Word List Section */}
      <div className="manual-creation-section">
        <h2>Word List</h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div className="selected-count">
          {selectedWords.size} word{selectedWords.size !== 1 ? 's' : ''} selected
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="select-all-filtered"
              checked={allFilteredWordIds.size > 0 && Array.from(allFilteredWordIds).every(id => selectedWords.has(id))}
              onChange={handleSelectAllFiltered}
              disabled={selectingAllFiltered}
              style={{ cursor: 'pointer' }}
            />
            <label 
              htmlFor="select-all-filtered" 
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <span>Select All Filtered Words</span>
              {allFilteredWordIds.size > 0 && (
                <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'normal' }}>
                  ({allFilteredWordIds.size} words)
                </span>
              )}
              {selectingAllFiltered && (
                <span style={{ fontSize: '0.85rem', color: '#667eea' }}>Loading...</span>
              )}
            </label>
          </div>
        </div>

        {/* Filters */}
        <div className="word-filters">
          <input
            type="text"
            placeholder="Search words..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="filter-input"
          />
          <select
            value={filters.englishLevel}
            onChange={(e) => handleFilterChange('englishLevel', e.target.value)}
            className="filter-select"
          >
            <option value="">All Levels</option>
            {DECK_LEVELS.map(lvl => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
          <select
            value={filters.wordType}
            onChange={(e) => handleFilterChange('wordType', e.target.value)}
            className="filter-select"
          >
            <option value="">All Types</option>
            {words
              .map(w => w.wordType)
              .filter((t, i, arr) => t && arr.indexOf(t) === i)
              .sort()
              .map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
          </select>
          <select
            value={filters.category1}
            onChange={(e) => handleFilterChange('category1', e.target.value)}
            className="filter-select"
          >
            <option value="">All Category 1</option>
            {words
              .map(w => w.category1)
              .filter((c, i, arr) => c && arr.indexOf(c) === i)
              .sort()
              .map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
          </select>
          <select
            value={filters.category2}
            onChange={(e) => handleFilterChange('category2', e.target.value)}
            className="filter-select"
          >
            <option value="">All Category 2</option>
            {words
              .map(w => w.category2)
              .filter((c, i, arr) => c && arr.indexOf(c) === i)
              .sort()
              .map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
          </select>
          <select
            value={filters.sourceId}
            onChange={(e) => handleFilterChange('sourceId', e.target.value)}
            className="filter-select"
          >
            <option value="">All Sources</option>
            {sources.map(source => (
              <option key={source._id} value={source._id}>
                {source.sourceName} ({source.totalWords} words)
              </option>
            ))}
          </select>
          <div className="filter-checkbox">
            <input
              type="checkbox"
              id="show-known"
              checked={filters.showKnown}
              onChange={(e) => handleFilterChange('showKnown', e.target.checked)}
            />
            <label htmlFor="show-known">Show Known</label>
          </div>
          <div className="filter-checkbox">
            <input
              type="checkbox"
              id="show-unknown"
              checked={filters.showUnknown}
              onChange={(e) => handleFilterChange('showUnknown', e.target.checked)}
            />
            <label htmlFor="show-unknown">Show Unknown</label>
          </div>
          <button
            onClick={handleApplyFilters}
            className="btn btn-primary"
          >
            Apply Filters
          </button>
        </div>

        {/* Words Table */}
        <div className="words-table-container">
          {loading ? (
            <div className="loading">Loading words...</div>
          ) : words.length === 0 ? (
            <div className="empty-state">
              <p>No words found matching your filters.</p>
            </div>
          ) : (
            <table className="words-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someSelected;
                      }}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>English Word</th>
                  <th>Turkish Meaning</th>
                  <th>Word Type</th>
                  <th>English Level</th>
                  <th>Category 1</th>
                  <th>Category 2</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {words.map(word => (
                  <tr 
                    key={word._id} 
                    className={`word-row ${selectedWords.has(word._id) ? 'selected' : ''} ${word.isKnown === true ? 'known' : word.isKnown === false ? 'unknown' : ''}`}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedWords.has(word._id)}
                        onChange={() => handleSelectWord(word._id)}
                      />
                    </td>
                    <td className="word-english-cell">
                      <strong>{word.englishWord}</strong>
                    </td>
                    <td className="word-meaning-cell">{word.turkishMeaning || '-'}</td>
                    <td className="word-type-cell">
                      {word.wordType || '-'}
                    </td>
                    <td className="word-level-cell">
                      {word.englishLevel ? (
                        <span className="word-level-badge">{word.englishLevel}</span>
                      ) : '-'}
                    </td>
                    <td className="word-category-cell">
                      {word.category1 || '-'}
                    </td>
                    <td className="word-category-cell">
                      {word.category2 || '-'}
                    </td>
                    <td className="word-category-cell">
                      {word.sources && word.sources.length > 0 ? (
                        <span className="source-badge" title={word.sources.join(', ')}>
                          {word.sources.length === 1 
                            ? word.sources[0] 
                            : `${word.sources[0]} (+${word.sources.length - 1})`}
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-secondary"
            >
              Previous
            </button>
            <span className="page-info">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn btn-secondary"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateDeck;
