import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizAPI, flashcardAPI } from '../services/api';
import { QUIZ_LEVELS, QUIZ_SKILLS, QUIZ_TASKS, formatLevel, formatSkill, formatTask } from '../constants/quizConstants';
import './CreateQuiz.css';

const CreateQuiz = () => {
  const navigate = useNavigate();
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [level, setLevel] = useState('');
  const [skill, setSkill] = useState('');
  const [task, setTask] = useState('');
  const [questions, setQuestions] = useState([]);
  const [creating, setCreating] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [generatingFromSource, setGeneratingFromSource] = useState(false);
  const [processingSummary, setProcessingSummary] = useState(null);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [webpageUrl, setWebpageUrl] = useState('');
  const [convertingWebpage, setConvertingWebpage] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [contentPreviewExpanded, setContentPreviewExpanded] = useState(false);
  const [currentProgressLog, setCurrentProgressLog] = useState('');
  const [progressLogOpacity, setProgressLogOpacity] = useState(0);
  const previousLogRef = useRef('');
  const initializedRef = useRef(false);
  const [studySheetData, setStudySheetData] = useState(null);
  const [parameterDetails, setParameterDetails] = useState(null);
  const [titleDetails, setTitleDetails] = useState(null);
  const [imageGenerationLogs, setImageGenerationLogs] = useState([]);
  const [originalFilePreview, setOriginalFilePreview] = useState('');
  const [originalFileTimestamp, setOriginalFileTimestamp] = useState(null);
  const [cleanedContentPreview, setCleanedContentPreview] = useState('');
  const [cleanedContentFullLength, setCleanedContentFullLength] = useState(0);
  const [cleanedContentTimestamp, setCleanedContentTimestamp] = useState(null);
  const [sourceSummary, setSourceSummary] = useState(null);

  const addDebugLog = (message, indent = false, reset = false) => {
    // Check if message already has a timestamp (from backend)
    const hasTimestamp = /^\[\d{1,2}:\d{2}:\d{2}(\s?[APap][Mm])?\]/.test(message) || /^\[\d{1,2}:\d{2}:\d{2}(:\d{2})?\]/.test(message);
    
    if (hasTimestamp) {
      // Message already has timestamp from backend, use it as-is
      setDebugLogs(prev => {
        const base = reset ? [] : prev;
        return [...base, message];
      });
    } else {
      // Add timestamp on frontend
      const timestamp = new Date().toLocaleTimeString('en-GB', { hour12: false });
      const prefix = indent ? `[${timestamp}]    ` : `[${timestamp}]`;
      setDebugLogs(prev => {
        const base = reset ? [] : prev;
        return [...base, `${prefix} ${message}`];
      });
    }
  };

  // Helper function to count words in text
  const countWords = (text) => {
    if (!text || typeof text !== 'string') return 0;
    // Split by whitespace and filter out empty strings
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const handleCleanSRT = (content) => {
    if (!content) return '';

    const lines = content.split('\n');
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
    return cleaned.trim();
  };

  const resetPreviewData = () => {
    setStudySheetData(null);
    setParameterDetails(null);
    setTitleDetails(null);
    setImageGenerationLogs([]);
    setContentPreviewExpanded(false);
  };
  const truncateText = (text, limit = 1000) => {
    if (!text || typeof text !== 'string') return '';
    return text.length > limit ? `${text.substring(0, limit)}...` : text;
  };

  const formatJsonString = (value) => {
    if (!value) return '';
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return value;
    }
  };

  const normalizeStudySheet = (payload) => {
    if (!payload) return null;
    if (typeof payload === 'string') {
      return { studySheet: payload };
    }
    return payload;
  };

  const buildParameterDetails = (payload, fallbackReasoning) => {
    if (payload) return payload;
    if (fallbackReasoning) {
      return {
        rawResponse: JSON.stringify({ reasoning: fallbackReasoning }, null, 2),
        reasoning: fallbackReasoning
      };
    }
    return null;
  };

  const normalizeQuestionDetails = (payload) => {
    if (!payload || Array.isArray(payload)) return null;
    return payload;
  };

  useEffect(() => {
    if (debugLogs.length === 0) {
      setCurrentProgressLog('');
      setProgressLogOpacity(0);
      previousLogRef.current = '';
      initializedRef.current = false;
      return;
    }

    const lastLog = debugLogs[debugLogs.length - 1];

    if (lastLog !== previousLogRef.current) {
      if (!initializedRef.current || previousLogRef.current === '') {
        setCurrentProgressLog(lastLog);
        previousLogRef.current = lastLog;
        initializedRef.current = true;
        const fadeInTimeout = setTimeout(() => {
          setProgressLogOpacity(1);
        }, 50);
        return () => clearTimeout(fadeInTimeout);
      } else {
        setProgressLogOpacity(0);
        const fadeTimeout = setTimeout(() => {
          setCurrentProgressLog(lastLog);
          previousLogRef.current = lastLog;
          const fadeInTimeout = setTimeout(() => {
            setProgressLogOpacity(1);
          }, 50);
          return () => clearTimeout(fadeInTimeout);
        }, 300);
        return () => clearTimeout(fadeTimeout);
      }
    }
  }, [debugLogs]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
        setUploadedFile(file);
      setWebpageUrl('');
      setProcessingSummary(null);
      setDetailsExpanded(false);
      setSourceSummary({
        type: 'file',
        name: file.name,
        size: file.size
      });
      
      // Reset and start logging Step 1 immediately
      const logs = [];
      const timestamp = new Date().toLocaleTimeString('en-GB', { hour12: false });
      logs.push(`[${timestamp}] 📁 Step 1: File taken | ${file.name.split('.').pop()}`);
      logs.push(`[${timestamp}]     ✅ Step 1 Completed! File taken: ${file.name} | ${(file.size / 1024).toFixed(2)} KB`);
      
      setDebugLogs(logs);
      setLogsExpanded(true);
      
      resetPreviewData();
      const ext = file.name.toLowerCase().split('.').pop();
      if (ext === 'srt' || ext === 'txt') {
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target.result || '';
          setOriginalFilePreview(text.substring(0, 500));
          setOriginalFileTimestamp(new Date());
        };
        reader.readAsText(file);
      } else {
        setOriginalFilePreview('Preview will be available after AI finishes processing this file.');
        setOriginalFileTimestamp(new Date());
      }
    }
  };

  const handleGenerateFromFile = async () => {
    if (!uploadedFile) {
      alert('Please select a file first');
      return;
    }

    setSourceSummary({
      type: 'file',
      name: uploadedFile.name,
      size: uploadedFile.size
    });
    setGeneratingFromSource(true);
    setProcessingSummary(null);
    resetPreviewData();
    setLogsExpanded(true);
    setContentPreviewExpanded(true);
    // Don't clear logs here, preserving Step 1 logs
    
    // Step 1 logs are already handled in handleFileUpload
    
    const startTime = Date.now();

    try {
      // Step 2: Extract content
      addDebugLog(`🔄 Step 2: Extracting content`);
      let extractedContent = '';
      let sourceType = 'text';
      const ext = uploadedFile.name.toLowerCase().split('.').pop();

      if (ext === 'pdf') {
        addDebugLog(`⏳ Converting PDF to Markdown...`, true);
        const response = await flashcardAPI.convertPDFToMD(uploadedFile);
        extractedContent = response.data.markdownContent;
        sourceType = 'pdf';
      } else {
         // Read file content
         extractedContent = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(uploadedFile);
         });
         sourceType = ext === 'srt' ? 'srt' : 'txt';
      }
      
      const wordCount = countWords(extractedContent);
      addDebugLog(`✅ Step 2 Completed! Extracted content: ${extractedContent.length} characters = ${wordCount} words`, true);
      setOriginalFilePreview(extractedContent.substring(0, 500));
      setOriginalFileTimestamp(new Date());

      // Step 3: Clean Content (if SRT/TXT)
      addDebugLog(`🔄 Step 3: Converting to md/cleaning`);
      let cleanedContent = extractedContent;
      if (ext === 'srt' || ext === 'txt') {
         addDebugLog(`🧹 Cleaning ${ext.toUpperCase()} content...`, true);
         cleanedContent = handleCleanSRT(extractedContent);
      } else {
         addDebugLog(`Content is ${ext.toUpperCase()}, skipping local cleaning`, true);
      }
      
      const cleanedWordCount = countWords(cleanedContent);
      addDebugLog(`✅ Step 3 Completed! ${cleanedContent.length} characters = ${cleanedWordCount} words`, true);
      setCleanedContentPreview(cleanedContent.substring(0, 500));
      setCleanedContentTimestamp(new Date());

      // Step 4: Send to AI
      addDebugLog(`🤖 Step 4: Sending to AI...`);
      
      const quizResponse = await quizAPI.generateQuizFromContent(cleanedContent, sourceType);
      const result = quizResponse.data;
      
      // Add logs from backend (content analysis, etc.)
      if (result.logs && Array.isArray(result.logs)) {
        result.logs.forEach(log => addDebugLog(log));
      }

      // Update UI with quiz data
      if (result.title) setQuizTitle(result.title);
      if (result.description) setQuizDescription(result.description);
      if (result.level) setLevel(result.level);
      if (result.skill) setSkill(result.skill);
      if (result.task) setTask(result.task);
      
      // Set questions initially without images
      const initialQuestions = result.questions || [];
      setQuestions(initialQuestions);
      
      if (result.prompt) {
         setParameterDetails({
            prompt: result.prompt,
            rawResponse: result.rawResponse,
            reasoning: result.reasoning
         });
      }

      addDebugLog(`✅ Step 4 Completed! Total: ${initialQuestions.length} questions added`, true);

      // Step 5: Generate Images
      addDebugLog(`💾 Step 5: Generating images for ${initialQuestions.length} questions`);
      const imageLogs = [];
      const questionsWithImages = [...initialQuestions];
      
      for (let i = 0; i < questionsWithImages.length; i++) {
         const q = questionsWithImages[i];
         addDebugLog(`Generating image for question ${i + 1}/${questionsWithImages.length}...`, true);
         
         try {
            const imgRes = await quizAPI.generateQuestionImage(q.questionText, q.options);
            questionsWithImages[i].imageUrl = imgRes.data.imageUrl;
            imageLogs.push(`✓ Generated image for question ${i + 1}`);
         } catch (err) {
            console.warn('Error generating image:', err);
            imageLogs.push(`⚠ Failed to generate image for question ${i + 1}`);
         }
         // Update questions state incrementally
         setQuestions([...questionsWithImages]);
         // Small delay to avoid rate limits
         await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setImageGenerationLogs(imageLogs);
      addDebugLog(`✅ Step 5 Completed! Images generated`, true);

      // Step 6: Complete
      const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
      setProcessingSummary({
        sourceName: uploadedFile.name,
        totalQuestions: questionsWithImages.length,
        detectedLevel: result.level,
        processingTime
      });
      
      setUploadedFile(null);
      addDebugLog(`✅ All Steps Completed! | Time: ${processingTime}s`);

    } catch (error) {
      console.error('Error generating quiz from file:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to process file';
      addDebugLog(`✗ Error: ${errorMessage}`);
      alert('Error: ' + errorMessage);
    } finally {
      setGeneratingFromSource(false);
    }
  };

  const handleGenerateFromWebpage = async () => {
    if (!webpageUrl.trim()) {
      alert('Please enter a webpage URL');
      return;
    }

    try {
      new URL(webpageUrl.trim());
    } catch (e) {
      alert('Please enter a valid URL (e.g., https://example.com)');
      return;
    }

    setGeneratingFromSource(true);
    setProcessingSummary(null);
    resetPreviewData();
    setLogsExpanded(true);
    setContentPreviewExpanded(true);
    setDetailsExpanded(false);
    setConvertingWebpage(true);
    setDebugLogs([]);

    const startTime = Date.now();
    
    try {
       // Step 1: URL taken
       addDebugLog(`📁 Step 1: URL taken | webpage`);
       addDebugLog(`✅ Step 1 Completed! URL taken: ${webpageUrl}`, true);
       
       setSourceSummary({
        type: 'url',
        url: webpageUrl.trim()
       });

       // Step 2: Convert webpage to Markdown
       addDebugLog(`🔄 Step 2: Extracting content`);
       addDebugLog(`⏳ Calling Firecrawl API to scrape webpage...`, true);
       
       const response = await flashcardAPI.convertWebpageToMD(webpageUrl.trim());
       const extractedContent = response.data.markdownContent;
       const pageTitle = response.data.pageTitle || '';
       
       const wordCount = countWords(extractedContent);
       addDebugLog(`✅ Step 2 Completed! Extracted webpage content: ${extractedContent.length} characters = ${wordCount} words`, true);
       
       setOriginalFilePreview(extractedContent.substring(0, 500));
       setOriginalFileTimestamp(new Date());
       
       // Step 3: Convert to MD (already MD, just clean/prep)
       addDebugLog(`🔄 Step 3: Converting to md`);
       addDebugLog(`✅ Step 3 Completed! ${extractedContent.length} characters = ${wordCount} words`, true);
       
       setCleanedContentPreview(extractedContent.substring(0, 500));
       setCleanedContentTimestamp(new Date());

       // Step 4: Send to AI
       addDebugLog(`🤖 Step 4: Sending to AI...`);
       addDebugLog(`Webpage detected - AI is cleaning and preparing questions.`, true);
       
       // Clean content via AI (optional, but good for webpages)
       // For now, send directly to generateQuizFromContent which expects text
       // Ideally we should clean it first, but generateQuizFromContent handles some of that
       
       const quizResponse = await quizAPI.generateQuizFromContent(extractedContent, 'webpage');
       const result = quizResponse.data;
       
       // Add logs from backend
       if (result.logs && Array.isArray(result.logs)) {
         result.logs.forEach(log => addDebugLog(log));
       }
       
       // Update UI
       if (result.title) setQuizTitle(result.title);
       if (result.description) setQuizDescription(result.description);
       if (result.level) setLevel(result.level);
       if (result.skill) setSkill(result.skill);
       if (result.task) setTask(result.task);
       
       const initialQuestions = result.questions || [];
       setQuestions(initialQuestions);
       
       if (result.prompt) {
          setParameterDetails({
             prompt: result.prompt,
             rawResponse: result.rawResponse,
             reasoning: result.reasoning
          });
       }
       
       addDebugLog(`✅ Step 4 Completed! Total: ${initialQuestions.length} questions added`, true);
       
       // Step 5: Generate Images
       addDebugLog(`💾 Step 5: Generating images for ${initialQuestions.length} questions`);
       const imageLogs = [];
       const questionsWithImages = [...initialQuestions];
       
       for (let i = 0; i < questionsWithImages.length; i++) {
          const q = questionsWithImages[i];
          addDebugLog(`Generating image for question ${i + 1}/${questionsWithImages.length}...`, true);
          
          try {
             const imgRes = await quizAPI.generateQuestionImage(q.questionText, q.options);
             questionsWithImages[i].imageUrl = imgRes.data.imageUrl;
             imageLogs.push(`✓ Generated image for question ${i + 1}`);
          } catch (err) {
             console.warn('Error generating image:', err);
             imageLogs.push(`⚠ Failed to generate image for question ${i + 1}`);
          }
          setQuestions([...questionsWithImages]);
          await new Promise(resolve => setTimeout(resolve, 500));
       }
       
       setImageGenerationLogs(imageLogs);
       addDebugLog(`✅ Step 5 Completed! Images generated`, true);
       
       // Step 6: Complete
       const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
       setProcessingSummary({
         sourceName: webpageUrl,
         totalQuestions: questionsWithImages.length,
         detectedLevel: result.level,
         processingTime
       });
       
       addDebugLog(`✅ All Steps Completed! | Time: ${processingTime}s`);

    } catch (error) {
      console.error('Error generating quiz from webpage:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to process webpage';
      addDebugLog(`✗ Error: ${errorMessage}`);
      alert('Error: ' + errorMessage);
    } finally {
      setGeneratingFromSource(false);
      setConvertingWebpage(false);
    }
  };

  const handleCreateQuiz = async () => {
    if (!quizTitle.trim()) {
      alert('Please enter a quiz title');
      return;
    }

    if (questions.length === 0) {
      alert('Please generate questions from a source first');
      return;
    }

    try {
      setCreating(true);
      await quizAPI.createQuiz({
        title: quizTitle.trim(),
        description: quizDescription.trim(),
        level: level || null,
        skill: skill || null,
        task: task || null,
        questions
      });
      alert('Quiz created successfully!');
      navigate('/quizzes');
    } catch (error) {
      console.error('Error creating quiz:', error);
      alert('Failed to create quiz: ' + (error.response?.data?.message || error.message));
    } finally {
      setCreating(false);
    }
  };

  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = [...questions];
    if (field === 'questionText') {
      updatedQuestions[index].questionText = value;
    } else if (field === 'options') {
      updatedQuestions[index].options = value;
    } else if (field === 'correctAnswer') {
      updatedQuestions[index].correctAnswer = parseInt(value);
    } else if (field === 'points') {
      updatedQuestions[index].points = parseInt(value) || 100;
    } else if (field === 'timeLimit') {
      updatedQuestions[index].timeLimit = parseInt(value) || 20;
    }
    setQuestions(updatedQuestions);
  };

  const handleDeleteQuestion = (index) => {
    const updatedQuestions = questions.filter((_, i) => i !== index);
    setQuestions(updatedQuestions);
  };

  const latestLog = debugLogs.length > 0 ? debugLogs[debugLogs.length - 1] : '';
  const displayedLog = currentProgressLog || latestLog;
  const trimmedLog = displayedLog.replace(/^\[.*?\]\s*/, '');

  return (
    <div className="create-quiz-container">
      <div className="create-quiz-header">
        <h1>Create Quiz</h1>
          </div>
          
      {/* Import from Source Section */}
      <div className="import-source-section">
        <h2>Import from Source</h2>
        
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
            <div className="file-upload-group" style={{ width: '100%' }}>
              <label className="file-upload-label" style={{ width: '100%' }}>
                  <input
                    type="file"
                  accept=".pdf,.srt,.txt"
                    onChange={handleFileUpload}
                    disabled={generatingFromSource}
                  style={{ display: 'none' }}
                />
                <span className="file-upload-button">
                  {uploadedFile ? `📄 ${uploadedFile.name}` : '📁 Choose File (PDF, SRT, TXT)'}
                </span>
              </label>
                    </div>
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
                onChange={(e) => {
                  const value = e.target.value;
                  setWebpageUrl(value);
                  if (value) {
                    setUploadedFile(null);
                    setProcessingSummary(null);
                    setDebugLogs([]);
                    resetPreviewData();
                  }
                }}
                placeholder="https://example.com/article or https://youtube.com/watch?v=..."
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                borderRadius: '8px', 
                border: '2px solid #e2e8f0',
                fontSize: '0.9rem',
                transition: 'border-color 0.2s, box-shadow 0.2s'
              }}
                    disabled={generatingFromSource}
              onFocus={(e) => e.target.style.borderColor = '#667eea' && (e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)')}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0' && (e.target.style.boxShadow = 'none')}
            />
            </div>
        </div>

        {/* Progress Label and Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {(displayedLog || processingSummary) && (
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
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {generatingFromSource ? (
                  <span style={{ opacity: progressLogOpacity, transition: 'opacity 0.6s ease-in-out' }}>
                    {trimmedLog || 'Processing...'}
                  </span>
                ) : processingSummary ? (
                  <span>
                    ✅ All Steps Completed! | {processingSummary.totalQuestions} Question | 
                    {processingSummary.detectedLevel && ` Level: ${processingSummary.detectedLevel} |`}
                    Time: {processingSummary.processingTime}s
                  </span>
                ) : trimmedLog ? (
                  <span style={{ opacity: progressLogOpacity, transition: 'opacity 0.6s ease-in-out' }}>
                    {trimmedLog}
                  </span>
                ) : (
                  <span>Ready to process a source</span>
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
            onClick={() => {
              if (uploadedFile) handleGenerateFromFile();
              else if (webpageUrl.trim()) handleGenerateFromWebpage();
            }}
            disabled={generatingFromSource || (!uploadedFile && !webpageUrl.trim())}
            style={{ 
              background: generatingFromSource || (!uploadedFile && !webpageUrl.trim()) 
                ? 'linear-gradient(135deg, #a0aec0 0%, #718096 100%)'
                : 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
              border: 'none',
              color: 'white',
              padding: '0.75rem 1.5rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              borderRadius: '8px',
              cursor: generatingFromSource || (!uploadedFile && !webpageUrl.trim()) ? 'not-allowed' : 'pointer',
              boxShadow: generatingFromSource || (!uploadedFile && !webpageUrl.trim()) 
                ? 'none' 
                : '0 4px 6px rgba(72, 187, 120, 0.3)',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
              minWidth: '90px'
            }}
            onMouseEnter={(e) => {
              if (!generatingFromSource && (uploadedFile || webpageUrl.trim())) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 12px rgba(72, 187, 120, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!generatingFromSource && (uploadedFile || webpageUrl.trim())) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 6px rgba(72, 187, 120, 0.3)';
              }
            }}
          >
            {generatingFromSource ? 'Processing...' : 'Run'}
                  </button>
                </div>

        {/* Details Pane */}
        {detailsExpanded && (debugLogs.length > 0 || studySheetData || parameterDetails || titleDetails || imageGenerationLogs.length > 0 || processingSummary || originalFilePreview) && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            backgroundColor: '#fff', 
            borderRadius: '8px', 
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
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
                      <div style={{ color: '#666', fontStyle: 'italic' }}>No logs yet.</div>
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
              
            {(originalFilePreview || studySheetData || parameterDetails || titleDetails || imageGenerationLogs.length > 0 || processingSummary || sourceSummary) && (
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
                    {sourceSummary && (
                      <div style={{ marginBottom: '1rem' }}>
                        <strong style={{ fontSize: '0.85rem', color: '#666' }}>Step 1: Source Summary</strong>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          padding: '0.75rem', 
                          backgroundColor: '#f0f9ff', 
                          borderRadius: '4px', 
                          border: '1px solid #0ea5e9',
                          marginTop: '0.35rem'
                        }}>
                          {sourceSummary.type === 'file' ? (
                            <>
                              <div><strong>File:</strong> {sourceSummary.name}</div>
                              {sourceSummary.size && (
                                <div><strong>Size:</strong> {(sourceSummary.size / 1024).toFixed(2)} KB</div>
                              )}
                            </>
                          ) : (
                            <>
                              <div><strong>URL:</strong> {sourceSummary.url}</div>
                              {sourceSummary.videoTitle && (
                                <div><strong>Video Title:</strong> {sourceSummary.videoTitle}</div>
                              )}
                              {sourceSummary.pageTitle && (
                                <div><strong>Page Title:</strong> {sourceSummary.pageTitle}</div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {originalFilePreview && (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <strong style={{ fontSize: '0.85rem', color: '#666' }}>Step 2: Original File (first 500 chars)</strong>
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
                          maxHeight: '150px',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          border: '1px solid #0ea5e9',
                          marginTop: '0.25rem'
                        }}>
                          {originalFilePreview}
                        </pre>
                      </div>
                    )}

                    {cleanedContentPreview && (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <strong style={{ fontSize: '0.85rem', color: '#666' }}>Step 3: MD File (first 500 chars)</strong>
                          {cleanedContentTimestamp && (
                            <span style={{ fontSize: '0.7rem', color: '#888' }}>
                              {cleanedContentTimestamp.toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                        <pre style={{ 
                          fontSize: '0.7rem', 
                          padding: '0.5rem', 
                          backgroundColor: '#f0f9ff', 
                          borderRadius: '4px', 
                          overflow: 'auto', 
                          maxHeight: '150px',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          border: '1px solid #0ea5e9',
                          marginTop: '0.25rem'
                        }}>
                          {cleanedContentPreview}
                        </pre>
                      </div>
                    )}

                    {parameterDetails && (
                      <>
                        {parameterDetails.prompt && (
                          <div style={{ marginBottom: '1rem' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#666' }}>Step 4.1: AI Prompt</strong>
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
                              {truncateText(parameterDetails.prompt, 1500)}
                            </pre>
                          </div>
                        )}
                        {parameterDetails.rawResponse && (
                          <div style={{ marginBottom: '1rem' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#666' }}>Step 4.2: AI Response</strong>
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
                              {formatJsonString(parameterDetails.rawResponse)}
                            </pre>
                            {parameterDetails.reasoning && (
                              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#2f855a' }}>
                                <strong>Reasoning:</strong> {parameterDetails.reasoning}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}

                    {imageGenerationLogs.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <strong style={{ fontSize: '0.85rem', color: '#666' }}>Step 5: Image Generation</strong>
                        <div style={{ 
                          fontSize: '0.7rem', 
                          padding: '0.5rem', 
                          backgroundColor: '#f0f9ff', 
                          borderRadius: '4px', 
                          border: '1px solid #0ea5e9',
                          marginTop: '0.25rem'
                        }}>
                          {imageGenerationLogs.map((log, idx) => (
                            <div key={idx} style={{ marginBottom: '0.25rem' }}>
                              {log}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {processingSummary && (
                      <div style={{ marginBottom: '1rem' }}>
                        <strong style={{ fontSize: '0.85rem', color: '#666' }}>Step 6: Completed</strong>
                        <div style={{ 
                          fontSize: '0.7rem', 
                          padding: '0.5rem', 
                          backgroundColor: '#f0f9ff', 
                          borderRadius: '4px', 
                          border: '1px solid #0ea5e9',
                          marginTop: '0.25rem'
                        }}>
                          <div><strong>Total Questions:</strong> {processingSummary.totalQuestions}</div>
                          {processingSummary.detectedLevel && (
                            <div><strong>Detected Level:</strong> {processingSummary.detectedLevel}</div>
                          )}
                          <div><strong>Processing Time:</strong> {processingSummary.processingTime}s</div>
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

      {/* Quiz Information Section */}
      <div className="quiz-info-section">
        <h2>Quiz Information</h2>
        
          <div className="form-group">
          <label className="form-label">Title *</label>
              <input
                type="text"
                className="form-input"
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)}
            placeholder="Enter quiz title..."
                required
              />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
              <textarea
                className="form-input"
                rows="3"
            value={quizDescription}
            onChange={(e) => setQuizDescription(e.target.value)}
            placeholder="Enter quiz description..."
          />
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
              {QUIZ_LEVELS.map(lvl => (
                <option key={lvl} value={lvl}>{formatLevel(lvl)}</option>
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
              {QUIZ_SKILLS.map(skl => (
                <option key={skl} value={skl}>{formatSkill(skl)}</option>
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
              {QUIZ_TASKS.map(tsk => (
                <option key={tsk} value={tsk}>{formatTask(tsk)}</option>
                ))}
              </select>
            </div>
          </div>

        <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <button
            onClick={handleCreateQuiz}
            disabled={creating || !quizTitle.trim() || questions.length === 0 || !level || !skill || !task}
              className="btn btn-primary btn-large"
            style={{ width: '100%' }}
          >
            {creating ? 'Creating...' : `Create Quiz (${questions.length} questions)`}
            </button>
              </div>
          </div>

      {/* Questions Section */}
      {questions.length > 0 && (
          <div className="questions-section">
          <h2>Questions ({questions.length})</h2>
          <div className="questions-grid">
            {questions.map((question, index) => (
              <div key={index} className="question-card">
                <div className="question-card-header">
                  <h3>Question {index + 1}</h3>
                  <button
                    onClick={() => handleDeleteQuestion(index)}
                    className="btn btn-danger btn-sm"
                  >
                    Delete
                  </button>
                </div>

                <div className="question-card-body">
                <div className="form-group">
                  <label className="form-label">Question Text *</label>
                  <textarea
                    className="form-input"
                    rows="2"
                      value={question.questionText || ''}
                      onChange={(e) => handleQuestionChange(index, 'questionText', e.target.value)}
                      placeholder="Enter question..."
                  />
                </div>

                <div className="form-group">
                    <label className="form-label">Options (one per line) *</label>
                    <textarea
                      className="form-input"
                      rows="4"
                      value={question.options?.join('\n') || ''}
                      onChange={(e) => {
                        const options = e.target.value.split('\n').filter(opt => opt.trim());
                        handleQuestionChange(index, 'options', options);
                      }}
                      placeholder="Option 1&#10;Option 2&#10;Option 3&#10;Option 4"
                    />
                </div>

                  <div className="form-row">
                <div className="form-group">
                      <label className="form-label">Correct Answer (0-{question.options?.length - 1 || 3}) *</label>
                      <input
                        type="number"
                        className="form-input"
                        min="0"
                        max={question.options?.length - 1 || 3}
                        value={question.correctAnswer !== undefined ? question.correctAnswer : 0}
                        onChange={(e) => handleQuestionChange(index, 'correctAnswer', e.target.value)}
                      />
                </div>

                  <div className="form-group">
                    <label className="form-label">Points</label>
                    <input
                      type="number"
                      className="form-input"
                      min="1"
                        value={question.points || 100}
                        onChange={(e) => handleQuestionChange(index, 'points', e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Time Limit (seconds)</label>
                    <input
                      type="number"
                      className="form-input"
                        min="1"
                        value={question.timeLimit || 20}
                        onChange={(e) => handleQuestionChange(index, 'timeLimit', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </div>
      )}
    </div>
  );
};

export default CreateQuiz;

