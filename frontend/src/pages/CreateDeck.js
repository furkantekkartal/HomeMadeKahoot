import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { wordAPI, flashcardAPI } from '../services/api';
import { DECK_LEVELS, DECK_SKILLS, DECK_TASKS } from '../constants/deckConstants';
import { useWordList } from '../context/WordListContext';
import WordList from '../components/WordList/WordList';
import './CreateDeck.css';

const CreateDeck = () => {
  const navigate = useNavigate();
  const { 
    selectedWords, 
    words,
    page,
    setPage,
    setSelectedWords,
    handleSelectWord,
    handleSelectAll,
    handleSelectAllFiltered,
    handleSelectActiveSource,
    allFilteredWordIds,
    selectingAllFiltered,
    filters,
    appliedFilters,
    handleFilterChange,
    handleApplyFilters,
    refreshWords
  } = useWordList();
  const [deckName, setDeckName] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [level, setLevel] = useState('');
  const [skill, setSkill] = useState('');
  const [task, setTask] = useState('');
  const [levelBreakdown, setLevelBreakdown] = useState(''); // Store level breakdown for debug display
  const [levelCalculation, setLevelCalculation] = useState(null); // Store level calculation details
  const [deckType, setDeckType] = useState('dynamic');
  const [questionNumber, setQuestionNumber] = useState(20);
  const [creating, setCreating] = useState(false);
  const [sources, setSources] = useState([]);
  const [activeSourceId, setActiveSourceId] = useState(null);
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
  const [sendingToAI, setSendingToAI] = useState(false);
  const [addingWords, setAddingWords] = useState(false);
  const [fillingColumns, setFillingColumns] = useState(false);
  const [convertingPDF, setConvertingPDF] = useState(false);
  const [webpageUrl, setWebpageUrl] = useState('');
  const [convertingWebpage, setConvertingWebpage] = useState(false);
  const [testingTitle, setTestingTitle] = useState(false);
  const [testTitleResult, setTestTitleResult] = useState(null);
  const [webpagePageTitle, setWebpagePageTitle] = useState(''); // Store page title from Firecrawl
  
  // UI State for expand/collapse sections
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [contentPreviewExpanded, setContentPreviewExpanded] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [processingAll, setProcessingAll] = useState(false);
  const [lastCompletedStep, setLastCompletedStep] = useState(null); // Track last completed step: 'convert', 'clean', 'sendAI', 'addDB', 'fillColumns'
  
  // Progress label state for animated log display
  const [currentProgressLog, setCurrentProgressLog] = useState('');
  const [progressLogOpacity, setProgressLogOpacity] = useState(0);
  const previousLogRef = useRef('');
  const initializedRef = useRef(false);
  
  // Batch processing progress state
  const [batchProgress, setBatchProgress] = useState({
    currentBatch: 0,
    totalBatches: 0,
    currentWords: 0,
    totalWords: 0,
    isProcessing: false
  });
  
  // Simulate word-by-word progress within a batch
  const simulatedWordCountRef = useRef(0);
  const progressIntervalRef = useRef(null);
  
  useEffect(() => {
    if (batchProgress.isProcessing && batchProgress.currentBatch > 0 && batchProgress.totalWords > 0) {
      // Calculate batch size - detect based on total words and batches
      // If totalWords / totalBatches is around 50, it's "Fill Columns" (50 words per batch)
      // If totalWords / totalBatches is around 100, it's "Add to DB" (100 words per batch)
      const avgBatchSize = batchProgress.totalWords / batchProgress.totalBatches;
      const batchSize = avgBatchSize <= 60 ? 50 : 100;
      
      const batchStartIndex = (batchProgress.currentBatch - 1) * batchSize;
      const batchEndIndex = Math.min(batchStartIndex + batchSize, batchProgress.totalWords);
      
      // Reset simulated count to start of current batch when batch changes
      if (simulatedWordCountRef.current < batchStartIndex || simulatedWordCountRef.current >= batchEndIndex) {
        simulatedWordCountRef.current = batchStartIndex;
      }
      
      // Estimate: 2.5 minutes (150 seconds) per batch (works for both 50 and 100 word batches)
      const wordsPerSecond = batchSize / 150;
      
      // Clear any existing interval
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      
      // Update progress every second
      progressIntervalRef.current = setInterval(() => {
        simulatedWordCountRef.current += wordsPerSecond;
        
        // Cap at batch end or total words
        const maxWords = Math.min(batchEndIndex, batchProgress.totalWords);
        if (simulatedWordCountRef.current < maxWords) {
          setBatchProgress(prev => ({
            ...prev,
            currentWords: Math.min(Math.ceil(simulatedWordCountRef.current), maxWords)
          }));
        } else {
          // When batch completes, set to actual end index
          setBatchProgress(prev => ({
            ...prev,
            currentWords: maxWords
          }));
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
        }
      }, 1000); // Update every second
      
      return () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
      };
    } else {
      // Clear interval when not processing
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  }, [batchProgress.isProcessing, batchProgress.currentBatch, batchProgress.totalWords, batchProgress.totalBatches]);
  
  // Animate progress log display - show one log at a time with fade animation
  useEffect(() => {
    if (debugLogs.length === 0) {
      setCurrentProgressLog('');
      setProgressLogOpacity(0);
      previousLogRef.current = '';
      initializedRef.current = false;
      return;
    }
    
    const lastLog = debugLogs[debugLogs.length - 1];
    
    // If it's a new log, fade out current, then fade in new
    if (lastLog !== previousLogRef.current) {
      // If this is the first log or not initialized, set it immediately and fade in
      if (!initializedRef.current || previousLogRef.current === '') {
        setCurrentProgressLog(lastLog);
        previousLogRef.current = lastLog;
        initializedRef.current = true;
        setTimeout(() => {
          setProgressLogOpacity(1);
        }, 50);
      } else {
        // Fade out current log
        setProgressLogOpacity(0);
        
        // After fade out, update content and fade in new log
        const fadeTimeout = setTimeout(() => {
          setCurrentProgressLog(lastLog);
          previousLogRef.current = lastLog;
          // Small delay before fading in to ensure smooth transition
          setTimeout(() => {
            setProgressLogOpacity(1);
          }, 50);
        }, 300); // Half of animation duration
        
        return () => clearTimeout(fadeTimeout);
      }
    }
  }, [debugLogs]);
  
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
    loadSources();
  }, []);

  const loadSources = async () => {
    try {
      const response = await wordAPI.getSources();
      const sourcesList = response.data.sources || [];
      setSources(sourcesList);
      
      // Set the most recent source as active source
      if (sourcesList.length > 0) {
        const sortedSources = [...sourcesList].sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });
        setActiveSourceId(sortedSources[0]._id);
      }
    } catch (error) {
      console.error('Error loading sources:', error);
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
      
      // Refresh the word list data
      refreshWords();
      
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

  // Helper function to count words in text
  const countWords = (text) => {
    if (!text || typeof text !== 'string') return 0;
    // Split by whitespace and filter out empty strings
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
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
    setLastCompletedStep(null); // Reset progress when new file is uploaded
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
        const wordCount = countWords(mdContent);
        addDebugLog(`Completed: ${mdContent.length} characters = ${wordCount} words`, true);
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
        const wordCount = countWords(content);
        addDebugLog(`Loaded: ${content.length} characters = ${wordCount} words`, true);
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
      return null;
    }

    // Validate URL format
    try {
      new URL(webpageUrl.trim());
    } catch (e) {
      alert('Please enter a valid URL (e.g., https://example.com)');
      return null;
    }

    setConvertingWebpage(true);
    
    // Check if it's a YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    const isYouTube = youtubeRegex.test(webpageUrl.trim());
    
    if (isYouTube) {
      addDebugLog(`📹 Converting YouTube video to Markdown: ${webpageUrl}`);
    } else {
      addDebugLog(`🌐 Converting webpage to Markdown: ${webpageUrl}`);
    }
    
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
    setLastCompletedStep(null); // Reset progress when new URL is entered
    
    try {
      const response = await flashcardAPI.convertWebpageToMD(webpageUrl.trim());
      const mdContent = response.data.markdownContent;
      const fileName = response.data.fileName || (isYouTube ? 'youtube.md' : 'webpage.md');
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
      
      if (isYouTube) {
        const wordCount = countWords(mdContent);
        addDebugLog(`Conversion completed: ${mdContent.length} characters = ${wordCount} words`, true);
        addDebugLog(`YouTube video converted successfully: ${fileName}`, true);
        if (pageTitle) {
          addDebugLog(`Video title: ${pageTitle}`, true);
        }
        if (response.data.stats?.transcriptLength) {
          addDebugLog(`Transcript length: ${response.data.stats.transcriptLength} characters`, true);
        }
      } else {
        const wordCount = countWords(mdContent);
        addDebugLog(`Conversion completed: ${mdContent.length} characters = ${wordCount} words`, true);
        addDebugLog(`Webpage converted successfully: ${fileName}`, true);
        if (pageTitle) {
          addDebugLog(`Page title extracted: ${pageTitle}`, true);
        }
      }
      
      // Return the converted content for immediate use
      return mdContent;
    } catch (error) {
      console.error('Error converting webpage/YouTube:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || (isYouTube ? 'Failed to convert YouTube video' : 'Failed to convert webpage');
      addDebugLog(`❌ Error: ${errorMessage}`);
      alert('Error: ' + errorMessage);
      return null; // Return null on error
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
        return debugConvertedContent;
      } else {
        addDebugLog('❌ PDF conversion failed. Please try uploading again.');
        return null;
      }
    }

    if (!debugFileContent) {
      addDebugLog('❌ No file content to convert. Please upload a file first.');
      return null;
    }

    // Convert raw file content to MD format
    const mdContent = `# ${debugFile?.name || 'Document'}\n\n${debugFileContent}`;
    
    setDebugConvertedContent(mdContent);
    const wordCount = countWords(mdContent);
    addDebugLog(`Conversion completed: ${mdContent.length} characters = ${wordCount} words`, true);
    
    return mdContent; // Return the converted content for immediate use
  };

  const handleCleanSRT = (contentToClean = null) => {
    // Clean the converted MD content - use provided content or state
    const content = contentToClean || debugConvertedContent;
    if (!content) {
      addDebugLog('❌ No Markdown content to clean. Please convert the file first.');
      return;
    }

    // SRT format structure (that might be in the MD content):
    // 1. Sequence number (e.g., "1")
    // 2. Blank line
    // 3. Timestamp (e.g., "00:00:17,347 --> 00:00:19,542")
    // 4. Blank line
    // 5. Subtitle text (can be multiple lines)
    // 6. Blank line (separator)
    
    const lines = content.split('\n');
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
    const originalWordCount = countWords(debugConvertedContent);
    const cleanedWordCount = countWords(cleaned);
    addDebugLog(`Completed: Original: ${debugConvertedContent.length} chars (${originalWordCount} words) → Cleaned: ${cleaned.length} chars (${cleanedWordCount} words)`, true);
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
        // Check if it's a YouTube URL
        if (isWebpage && webpageUrl) {
          const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
          if (youtubeRegex.test(webpageUrl.trim())) {
            sourceType = 'youtube';
          } else {
            sourceType = 'other';
          }
        } else {
          sourceType = isPDF ? 'pdf' : 'other';
        }
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
          const wordCount = countWords(cleaned);
          addDebugLog(`Cleaning completed: ${cleaned.length} characters = ${wordCount} words`, true);
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

  const handleAddWordsToDatabase = async (aiResponseOverride = null) => {
    // Use provided AI response or fall back to state
    const aiResponseToUse = aiResponseOverride || debugAIResponse;
    
    if (!aiResponseToUse) {
      addDebugLog('❌ No AI response to add. Please extract words first.');
      return false;
    }

    setAddingWords(true);
    
    try {
      // Parse AI response (plain text, one word per line)
      const allWords = aiResponseToUse
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0); // Remove empty lines

      if (allWords.length === 0) {
        addDebugLog('❌ No words found in AI response');
        setAddingWords(false);
        return false;
      }

      // Get source file information
      const sourceName = debugFile?.name || 'Unknown Source';
      // Determine sourceType: check if it's a YouTube URL first, then webpage, then file extension
      let sourceType = 'other';
      if (webpageUrl && webpageUrl.trim() !== '') {
        // Check if it's a YouTube URL
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
        if (youtubeRegex.test(webpageUrl.trim())) {
          sourceType = 'youtube';
        } else {
          sourceType = 'other'; // Regular webpages use 'other' type
        }
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
      const totalBatches = Math.ceil(allWords.length / batchSize);
      let totalAdded = 0;
      let totalDuplicates = 0;
      let totalSkipped = 0;
      const batches = [];
      const allSkippedWords = [];
      let sourceInfoFromAPI = null; // Store sourceInfo from first batch

      // Initialize progress tracking
      setBatchProgress({
        currentBatch: 0,
        totalBatches: totalBatches,
        currentWords: 0,
        totalWords: allWords.length,
        isProcessing: true
      });

      for (let i = 0; i < allWords.length; i += batchSize) {
        const batch = allWords.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const startIndex = i + 1;
        const endIndex = Math.min(i + batchSize, allWords.length);
        
        // Update progress - set to start of batch, simulation will increment it
        setBatchProgress({
          currentBatch: batchNumber,
          totalBatches: totalBatches,
          currentWords: startIndex - 1, // Start from previous word, simulation will increment
          totalWords: allWords.length,
          isProcessing: true
        });
        
        addDebugLog(`Adding to Database; Batch ${batchNumber}: words ${startIndex}-${endIndex} (${batch.length} words)`, true);
        
        try {
          // Get content preview for AI title/description generation (use more for news articles)
          const contentPreview = debugConvertedContent || debugCleanedContent || debugFileContent || '';
          // Pass URL and page title for news articles so AI can extract title from URL or use page title
          const urlForTitle = (webpageUrl && webpageUrl.trim() !== '') ? webpageUrl.trim() : null;
          const pageTitleForAI = webpagePageTitle || null;
          // For first batch, don't pass sourceId. For subsequent batches, pass the sourceId from first batch
          const currentSourceId = (batchNumber === 1) ? null : (sourceInfoFromAPI?.sourceId || null);
          // Send first 1000 chars for better headline extraction from news articles (only for first batch)
          const contentPreviewToSend = (batchNumber === 1) ? contentPreview.substring(0, 1000) : '';
          const response = await wordAPI.addWordsFromAI(batch, sourceName, sourceType, fileSize, contentPreviewToSend, urlForTitle, pageTitleForAI, currentSourceId);
          const results = response.data.results;
          
          // Capture sourceInfo from first batch (contains AI-generated title and description)
          if (batchNumber === 1 && response.data.sourceInfo) {
            sourceInfoFromAPI = response.data.sourceInfo;
            // Set active source ID when new source is created
            if (response.data.sourceInfo.sourceId) {
              setActiveSourceId(response.data.sourceInfo.sourceId);
            }
          }
          
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
          
          // Also check if API returns skippedWords array directly
          if (results.skippedWords && Array.isArray(results.skippedWords)) {
            results.skippedWords.forEach(word => {
              if (word && !allSkippedWords.includes(word)) {
                allSkippedWords.push(word);
              }
            });
          }
          
          // Collect skipped words from this batch
          const batchSkippedWords = [];
          if (results.errors) {
            results.errors.forEach(e => {
              if (e.word && !batchSkippedWords.includes(e.word)) {
                batchSkippedWords.push(e.word);
              }
            });
          }
          if (results.skippedWords && Array.isArray(results.skippedWords)) {
            results.skippedWords.forEach(word => {
              if (word && !batchSkippedWords.includes(word)) {
                batchSkippedWords.push(word);
              }
            });
          }
          
          batches.push({
            batchNumber,
            range: `${startIndex}-${endIndex}`,
            added: results.added || 0,
            duplicates: results.duplicates || 0,
            skipped: results.skipped || 0,
            words: batch,
            skippedWords: batchSkippedWords
          });
          
          // Don't log batch completed - only log processing
        } catch (error) {
          console.error(`Error processing batch ${batchNumber}:`, error);
          addDebugLog(`❌ Error in batch ${batchNumber}: ${error.response?.data?.message || error.message}`, true);
        }
      }

      setAddedWordsBatches(batches);
      setSkippedWords(allSkippedWords);
      
      const results = {
        total: allWords.length,
        added: totalAdded,
        duplicates: totalDuplicates,
        skipped: totalSkipped
      };
      
      setDatabaseResults(results);
      setDatabaseTimestamp(new Date());

      // Reset progress tracking
      setBatchProgress({
        currentBatch: 0,
        totalBatches: 0,
        currentWords: 0,
        totalWords: 0,
        isProcessing: false
      });

      addDebugLog(`✅ Completed! Total: ${totalAdded} added, ${totalDuplicates} duplicates, ${totalSkipped} skipped`, true);
      setAddingWords(false);
      return { success: true, results: results, sourceInfo: sourceInfoFromAPI };
    } catch (error) {
      console.error('Error adding words:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to add words';
      addDebugLog(`❌ Error: ${errorMessage}`);
      
      // Reset progress tracking on error
      setBatchProgress({
        currentBatch: 0,
        totalBatches: 0,
        currentWords: 0,
        totalWords: 0,
        isProcessing: false
      });
      
      setAddingWords(false);
      return { success: false, results: null };
    }
  };

  const handleFillWordColumns = async () => {
    setFillingColumns(true);
    
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
      const totalBatches = Math.ceil(wordTexts.length / batchSize);
      const batches = [];
      let totalUpdated = 0;
      
      // Initialize progress tracking
      setBatchProgress({
        currentBatch: 0,
        totalBatches: totalBatches,
        currentWords: 0,
        totalWords: wordTexts.length,
        isProcessing: true
      });
      
      // Process in batches of 50 words
      for (let i = 0; i < wordTexts.length; i += batchSize) {
        const batch = wordTexts.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const startIndex = i + 1;
        const endIndex = Math.min(i + batchSize, wordTexts.length);
        
        // Update progress - set to start of batch, simulation will increment it
        setBatchProgress({
          currentBatch: batchNumber,
          totalBatches: totalBatches,
          currentWords: startIndex - 1, // Start from previous word, simulation will increment
          totalWords: wordTexts.length,
          isProcessing: true
        });
        
        addDebugLog(`Adding missing informations; Batch ${batchNumber}: words ${startIndex}-${endIndex} (${batch.length} words)`, true);
        
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
          
          // Don't log batch completed - only log processing
          
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
      
      // Reset progress tracking
      setBatchProgress({
        currentBatch: 0,
        totalBatches: 0,
        currentWords: 0,
        totalWords: 0,
        isProcessing: false
      });
      
      addDebugLog(`✅ Completed! Total: ${totalUpdated} words updated`, true);
    } catch (error) {
      console.error('Error filling word columns:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fill word columns';
      addDebugLog(`❌ Error: ${errorMessage}`);
      
      // Reset progress tracking on error
      setBatchProgress({
        currentBatch: 0,
        totalBatches: 0,
        currentWords: 0,
        totalWords: 0,
        isProcessing: false
      });
      
      if (error.response?.data?.responsePreview) {
        addDebugLog(`📄 AI response preview: ${error.response.data.responsePreview}`);
      }
    } finally {
      setFillingColumns(false);
    }
  };

  // Calculate assigned level based on source name using weighted mean algorithm
  const calculateAssignedLevel = async (sourceName) => {
    if (!sourceName || sourceName.trim() === '') {
      addDebugLog('⚠️ Cannot calculate assigned level: source name is empty');
      return null;
    }

    try {
      addDebugLog('📊 Calculating assigned level');

      // Filter database with source name
      // First, get all sources to find the one matching the source name
      const sourcesResponse = await wordAPI.getSources();
      const allSources = sourcesResponse.data?.sources || sourcesResponse.data || [];
      
      // Find source by name - check both 'name' and 'title' properties
      const matchingSource = allSources.find(s => {
        const sourceNameToCheck = (s.name || s.title || '').trim();
        return sourceNameToCheck === sourceName.trim();
      });

      if (!matchingSource) {
        // Try partial match as fallback (in case of slight differences)
        const partialMatch = allSources.find(s => {
          const sourceNameToCheck = (s.name || s.title || '').trim().toLowerCase();
          const searchName = sourceName.trim().toLowerCase();
          return sourceNameToCheck.includes(searchName) || searchName.includes(sourceNameToCheck);
        });
        
        if (partialMatch) {
          const sourceId = partialMatch._id;
          
          // Get all words from this source
          const wordsResponse = await wordAPI.getWordsWithStatus({
            page: 1,
            limit: 1000,
            sourceId: sourceId.toString(),
            showKnown: 'true',
            showUnknown: 'true'
          });

          const words = wordsResponse.data.words || [];
          addDebugLog(`Found ${words.length} words in source "${partialMatch.name || partialMatch.title}"`, true);

          if (words.length === 0) {
            addDebugLog('⚠️ No words found in source');
            return null;
          }

          // Count levels (A1 to C2)
          const counts = {
            'A1': 0,
            'A2': 0,
            'B1': 0,
            'B2': 0,
            'C1': 0,
            'C2': 0
          };

          words.forEach(word => {
            if (word.englishLevel && counts.hasOwnProperty(word.englishLevel)) {
              counts[word.englishLevel]++;
            }
          });

          addDebugLog(`Level counts: A1:${counts.A1}, A2:${counts.A2}, B1:${counts.B1}, B2:${counts.B2}, C1:${counts.C1}, C2:${counts.C2}`, true);

          // Calculate weighted mean
          const values = {
            'A1': 1,
            'A2': 2,
            'B1': 4,
            'B2': 6,
            'C1': 7,
            'C2': 8
          };

          const N = Object.values(counts).reduce((sum, count) => sum + count, 0);
          
          if (N === 0) {
            addDebugLog('⚠️ No words with levels found');
            setLevelCalculation(null);
            return null;
          }

          let weightedSum = 0;
          const calculationDetails = [];
          Object.keys(counts).forEach(level => {
            const contribution = counts[level] * values[level];
            weightedSum += contribution;
            if (counts[level] > 0) {
              calculationDetails.push(`${level}: ${counts[level]} × ${values[level]} = ${contribution}`);
            }
          });

          const mean = weightedSum / N;

          // Map mean to CEFR level
          const mapCefr = (mean) => {
            if (mean < 1.5) return 'A1';
            if (mean < 2.5) return 'A2';
            if (mean < 3.5) return 'B1';
            if (mean < 4.5) return 'B2';
            if (mean < 5.5) return 'C1';
            return 'C2';
          };

          const assignedLevel = mapCefr(mean);
          addDebugLog(`Assigned level: ${assignedLevel} (mean: ${mean.toFixed(2)})`, true);

          // Store calculation details for debug display
          setLevelCalculation({
            counts: { ...counts },
            values: { ...values },
            N: N,
            weightedSum: weightedSum,
            mean: mean,
            assignedLevel: assignedLevel,
            calculationDetails: calculationDetails
          });

          // Update level breakdown display
          const levelBreakdownStr = DECK_LEVELS.map(lvl => {
            const count = counts[lvl] || 0;
            return `${lvl}: ${count}`;
          }).join(', ');
          setLevelBreakdown(levelBreakdownStr);

          return assignedLevel;
        }
        
        addDebugLog(`⚠️ Source not found: "${sourceName}"`);
        addDebugLog(`📋 Available sources: ${allSources.map(s => s.name || s.title || 'unnamed').join(', ')}`);
        return null;
      }

      const sourceId = matchingSource._id;

      // Get all words from this source
      const wordsResponse = await wordAPI.getWordsWithStatus({
        page: 1,
        limit: 1000,
        sourceId: sourceId.toString(),
        showKnown: 'true',
        showUnknown: 'true'
      });

      const words = wordsResponse.data.words || [];
      addDebugLog(`    Found ${words.length} words in source "${sourceName}"`, true);

      if (words.length === 0) {
        addDebugLog('⚠️ No words found in source');
        return null;
      }

      // Count levels (A1 to C2)
      const counts = {
        'A1': 0,
        'A2': 0,
        'B1': 0,
        'B2': 0,
        'C1': 0,
        'C2': 0
      };

      words.forEach(word => {
        if (word.englishLevel && counts.hasOwnProperty(word.englishLevel)) {
          counts[word.englishLevel]++;
        }
      });

      addDebugLog(`    Level counts: A1:${counts.A1}, A2:${counts.A2}, B1:${counts.B1}, B2:${counts.B2}, C1:${counts.C1}, C2:${counts.C2}`, true);

      // Calculate weighted mean
      const values = {
        'A1': 1,
        'A2': 2,
        'B1': 4,
        'B2': 6,
        'C1': 7,
        'C2': 8
      };

      const N = Object.values(counts).reduce((sum, count) => sum + count, 0);
      
      if (N === 0) {
        addDebugLog('⚠️ No words with levels found');
        setLevelCalculation(null);
        return null;
      }

      let weightedSum = 0;
      const calculationDetails = [];
      Object.keys(counts).forEach(level => {
        const contribution = counts[level] * values[level];
        weightedSum += contribution;
        if (counts[level] > 0) {
          calculationDetails.push(`${level}: ${counts[level]} × ${values[level]} = ${contribution}`);
        }
      });

      const mean = weightedSum / N;

      // Map mean to CEFR level
      const mapCefr = (mean) => {
        if (mean < 1.5) return 'A1';
        if (mean < 2.5) return 'A2';
        if (mean < 3.5) return 'B1';
        if (mean < 4.5) return 'B2';
        if (mean < 5.5) return 'C1';
        return 'C2';
      };

      const assignedLevel = mapCefr(mean);
      addDebugLog(`    Assigned level: ${assignedLevel} (mean: ${mean.toFixed(2)})`, true);

      // Store calculation details for debug display
      setLevelCalculation({
        counts: { ...counts },
        values: { ...values },
        N: N,
        weightedSum: weightedSum,
        mean: mean,
        assignedLevel: assignedLevel,
        calculationDetails: calculationDetails
      });

      // Update level breakdown display
      const levelBreakdownStr = DECK_LEVELS.map(lvl => {
        const count = counts[lvl] || 0;
        return `${lvl}: ${count}`;
      }).join(', ');
      setLevelBreakdown(levelBreakdownStr);

      return assignedLevel;
    } catch (error) {
      console.error('Error calculating assigned level:', error);
      addDebugLog(`⚠️ Error calculating assigned level: ${error.message}`);
      return null;
    }
  };

  const analyzeAndFillDeckMetadata = async (wordsFromCurrentRun = null) => {
    try {
      // Get the latest source ID from the words that were just added
      // First, try to get words from the most recent source by querying sources
      let latestSourceId = null;
      
      try {
        // Get all sources and find the most recent one
        const sourcesResponse = await wordAPI.getSources();
        const sources = sourcesResponse.data.sources || [];
        
        if (sources.length > 0) {
          // Sort by creation date or ID to get the most recent
          const sortedSources = sources.sort((a, b) => {
            // Try to sort by createdAt if available, otherwise by _id
            if (a.createdAt && b.createdAt) {
              return new Date(b.createdAt) - new Date(a.createdAt);
            }
            return (b._id || '').localeCompare(a._id || '');
          });
          latestSourceId = sortedSources[0]._id;
        }
      } catch (error) {
        console.error('Error getting sources:', error);
      }
      
      // Fallback: try to get source ID from words
      if (!latestSourceId) {
        const response = await wordAPI.getWordsWithStatus({
          page: 1,
          limit: 100,
          showKnown: 'true',
          showUnknown: 'true'
        });
        
        const words = response.data.words || [];
        if (words.length > 0) {
          const sourceIds = new Set();
          words.forEach(word => {
            if (word.sourceId) {
              sourceIds.add(word.sourceId);
            }
          });
          
          if (sourceIds.size > 0) {
            latestSourceId = Math.max(...Array.from(sourceIds));
          }
        }
      }
      
      if (!latestSourceId) {
        addDebugLog('⚠️ No source ID found. Cannot analyze metadata.');
        // Still try to set defaults even without source ID
        if (!level || level === '') {
          if (DECK_LEVELS.length > 0) {
            setLevel(DECK_LEVELS[0]);
            addDebugLog(`📊 Level set to: ${DECK_LEVELS[0]} (default, no source ID)`);
          }
        }
        if (!skill || skill === '') {
          // Determine skill based on source type: SRT and YouTube = Listening, others = Reading
          let suggestedSkill = '';
          if (webpageUrl) {
            if (webpageUrl.includes('youtube.com') || webpageUrl.includes('youtu.be')) {
              suggestedSkill = 'Listening';
            } else {
              suggestedSkill = 'Reading';
            }
          } else if (debugFile?.name) {
            const ext = debugFile.name.toLowerCase().split('.').pop();
            if (ext === 'srt') {
              suggestedSkill = 'Listening';
            } else {
              suggestedSkill = 'Reading';
            }
          } else {
            suggestedSkill = 'Reading';
          }
          
          if (suggestedSkill && DECK_SKILLS.includes(suggestedSkill)) {
            setSkill(suggestedSkill);
            addDebugLog(`📊 Skill set to: ${suggestedSkill} (based on source type, no source ID)`);
          } else if (DECK_SKILLS.includes('Reading')) {
            setSkill('Reading');
            addDebugLog(`📊 Skill set to: Reading (default, no source ID)`);
          } else if (DECK_SKILLS.length > 0) {
            setSkill(DECK_SKILLS[0]);
            addDebugLog(`📊 Skill set to: ${DECK_SKILLS[0]} (default, no source ID)`);
          }
        }
        if (!task || task === '') {
          // Task is always "Vocabulary" for this feature
          if (DECK_TASKS.includes('Vocabulary')) {
            setTask('Vocabulary');
            addDebugLog(`📊 Task set to: Vocabulary (always for this feature)`);
          } else if (DECK_TASKS.length > 0) {
            setTask(DECK_TASKS[0]);
            addDebugLog(`📊 Task set to: ${DECK_TASKS[0]} (default, no source ID)`);
          }
        }
      return;
    }
    
      // Get words from this source
      const sourceWordsResponse = await wordAPI.getWordsWithStatus({
        page: 1,
        limit: 1000,
        sourceId: latestSourceId.toString(),
        showKnown: 'true',
        showUnknown: 'true'
      });
      
      const sourceWords = sourceWordsResponse.data.words || [];
      if (sourceWords.length === 0) {
        addDebugLog('⚠️ No words found from source for analysis');
        // Still set Level, Skill and Task even if no words found
        if (!level || level === '') {
          if (DECK_LEVELS.length > 0) {
            setLevel(DECK_LEVELS[0]);
            addDebugLog(`📊 Level set to: ${DECK_LEVELS[0]} (default, no words found)`);
          }
        }
        if (!skill || skill === '') {
          let suggestedSkill = '';
          if (webpageUrl) {
            if (webpageUrl.includes('youtube.com') || webpageUrl.includes('youtu.be')) {
              suggestedSkill = 'Listening';
            } else {
              suggestedSkill = 'Reading';
            }
          } else if (debugFile?.name) {
            const ext = debugFile.name.toLowerCase().split('.').pop();
            if (ext === 'srt') {
              suggestedSkill = 'Listening';
            } else {
              suggestedSkill = 'Reading';
            }
          } else {
            suggestedSkill = 'Reading';
          }
          
          if (suggestedSkill && DECK_SKILLS.includes(suggestedSkill)) {
            setSkill(suggestedSkill);
            addDebugLog(`📊 Skill set to: ${suggestedSkill} (based on source type, no words found)`);
          }
        }
        if (!task || task === '') {
          if (DECK_TASKS.includes('Vocabulary')) {
            setTask('Vocabulary');
            addDebugLog(`📊 Task set to: Vocabulary (always for this feature)`);
          }
        }
        return;
      }
      
      // Analyze Level (from englishLevel)
      // Always calculate and display level breakdown, even if level is already set
      // Filter to only words from current run (added + duplicates = 13 words in this example)
      let wordsToAnalyze = [];
      
      if (wordsFromCurrentRun && wordsFromCurrentRun.length > 0) {
        // Create a set of words from current run (case-insensitive, normalize)
        const normalizeWord = (w) => w.toLowerCase().trim().replace(/[^\w\s]/g, '');
        const currentRunWordsSet = new Set(wordsFromCurrentRun.map(normalizeWord));
        
        // Filter source words to only include those from current run
        wordsToAnalyze = sourceWords.filter(word => {
          if (!word.englishWord) return false;
          const normalizedDbWord = normalizeWord(word.englishWord);
          return currentRunWordsSet.has(normalizedDbWord);
        });
        
        // If no words matched, try without normalization (exact match)
        if (wordsToAnalyze.length === 0) {
          const exactMatchSet = new Set(wordsFromCurrentRun.map(w => w.toLowerCase().trim()));
          wordsToAnalyze = sourceWords.filter(word => 
            word.englishWord && exactMatchSet.has(word.englishWord.toLowerCase().trim())
          );
        }
        
        // If still no match, try querying words directly by their text
        if (wordsToAnalyze.length === 0 && wordsFromCurrentRun.length > 0) {
          try {
            // Query words by searching for each word
            const wordQueries = wordsFromCurrentRun.slice(0, 20); // Limit to avoid too many queries
            const foundWords = [];
            
            for (const wordText of wordQueries) {
              try {
                const searchResponse = await wordAPI.getWordsWithStatus({
                  page: 1,
                  limit: 100,
                  search: wordText.trim(),
                  showKnown: 'true',
                  showUnknown: 'true',
                  sourceId: latestSourceId.toString()
                });
                
                const matchingWords = searchResponse.data.words || [];
                const exactMatch = matchingWords.find(w => 
                  w.englishWord && w.englishWord.toLowerCase().trim() === wordText.toLowerCase().trim()
                );
                
                if (exactMatch) {
                  foundWords.push(exactMatch);
                }
              } catch (err) {
                // Skip if query fails
              }
            }
            
            if (foundWords.length > 0) {
              wordsToAnalyze = foundWords;
            }
          } catch (error) {
            console.error('Error querying words directly:', error);
          }
        }
      } else {
        // If no words from current run provided, use all source words
        wordsToAnalyze = sourceWords;
      }
      
      const levelCounts = {};
      let wordsWithLevel = 0;
      let wordsWithoutLevel = 0;
      wordsToAnalyze.forEach(word => {
        if (word.englishLevel) {
          levelCounts[word.englishLevel] = (levelCounts[word.englishLevel] || 0) + 1;
          wordsWithLevel++;
        } else {
          wordsWithoutLevel++;
        }
      });
      
      // If we have words from current run but couldn't find them in source, show breakdown with zeros
      if (wordsToAnalyze.length === 0 && wordsFromCurrentRun && wordsFromCurrentRun.length > 0) {
        // Show breakdown with zeros but indicate it's for the current run words
        const levelBreakdownStr = DECK_LEVELS.map(lvl => `${lvl}: 0`).join(', ');
        setLevelBreakdown(levelBreakdownStr);
      } else {
        if (wordsWithoutLevel > 0) {
          addDebugLog(`⚠️ ${wordsWithoutLevel} words don't have englishLevel set yet (out of ${wordsToAnalyze.length} analyzed)`);
        }
        
        // Always show level breakdown in debug pane
        const levelBreakdownStr = DECK_LEVELS.map(lvl => {
          const count = levelCounts[lvl] || 0;
          return `${lvl}: ${count}`;
        }).join(', ');
        setLevelBreakdown(levelBreakdownStr); // Store for debug display
        
        // Show total analyzed words in breakdown
        const totalAnalyzed = wordsToAnalyze.length;
        addDebugLog(`📊 Level breakdown: ${levelBreakdownStr} | Analyzed: ${totalAnalyzed} words (${wordsWithLevel} with level, ${wordsWithoutLevel} without level)`);
      }
      
      // Set level if it's empty
      if (!level || level === '') {
        if (Object.keys(levelCounts).length > 0) {
          // Find the most common level
          const mostCommonLevel = Object.entries(levelCounts).reduce((a, b) => 
            levelCounts[a[0]] > levelCounts[b[0]] ? a : b
          )[0];
          
          // Use CEFR level directly (A1, A2, B1, B2, C1, C2)
          // Count A1, A2, B1, B2, C1, C2 and use the most common one
          if (DECK_LEVELS.includes(mostCommonLevel)) {
            setLevel(mostCommonLevel);
          } else if (DECK_LEVELS.length > 0) {
            // Fallback to first available level
            setLevel(DECK_LEVELS[0]);
          }
        } else {
          // No englishLevel found in words, use default
          if (DECK_LEVELS.length > 0) {
            setLevel(DECK_LEVELS[0]);
          }
        }
      }
      
      // Analyze Skill - SRT and YouTube URLs are Listening, others are Reading
      // Always try to set skill if it's empty
      if (!skill || skill === '') {
        let suggestedSkill = '';
        
        // Determine skill based on source type
        if (webpageUrl) {
          // Check if it's YouTube
          if (webpageUrl.includes('youtube.com') || webpageUrl.includes('youtu.be')) {
            suggestedSkill = 'Listening';
          } else {
            suggestedSkill = 'Reading';
          }
        } else if (debugFile?.name) {
          const ext = debugFile.name.toLowerCase().split('.').pop();
          if (ext === 'srt') {
            suggestedSkill = 'Listening';
          } else {
            suggestedSkill = 'Reading';
          }
        } else {
          // Default to Reading if we can't determine
          suggestedSkill = 'Reading';
        }
        
        if (suggestedSkill && DECK_SKILLS.includes(suggestedSkill)) {
          setSkill(suggestedSkill);
        } else if (DECK_SKILLS.includes('Reading')) {
          setSkill('Reading');
        } else if (DECK_SKILLS.length > 0) {
          setSkill(DECK_SKILLS[0]);
        }
      }
      
      // Analyze Task - Always "Vocabulary" for this feature
      // Always try to set task if it's empty
      if (!task || task === '') {
        if (DECK_TASKS.includes('Vocabulary')) {
          setTask('Vocabulary');
        } else if (DECK_TASKS.length > 0) {
          setTask(DECK_TASKS[0]);
        }
      }
    } catch (error) {
      console.error('Error analyzing deck metadata:', error);
      addDebugLog('⚠️ Could not analyze deck metadata');
    }
  };

  // Process All function - runs all steps automatically in sequence, always from Step 1
  const handleProcessAll = async () => {
    setProcessingAll(true);
    // Keep Details pane hidden when Run is clicked - user can click Details button to see it
    setDetailsExpanded(false);
    setLogsExpanded(true);
    setContentPreviewExpanded(true);
    
    try {
    const ext = debugFile?.name.toLowerCase().split('.').pop() || 'webpage';
    const isPDF = ext === 'pdf';
    const isWebpage = webpageUrl && webpageUrl.trim() !== '';
      const isSRT = ext === 'srt';
      const isTXT = ext === 'txt';
      
      // Step 1: Convert - Always run
      let convertedContent = null;
      let sourceWordCount = 0;
      if (isWebpage) {
        addDebugLog('🔄 Step 1: Converting webpage...');
        convertedContent = await handleConvertWebpage();
        // Wait a bit for state to update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!convertedContent) {
          addDebugLog('❌ Step 1 failed: Webpage conversion failed. Cannot proceed.');
          return;
        }
        sourceWordCount = countWords(convertedContent);
      } else if (isPDF) {
        // PDF conversion happens during upload, so use the already converted content
        if (debugConvertedContent) {
          addDebugLog('📄 Using PDF content converted during upload...');
          convertedContent = debugConvertedContent;
          sourceWordCount = countWords(convertedContent);
        } else {
          addDebugLog('❌ PDF conversion must be done during upload. Please upload the file again.');
          return;
        }
      } else {
        // SRT/TXT - convert to MD
        addDebugLog('🔄 Step 1: Converting to Markdown...');
        convertedContent = handleConvertToMD();
        // Wait a bit for state to update
        await new Promise(resolve => setTimeout(resolve, 100));
        sourceWordCount = countWords(convertedContent);
        
        // Step 2: Clean (only for SRT/TXT files) - use converted content directly
        if (isSRT || isTXT) {
          addDebugLog('🧹 Step 2: Cleaning SRT content...');
          handleCleanSRT(convertedContent);
          // Wait a bit for cleaning
          await new Promise(resolve => setTimeout(resolve, 100));
          // Update source word count to cleaned content
          if (debugCleanedContent) {
            sourceWordCount = countWords(debugCleanedContent);
          }
        }
      }
      
      // Step 3: Send to AI - Always run, pass converted content directly to avoid state timing issues
      addDebugLog('🤖 Step 3: Sending to AI...');
      // For webpage, use the directly returned content; for others, let handleSendToAI determine from state
      const contentForAI = isWebpage ? convertedContent : null;
      const step3Result = await handleSendToAI(contentForAI);
      
      // Check if Step 3 was successful before proceeding
      if (!step3Result.success || !step3Result.response) {
        addDebugLog('❌ Step 3 failed: No AI response received. Cannot proceed to Step 4.');
        return;
      }
      
      // Count AI cleaned words
      const aiCleanedWordCount = countWords(step3Result.response);
      
      // Step 4: Add to DB - Always run, pass AI response directly to avoid state timing issues
      addDebugLog('💾 Step 4: Adding words to database...');
      const step4Result = await handleAddWordsToDatabase(step3Result.response);
      
      // Check if Step 4 was successful
      if (!step4Result || !step4Result.success) {
        addDebugLog('❌ Step 4 failed: Cannot add words to database.');
        return;
      }
      
      // Get database results directly from the return value
      const storedDbResults = step4Result.results || { added: 0, duplicates: 0, skipped: 0 };
      
      // Get source info from API response (title and description from AI)
      const sourceInfo = step4Result.sourceInfo || null;
      const aiGeneratedTitle = sourceInfo?.title || null;
      const aiGeneratedDescription = sourceInfo?.description || null;
      
      // Fill deck information after Step 6
      try {
        // Set Title - prioritize source title (webpagePageTitle), then AI generated, then file name
        if (!deckName) {
          if (webpagePageTitle) {
            setDeckName(webpagePageTitle);
            addDebugLog(`📝 Title set from source: ${webpagePageTitle}`);
          } else if (aiGeneratedTitle) {
            setDeckName(aiGeneratedTitle);
          } else if (debugFile?.name) {
            // Use file name without extension as title
            const fileName = debugFile.name.replace(/\.[^/.]+$/, '');
            setDeckName(fileName);
            addDebugLog(`📝 Title set from filename: ${fileName}`);
          }
        }
        
        // Set Description - prioritize AI generated, then fallback
        if (!deckDescription) {
          if (aiGeneratedDescription) {
            setDeckDescription(aiGeneratedDescription);
          } else {
            // Fallback description
            let description = '';
            if (webpageUrl) {
              description = `Vocabulary deck created from: ${webpageUrl}`;
            } else if (debugFile?.name) {
              description = `Vocabulary deck created from: ${debugFile.name}`;
            }
            if (sourceWordCount > 0) {
              description += `\n\nSource content: ${sourceWordCount} words`;
            }
            if (aiCleanedWordCount > 0) {
              description += `\nExtracted vocabulary: ${aiCleanedWordCount} words`;
            }
            setDeckDescription(description);
            addDebugLog(`📝 Description set (fallback)`);
          }
        }
        
        // Set Word Quantity - use added + duplicates (total words available)
        // Sum of added and duplicates gives the total words in the deck
        const totalWords = storedDbResults.added + storedDbResults.duplicates;
        const newQty = totalWords > 0 ? Math.min(totalWords, 100) : 0;
        setQuestionNumber(newQty);
      } catch (error) {
        console.error('Error filling deck information:', error);
        addDebugLog('⚠️ Could not auto-fill deck information');
      }
      
      // Always set Level, Skill and Task based on source type (before Step 5)
      try {
        // Set Level to default if not set
        if (!level || level === '') {
          if (DECK_LEVELS.length > 0) {
            setLevel(DECK_LEVELS[0]);
          }
        }
        
        // Set Skill based on source type
        if (!skill || skill === '') {
          let suggestedSkill = '';
          if (webpageUrl) {
            if (webpageUrl.includes('youtube.com') || webpageUrl.includes('youtu.be')) {
              suggestedSkill = 'Listening';
            } else {
              suggestedSkill = 'Reading';
            }
          } else if (debugFile?.name) {
            const ext = debugFile.name.toLowerCase().split('.').pop();
            if (ext === 'srt') {
              suggestedSkill = 'Listening';
            } else {
              suggestedSkill = 'Reading';
            }
          } else {
            suggestedSkill = 'Reading';
          }
          
          if (suggestedSkill && DECK_SKILLS.includes(suggestedSkill)) {
            setSkill(suggestedSkill);
          }
        }
        
        // Set Task - always Vocabulary
        if (!task || task === '') {
          if (DECK_TASKS.includes('Vocabulary')) {
            setTask('Vocabulary');
          }
        }
      } catch (error) {
        console.error('Error setting Level/Skill/Task:', error);
      }
      
      // Step 5: Fill columns with AI (with confirmation)
      try {
        const wordsResponse = await wordAPI.getWordsWithoutTurkish();
        const wordsToFill = wordsResponse.data.words || [];
        
        if (wordsToFill.length > 0) {
          // Calculate estimated time: 50 words = 2.5 minutes
          const estimatedMinutes = Math.round((wordsToFill.length / 50) * 2.5);
          const confirmed = window.confirm(
            `${wordsToFill.length} words will be processed, it may take ${estimatedMinutes} minutes. Do you want to continue?`
          );
          
          if (confirmed) {
            addDebugLog(`🤖 Step 5: Filling word columns with AI (${wordsToFill.length} words)...`);
            await handleFillWordColumns();
            
            // Wait a bit for database to update before analyzing metadata
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Extract words from current AI response for level analysis
            const currentRunWords = step3Result.response
              .split('\n')
              .map(line => line.trim())
              .filter(line => line.length > 0);
            
            // Analyze and fill Level, Skill, Task after Step 9
            await analyzeAndFillDeckMetadata(currentRunWords);
            
            // Calculate assigned level based on source name (after Step 9)
            if (sourceInfo && sourceInfo.title) {
              const assignedLevel = await calculateAssignedLevel(sourceInfo.title);
              if (assignedLevel && DECK_LEVELS.includes(assignedLevel)) {
                setLevel(assignedLevel);
              }
            }
            
            // Use stored results directly (no need to wait, we have the correct values)
            addDebugLog(`✅ Completed! | Source: ${sourceWordCount} w | AI cleaned: ${aiCleanedWordCount} w | ${storedDbResults.added} add, ${storedDbResults.duplicates} dup, ${storedDbResults.skipped} skip`);
            
            // Automatically apply filter for the active source when process completes
            const applySourceFilter = async () => {
              // Use sourceId from sourceInfo if available, otherwise use activeSourceId
              let sourceIdToUse = sourceInfo?.sourceId || activeSourceId;
              
              // If still not set, reload sources to get the latest one
              if (!sourceIdToUse) {
                await loadSources();
                // Wait a bit for state to update
                await new Promise(resolve => setTimeout(resolve, 300));
                sourceIdToUse = activeSourceId;
              }
              
              if (sourceIdToUse && handleSelectActiveSource) {
                handleSelectActiveSource(sourceIdToUse);
              }
            };
            
            // Small delay to ensure source is fully created and database is updated
            setTimeout(applySourceFilter, 500);
          } else {
            addDebugLog('⏸️ Step 5: Cancelled by user');
          }
        } else {
          // Even if no words need filling, analyze metadata if words were added or duplicated
          // We still want to analyze level breakdown even for duplicates
          if (storedDbResults.added > 0 || storedDbResults.duplicates > 0) {
            // Wait a bit for database to update before analyzing metadata
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Extract words from current AI response for level analysis
            const currentRunWords = step3Result.response
              .split('\n')
              .map(line => line.trim())
              .filter(line => line.length > 0);
            
            await analyzeAndFillDeckMetadata(currentRunWords);
            
            // Calculate assigned level based on source name (after Step 9)
            if (sourceInfo && sourceInfo.title) {
              const assignedLevel = await calculateAssignedLevel(sourceInfo.title);
              if (assignedLevel && DECK_LEVELS.includes(assignedLevel)) {
                setLevel(assignedLevel);
              }
            }
          } else {
            // Even if no words were added, still set Skill and Task based on source type
            if (!skill || skill === '') {
              let suggestedSkill = '';
              if (webpageUrl) {
                if (webpageUrl.includes('youtube.com') || webpageUrl.includes('youtu.be')) {
                  suggestedSkill = 'Listening';
                } else {
                  suggestedSkill = 'Reading';
                }
              } else if (debugFile?.name) {
                const ext = debugFile.name.toLowerCase().split('.').pop();
                if (ext === 'srt') {
                  suggestedSkill = 'Listening';
                } else {
                  suggestedSkill = 'Reading';
                }
              } else {
                suggestedSkill = 'Reading';
              }
              
              if (suggestedSkill && DECK_SKILLS.includes(suggestedSkill)) {
                setSkill(suggestedSkill);
              }
            }
            if (!task || task === '') {
              if (DECK_TASKS.includes('Vocabulary')) {
                setTask('Vocabulary');
              }
            }
          }
          addDebugLog('✅ Step 5: No words need column filling. All done!');
          
          // Even if no words need filling, still calculate assigned level if we have duplicates
          if (storedDbResults.duplicates > 0 && sourceInfo && sourceInfo.title) {
            const assignedLevel = await calculateAssignedLevel(sourceInfo.title);
            if (assignedLevel && DECK_LEVELS.includes(assignedLevel)) {
              setLevel(assignedLevel);
            }
          }
          
          // Use stored results directly (no need to wait, we have the correct values)
          addDebugLog(`✅ Completed! | Source: ${sourceWordCount} w | AI cleaned: ${aiCleanedWordCount} w | ${storedDbResults.added} add, ${storedDbResults.duplicates} dup, ${storedDbResults.skipped} skip`);
          
          // Automatically apply filter for the active source when process completes
          const applySourceFilter = async () => {
            // Use sourceId from sourceInfo if available, otherwise use activeSourceId
            let sourceIdToUse = sourceInfo?.sourceId || activeSourceId;
            
            // If still not set, reload sources to get the latest one
            if (!sourceIdToUse) {
              await loadSources();
              // Wait a bit for state to update
              await new Promise(resolve => setTimeout(resolve, 300));
              sourceIdToUse = activeSourceId;
            }
            
            if (sourceIdToUse && handleSelectActiveSource) {
              handleSelectActiveSource(sourceIdToUse);
            }
          };
          
          // Small delay to ensure source is fully created and database is updated
          setTimeout(applySourceFilter, 500);
        }
      } catch (error) {
        console.error('Error checking words without Turkish:', error);
        addDebugLog('❌ Error checking words for column filling');
      }
    } catch (error) {
      console.error('Error in process all:', error);
      addDebugLog(`❌ Error: ${error.message}`);
    } finally {
      setProcessingAll(false);
    }
  };

  const handleSendToAI = async (contentOverride = null) => {
    // Determine file type
    const ext = debugFile?.name.toLowerCase().split('.').pop() || 'webpage';
    const isPDF = ext === 'pdf';
    const isWebpage = webpageUrl && webpageUrl.trim() !== '';
    
    // Use provided content or determine from state
    // For PDF and Webpage: use converted content directly (cleaning is done by AI)
    // For SRT/TXT: prioritize cleaned content, then converted, then raw file
    const contentToSend = contentOverride || (
      (isPDF || isWebpage)
      ? (debugConvertedContent || debugFileContent)
        : (debugCleanedContent || debugConvertedContent || debugFileContent)
    );
    
    if (!contentToSend) {
      addDebugLog('❌ No content to send. Please upload and convert a file or webpage first.');
      return { success: false, response: null };
    }

    // Backend will build the prompt automatically based on file type
    const fileType = isWebpage ? 'pdf' : ext; // Treat webpage like PDF for AI processing

    setSendingToAI(true);
    if (isPDF) {
      addDebugLog('📄 PDF file detected - AI is cleaning and extracting vocabulary', true);
    } else if (isWebpage) {
      addDebugLog('🌐 Webpage detected - AI is cleaning and extracting vocabulary', true);
    }
    
    try {
      // Backend builds the prompt automatically - no need to send custom prompt
      const response = await flashcardAPI.processMarkdownWithAI(contentToSend, fileType || null, null);
      const aiResponse = response.data.response;
      const aiPrompt = response.data.prompt;
      
      if (!aiResponse || aiResponse.trim() === '') {
        addDebugLog('❌ Empty AI response received.');
        setDebugAIResponse('');
        setSendingToAI(false);
        return { success: false, response: null };
      }
      
      setDebugAIResponse(aiResponse);
      setDebugAIPrompt(aiPrompt);
      setFirstAIPromptTimestamp(new Date());
      setFirstAIResponseTimestamp(new Date());
      
      addDebugLog('Waiting for AI response...', true);
      const wordCount = countWords(aiResponse);
      addDebugLog(`AI response received. (${aiResponse.length} characters = ${wordCount} words)`, true);
      setSendingToAI(false);
      return { success: true, response: aiResponse };
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
      setSendingToAI(false);
      return { success: false, response: null };
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

      {/* Import from a source Section */}
      <div className="enhanced-ai-section" style={{ 
        marginBottom: '2rem', 
        padding: '1.5rem',
        border: '2px dashed #ddd',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9'
      }}>
        <h2 style={{ 
          margin: '0 0 1.5rem 0', 
          fontSize: '1.2rem',
          fontWeight: '600',
          color: '#2d3748'
        }}>
          Import from a source
        </h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem', 
          marginBottom: '1rem',
          alignItems: 'stretch'
        }}>
          {/* File Upload */}
          <div style={{
            background: '#fff',
            padding: '1rem',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100%'
          }}>
            <label style={{ 
              display: 'block',
              marginBottom: '0.75rem', 
              fontWeight: '600',
              color: '#2d3748',
              fontSize: '0.95rem'
            }}>
              Upload File (SRT, TXT, or PDF)
            </label>
            <input
              type="file"
              accept=".srt,.txt,.pdf"
              onChange={handleDebugFileUpload}
              style={{ 
                marginBottom: '0.75rem', 
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'border-color 0.2s'
              }}
              disabled={convertingPDF || convertingWebpage}
              onMouseEnter={(e) => !convertingPDF && !convertingWebpage && (e.target.style.borderColor = '#667eea')}
              onMouseLeave={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>

          {/* Webpage URL Input */}
          <div style={{
            background: '#fff',
            padding: '1rem',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100%'
          }}>
              <label style={{ 
                display: 'block',
                marginBottom: '0.75rem', 
                fontWeight: '600',
                color: '#2d3748',
                fontSize: '0.95rem'
              }}>
                Webpage/YouTube URL
              </label>
              <input
                type="text"
                value={webpageUrl}
                onChange={(e) => setWebpageUrl(e.target.value)}
                placeholder="https://example.com/article or https://youtube.com/watch?v=..."
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                borderRadius: '8px', 
                border: '2px solid #e2e8f0',
                fontSize: '0.9rem',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
              disabled={convertingWebpage || convertingPDF || !!debugFile || processingAll}
              onFocus={(e) => e.target.style.borderColor = '#667eea' && (e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)')}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0' && (e.target.style.boxShadow = 'none')}
            />
            </div>
              </div>

        {/* Progress Label and Buttons - Wrap to new line if needed */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {/* Progress Label - Animated log display - Always visible when there's a log - Minimum 350px */}
          {(currentProgressLog || (debugLogs.length > 0 && debugLogs[debugLogs.length - 1])) && (
            <div style={{ 
              flex: '1 1 350px',
              minWidth: '350px',
              padding: '0.75rem 1rem',
              backgroundColor: '#e3f2fd',
              borderRadius: '8px',
              border: '1px solid #90caf9',
              minHeight: '40px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <div style={{ 
                fontSize: '0.9rem',
                color: '#1565c0',
                fontWeight: '500',
                opacity: currentProgressLog ? progressLogOpacity : 1,
                transition: 'opacity 0.6s ease-in-out',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                flexWrap: 'nowrap',
                minWidth: 0
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  flex: '1',
                  minWidth: 0,
                  overflow: 'hidden'
                }}>
                  <strong style={{ whiteSpace: 'nowrap' }}>Progress:</strong>
                  <span style={{ 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {(currentProgressLog || (debugLogs.length > 0 ? debugLogs[debugLogs.length - 1] : '')).replace(/^\[.*?\]\s*/, '')}
                  </span>
                </div>
                {batchProgress.isProcessing && batchProgress.totalWords > 0 && (
                  <span style={{ 
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: '#0ea5e9',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}>
                    {Math.round((batchProgress.currentWords / batchProgress.totalWords) * 100)}% | {batchProgress.currentWords}/{batchProgress.totalWords}
                  </span>
            )}
          </div>
        </div>
          )}
          <button
            type="button"
            onClick={() => setDetailsExpanded(!detailsExpanded)}
            style={{ 
              background: '#fff',
              border: '1px solid #e2e8f0',
              color: '#2d3748',
              padding: '0.75rem 1.5rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              minWidth: '90px'
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#667eea';
              e.target.style.color = '#667eea';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#e2e8f0';
              e.target.style.color = '#2d3748';
            }}
          >
            {detailsExpanded ? 'Hide Details' : 'Details'}
          </button>
          <button
            type="button"
            onClick={handleProcessAll}
            disabled={processingAll || (!debugFile && !webpageUrl)}
            style={{ 
              background: processingAll || (!debugFile && !webpageUrl) 
                ? 'linear-gradient(135deg, #a0aec0 0%, #718096 100%)'
                : 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
              border: 'none',
              color: 'white',
              padding: '0.75rem 1.5rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              borderRadius: '8px',
              cursor: processingAll || (!debugFile && !webpageUrl) ? 'not-allowed' : 'pointer',
              boxShadow: processingAll || (!debugFile && !webpageUrl) 
                ? 'none' 
                : '0 4px 6px rgba(72, 187, 120, 0.3)',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              minWidth: '90px'
            }}
            onMouseEnter={(e) => {
              if (!processingAll && (debugFile || webpageUrl)) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 12px rgba(72, 187, 120, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!processingAll && (debugFile || webpageUrl)) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 6px rgba(72, 187, 120, 0.3)';
              }
            }}
          >
            {processingAll ? 'Processing...' : 'Run'}
          </button>
        </div>

        {/* Details Pane - Contains Logs and Content Preview */}
        {detailsExpanded && (debugFile || webpageUrl) && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            backgroundColor: '#fff', 
            borderRadius: '8px', 
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Logs Pane - Expandable/Collapsible - Always show header */}
            {(debugFile || webpageUrl) && (
              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#1e1e1e', borderRadius: '8px', border: '1px solid #333' }}>
            <div 
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                    marginBottom: logsExpanded ? '0.5rem' : '0',
                    cursor: 'pointer'
                  }}
                  onClick={() => setLogsExpanded(!logsExpanded)}
                >
                  <h3 style={{ margin: '0', fontSize: '0.9rem', color: '#4a90e2', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{logsExpanded ? '▼' : '▶'}</span>
                    <span>Logs</span>
              </h3>
            <span style={{ fontSize: '0.75rem', color: '#888' }}>{debugLogs.length} entries</span>
          </div>
                {logsExpanded && (
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
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
                )}
              </div>
            )}

            {/* Content Preview - AI Request Sequence - Expandable/Collapsible - Always show header when there's content */}
        {(originalFileContent || debugCleanedContent || debugAIPrompt || debugAIResponse || databaseResults || secondAIPrompt || secondAIResponse) && (
              <div style={{ padding: '1rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}>
                <div 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: contentPreviewExpanded ? '0.5rem' : '0',
                    cursor: 'pointer'
                  }}
                  onClick={() => setContentPreviewExpanded(!contentPreviewExpanded)}
                >
                  <h3 style={{ margin: '0', fontSize: '0.9rem', color: '#2c5282', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{contentPreviewExpanded ? '▼' : '▶'}</span>
                    <span>Content Preview - AI Request Sequence</span>
                  </h3>
                </div>
                {contentPreviewExpanded && (
                  <>
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
                          backgroundColor: '#f0f9ff', 
                  borderRadius: '4px', 
                  overflow: 'auto', 
                  maxHeight: '100px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                          border: '1px solid #0ea5e9',
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
            
                    {/* Step 3.1: 1st AI Output */}
            {debugAIResponse && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <strong style={{ fontSize: '0.85rem', color: '#666' }}>Step 3.1: 1st AI Output (first 200 chars)</strong>
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
                          backgroundColor: '#f0f9ff', 
                  borderRadius: '4px', 
                          border: '1px solid #0ea5e9',
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
                          backgroundColor: '#f0f9ff', 
                  borderRadius: '4px', 
                          border: '1px solid #0ea5e9',
                  marginTop: '0.25rem'
                }}>
                  <div><strong>Total words processed:</strong> {databaseResults.total}</div>
                  <div><strong>New words added:</strong> {databaseResults.added}</div>
                  <div><strong>Repeated/duplicates:</strong> {databaseResults.duplicates}</div>
                  {databaseResults.skipped > 0 && (
                            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #c3e6cb' }}>
                      <div><strong>Skipped (invalid):</strong> {databaseResults.skipped}</div>
                              {skippedWords.length > 0 ? (
                                <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffc107' }}>
                                  <div style={{ fontSize: '0.7rem', color: '#856404', marginBottom: '0.25rem' }}>
                                    <strong>Skipped words ({skippedWords.length}):</strong>
                                  </div>
                                  <div style={{ 
                                    fontSize: '0.65rem', 
                                    color: '#d32f2f',
                                    maxHeight: '150px',
                                    overflowY: 'auto',
                                    wordBreak: 'break-word',
                                    lineHeight: '1.5',
                                    fontFamily: 'monospace'
                                  }}>
                                    {skippedWords.join(', ')}
                                  </div>
                                </div>
                              ) : (
                                <div style={{ marginTop: '0.25rem', fontSize: '0.65rem', color: '#666', fontStyle: 'italic' }}>
                                  (Skipped word details not available)
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

                    {/* Step 9: Completed */}
                    {fillColumnsBatches && fillColumnsBatches.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <strong style={{ fontSize: '0.85rem', color: '#666' }}>Step 9: Completed</strong>
                          <span style={{ fontSize: '0.7rem', color: '#888' }}>
                            {new Date().toLocaleTimeString()}
                          </span>
                        </div>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          padding: '0.5rem', 
                          backgroundColor: '#f0f9ff', 
                          borderRadius: '4px', 
                          border: '1px solid #0ea5e9',
                          marginTop: '0.25rem'
                        }}>
                          <div style={{ marginBottom: '0.5rem' }}>
                            <strong>Batches processed:</strong> {fillColumnsBatches.length}
                          </div>
                          {fillColumnsBatches.map((batch, idx) => (
                            <div key={idx} style={{ marginLeft: '1rem', fontSize: '0.65rem', marginBottom: '0.25rem' }}>
                              Batch {batch.batchNumber} (words {batch.range}): {batch.updated} words updated
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
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

          {/* AI Prompt Info - Hidden but not deleted */}
          {false && (debugFile || webpageUrl) && (
            <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#e3f2fd', borderRadius: '8px', border: '1px solid #2196f3' }}>
              <div style={{ fontSize: '0.85rem', color: '#1565c0' }}>
                💡 <strong>Note:</strong> AI prompts are automatically generated by the backend based on file type. 
                The prompt will be shown in the "Content Preview" section after sending to AI.
            </div>
          </div>
        )}

          {/* Hidden buttons - kept for potential future use */}
          {false && (
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
          )}

      {/* Deck Informations Section */}
      <div className="enhanced-ai-section" style={{ marginBottom: '2rem', padding: '1.5rem', border: '2px dashed #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>
          Deck Informations
        </h2>
        
        {/* ============================================================================
            DEBUG: Debug Info Display - Hidden but kept for future use
            Uncomment to show debug information about deck metadata
            ============================================================================ */}
        {false && (
          <div style={{
            background: '#fff3cd',
            border: '2px solid #ffc107',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            fontSize: '0.9rem',
            color: '#856404'
          }}>
            <strong>🔍 Debug Info:</strong>
            <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              <span><strong>Card (qty):</strong> {questionNumber}</span>
              <span><strong>Level:</strong> {level || '(not set)'}</span>
              <span><strong>Skill:</strong> {skill || '(not set)'}</span>
              <span><strong>Task:</strong> {task || '(not set)'}</span>
            </div>
            {levelBreakdown && (
              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #ffc107', fontSize: '0.85rem' }}>
                <strong>Level breakdown:</strong> {levelBreakdown}
              </div>
            )}
            {levelCalculation && (
              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #ffc107', fontSize: '0.85rem' }}>
                <strong>Level calculation:</strong>
                <div style={{ marginTop: '0.25rem', fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: '1.4' }}>
                  <div><strong>Counts:</strong> {DECK_LEVELS.map(lvl => `${lvl}: ${levelCalculation.counts[lvl] || 0}`).join(', ')}</div>
                  <div style={{ marginTop: '0.25rem' }}><strong>Values:</strong> {DECK_LEVELS.map(lvl => `${lvl}: ${levelCalculation.values[lvl]}`).join(', ')}</div>
                  {levelCalculation.calculationDetails.length > 0 && (
                    <div style={{ marginTop: '0.25rem' }}>
                      <strong>Calculation:</strong>
                      {levelCalculation.calculationDetails.map((detail, idx) => (
                        <div key={idx} style={{ marginLeft: '1rem' }}>{detail}</div>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: '0.25rem' }}>
                    <strong>Sum:</strong> {levelCalculation.weightedSum} / <strong>N:</strong> {levelCalculation.N} = <strong>Mean:</strong> {levelCalculation.mean.toFixed(2)}
                  </div>
                  <div style={{ marginTop: '0.25rem', fontWeight: 'bold', color: '#1565c0' }}>
                    → Assigned Level: {levelCalculation.assignedLevel}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        
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
      <WordList showFilters={false} showDeleteButton={false} activeSourceId={activeSourceId} />
    </div>
  );
};

export default CreateDeck;
