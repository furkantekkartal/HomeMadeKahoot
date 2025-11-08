import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizAPI } from '../services/api';
import { QUIZ_CATEGORIES, QUIZ_DIFFICULTIES, formatCategory, formatDifficulty } from '../constants/quizConstants';
import jsPDF from 'jspdf';
import './QuizForm.css';

const CreateQuiz = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'vocabulary',
    difficulty: 'beginner',
    questions: []
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingImages, setGeneratingImages] = useState({});
  // Store image history for each question: { questionIndex: { history: [], currentIndex: -1 } }
  const [imageHistory, setImageHistory] = useState({});
  const [questionCount, setQuestionCount] = useState(5);
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [enhancedAIMode, setEnhancedAIMode] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [generatingFromSource, setGeneratingFromSource] = useState(false);
  const [studySheet, setStudySheet] = useState(null);

  // Calculate default points based on category and difficulty
  const calculateDefaultPoints = (category, difficulty) => {
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
    return (categoryCoefficients[category] || 1) * (difficultyCoefficients[difficulty] || 1);
  };

  // Calculate default time limit based on difficulty
  const calculateDefaultTimeLimit = (difficulty) => {
    const timeLimits = {
      beginner: 20,
      intermediate: 40,
      advanced: 60
    };
    return timeLimits[difficulty] || 20;
  };

  const addQuestion = () => {
    const defaultPoints = calculateDefaultPoints(formData.category, formData.difficulty);
    const defaultTimeLimit = calculateDefaultTimeLimit(formData.difficulty);

    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        {
          questionText: '',
          options: ['', '', '', ''],
          correctAnswer: 0,
          points: defaultPoints,
          timeLimit: defaultTimeLimit,
          imageUrl: null
        }
      ]
    });
    
    // Initialize image history for new question
    setImageHistory({
      ...imageHistory,
      [formData.questions.length]: { history: [], currentIndex: -1 }
    });
  };

  const updateQuestion = (index, field, value) => {
    const questions = [...formData.questions];
    questions[index] = { ...questions[index], [field]: value };
    setFormData({ ...formData, questions });
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    const questions = [...formData.questions];
    questions[questionIndex].options[optionIndex] = value;
    setFormData({ ...formData, questions });
  };

  const removeQuestion = (index) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((_, i) => i !== index)
    });
  };

  const generateImage = async (questionIndex) => {
    const question = formData.questions[questionIndex];
    
    if (!question.questionText.trim()) {
      setError('Please enter question text before generating an image');
      return;
    }

    setGeneratingImages({ ...generatingImages, [questionIndex]: true });
    setError('');

    try {
      const response = await quizAPI.generateQuestionImage(
        question.questionText,
        question.options
      );
      const newImageUrl = response.data.imageUrl;
      
      // Get current history for this question
      const currentHistory = imageHistory[questionIndex] || { history: [], currentIndex: -1 };
      const newHistory = [...currentHistory.history, newImageUrl];
      const newCurrentIndex = newHistory.length - 1; // Point to the new image
      
      // Update image history
      setImageHistory({
        ...imageHistory,
        [questionIndex]: { history: newHistory, currentIndex: newCurrentIndex }
      });
      
      // Update question with the new image
      const questions = [...formData.questions];
      questions[questionIndex] = { ...questions[questionIndex], imageUrl: newImageUrl };
      setFormData({ ...formData, questions });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate image');
    } finally {
      setGeneratingImages({ ...generatingImages, [questionIndex]: false });
    }
  };

  const navigateImage = (questionIndex, direction) => {
    const currentHistory = imageHistory[questionIndex];
    if (!currentHistory || currentHistory.history.length === 0) return;
    
    const { history, currentIndex } = currentHistory;
    let newIndex = currentIndex;
    
    if (direction === 'prev' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'next' && currentIndex < history.length - 1) {
      newIndex = currentIndex + 1;
    } else {
      return; // Can't navigate further
    }
    
    const newImageUrl = history[newIndex];
    
    // Update image history
    setImageHistory({
      ...imageHistory,
      [questionIndex]: { history, currentIndex: newIndex }
    });
    
    // Update question with the navigated image
    const questions = [...formData.questions];
    questions[questionIndex] = { ...questions[questionIndex], imageUrl: newImageUrl };
    setFormData({ ...formData, questions });
  };

  const removeImage = (questionIndex) => {
    const questions = [...formData.questions];
    questions[questionIndex] = { ...questions[questionIndex], imageUrl: null };
    setFormData({ ...formData, questions });
    
    // Clear image history for this question
    setImageHistory({
      ...imageHistory,
      [questionIndex]: { history: [], currentIndex: -1 }
    });
  };

  const generateTitle = async () => {
    if (!formData.category || !formData.difficulty) {
      setError('Please select category and difficulty first');
      return;
    }

    setGeneratingTitle(true);
    setError('');

    try {
      const response = await quizAPI.generateQuizTitle(formData.category, formData.difficulty);
      setFormData({ ...formData, title: response.data.title });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate title');
    } finally {
      setGeneratingTitle(false);
    }
  };

  const generateDescription = async () => {
    if (!formData.title.trim()) {
      setError('Please enter or generate a title first');
      return;
    }

    if (!formData.category || !formData.difficulty) {
      setError('Please select category and difficulty first');
      return;
    }

    setGeneratingDescription(true);
    setError('');

    try {
      const response = await quizAPI.generateQuizDescription(
        formData.title,
        formData.category,
        formData.difficulty
      );
      setFormData({ ...formData, description: response.data.description });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate description');
    } finally {
      setGeneratingDescription(false);
    }
  };

  const generateQuestionsByAI = async () => {
    console.log('Generate by AI button clicked');
    console.log('Form data:', { title: formData.title, category: formData.category, difficulty: formData.difficulty, questionCount });
    
    if (!formData.title.trim()) {
      setError('Please enter or generate a title first');
      return;
    }

    if (!formData.category || !formData.difficulty) {
      setError('Please select category and difficulty first');
      return;
    }

    if (!questionCount || questionCount < 1 || questionCount > 50) {
      setError('Please enter a valid question count (1-50)');
      return;
    }

    setGeneratingQuestions(true);
    setError('');

    try {
      console.log('Calling generateQuizQuestions API...');
      const response = await quizAPI.generateQuizQuestions(
        formData.title,
        formData.description || '',
        formData.category,
        formData.difficulty,
        questionCount
      );
      
      console.log('Questions generated, response:', response.data);
      let generatedQuestions = response.data.questions;
      
      if (!generatedQuestions || generatedQuestions.length === 0) {
        throw new Error('No questions were generated');
      }
      
      // Generate images for all questions automatically
      console.log(`Generating images for ${generatedQuestions.length} questions...`);
      for (let i = 0; i < generatedQuestions.length; i++) {
        try {
          // Add small delay between image generations
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          const question = generatedQuestions[i];
          console.log(`Generating image for question ${i + 1}: ${question.questionText.substring(0, 50)}...`);
          const imageResponse = await quizAPI.generateQuestionImage(
            question.questionText,
            question.options
          );
          generatedQuestions[i].imageUrl = imageResponse.data.imageUrl;
          console.log(`✓ Generated image for question ${i + 1}/${generatedQuestions.length}`);
        } catch (imageError) {
          console.warn(`⚠ Failed to generate image for question ${i + 1}:`, imageError);
          // Continue with other questions even if one image fails
          generatedQuestions[i].imageUrl = null;
        }
      }
      
      // Initialize image history for all new questions
      const newImageHistory = {};
      generatedQuestions.forEach((_, index) => {
        newImageHistory[index] = { 
          history: generatedQuestions[index].imageUrl ? [generatedQuestions[index].imageUrl] : [],
          currentIndex: generatedQuestions[index].imageUrl ? 0 : -1
        };
      });
      
      setImageHistory(newImageHistory);
      setFormData({ ...formData, questions: generatedQuestions });
      console.log('✓ All questions and images generated successfully');
    } catch (err) {
      console.error('Error generating questions:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to generate questions';
      setError(errorMessage);
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const ext = file.name.toLowerCase().split('.').pop();
      const allowedTypes = ['pdf', 'srt', 'mp4', 'mov', 'webm', 'avi'];
      if (allowedTypes.includes(ext)) {
        setUploadedFile(file);
        setError('');
      } else {
        setError('Please upload a PDF, SRT, or video file (MP4, MOV, WEBM, AVI)');
        setUploadedFile(null);
      }
    }
  };

  const generateFromFile = async () => {
    if (!uploadedFile) {
      setError('Please select a file first');
      return;
    }

    setGeneratingFromSource(true);
    setError('');

    try {
      const response = await quizAPI.generateQuizFromFile(uploadedFile);
      const result = response.data;
      
      // Initialize image history for all questions
      const newImageHistory = {};
      result.questions.forEach((_, index) => {
        newImageHistory[index] = { history: [], currentIndex: -1 };
      });
      
      setImageHistory(newImageHistory);
      setFormData({
        title: result.title,
        description: result.description,
        category: result.category,
        difficulty: result.difficulty,
        questions: result.questions
      });
      setQuestionCount(result.questions.length);
      setStudySheet(result.studySheet || null);
      setEnhancedAIMode(false);
      setUploadedFile(null);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to generate quiz from file';
      if (errorMessage.includes('Rate limit') || errorMessage.includes('429') || errorMessage.includes('Resource exhausted')) {
        setError('API rate limit reached. Please wait a few minutes and try again. The system will automatically retry, but you may need to wait if the limit is exceeded.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setGeneratingFromSource(false);
    }
  };

  const generateFromYouTube = async () => {
    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    setGeneratingFromSource(true);
    setError('');

    try {
      const response = await quizAPI.generateQuizFromYouTube(youtubeUrl);
      const result = response.data;
      
      // Initialize image history for all questions
      const newImageHistory = {};
      result.questions.forEach((_, index) => {
        newImageHistory[index] = { history: [], currentIndex: -1 };
      });
      
      setImageHistory(newImageHistory);
      setFormData({
        title: result.title,
        description: result.description,
        category: result.category,
        difficulty: result.difficulty,
        questions: result.questions
      });
      setQuestionCount(result.questions.length);
      setStudySheet(result.studySheet || null);
      setEnhancedAIMode(false);
      setYoutubeUrl('');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to generate quiz from YouTube video';
      if (errorMessage.includes('Rate limit') || errorMessage.includes('429') || errorMessage.includes('Resource exhausted')) {
        setError('API rate limit reached. Please wait a few minutes and try again. The system will automatically retry, but you may need to wait if the limit is exceeded.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setGeneratingFromSource(false);
    }
  };

  const downloadStudySheetPDF = () => {
    if (!studySheet) {
      setError('No study sheet available to download');
      return;
    }

    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;
      let yPosition = margin;

      // Title
      pdf.setFontSize(18);
      pdf.setFont(undefined, 'bold');
      const title = formData.title || 'Study Sheet';
      pdf.text(title, margin, yPosition);
      yPosition += 10;

      // Add a line
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;

      // Helper function to parse markdown and apply formatting
      const parseMarkdownText = (text) => {
        if (!text) return '';
        
        let cleanText = text;
        
        // Step 1: Handle ***bold italic*** (3 asterisks) - must be done first
        cleanText = cleanText.replace(/\*\*\*([^*]+)\*\*\*/g, '$1');
        
        // Step 2: Handle **bold** (2 asterisks) - must be done before single asterisk
        cleanText = cleanText.replace(/\*\*([^*]+)\*\*/g, '$1');
        
        // Step 3: Handle *italic* (single asterisk)
        // Match *text* pattern where text is non-empty and doesn't contain asterisks
        // This regex matches: * followed by one or more non-asterisk chars, followed by *
        cleanText = cleanText.replace(/\*([^*]+)\*/g, '$1');
        
        // Step 4: Clean up any remaining formatting artifacts
        // Remove standalone asterisks that are clearly markdown formatting
        // But be careful not to remove asterisks that are part of content
        
        return cleanText.trim();
      };

      // Helper function to render text with markdown formatting
      const renderFormattedText = (text, x, y, maxWidth, pdf) => {
        // Check for bold text **text**
        const boldRegex = /\*\*([^*]+)\*\*/g;
        const parts = [];
        let lastIndex = 0;
        let match;
        
        while ((match = boldRegex.exec(text)) !== null) {
          // Add text before bold
          if (match.index > lastIndex) {
            parts.push({
              text: text.substring(lastIndex, match.index),
              bold: false
            });
          }
          // Add bold text
          parts.push({
            text: match[1],
            bold: true
          });
          lastIndex = match.index + match[0].length;
        }
        
        // Add remaining text
        if (lastIndex < text.length) {
          parts.push({
            text: text.substring(lastIndex),
            bold: false
          });
        }
        
        // If no bold found, just return the cleaned text
        if (parts.length === 0) {
          return { text: parseMarkdownText(text), bold: false };
        }
        
        return parts;
      };

      // Convert markdown to plain text with formatting
      const lines = studySheet.split('\n');
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'normal');

      let i = 0;
      while (i < lines.length) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        // Check if we need a new page
        if (yPosition > pageHeight - margin - 30) {
          pdf.addPage();
          yPosition = margin;
        }

        if (!trimmedLine) {
          yPosition += 5; // Empty line
          i++;
          continue;
        }

        // Handle markdown tables
        if (trimmedLine.includes('|')) {
          // Check if it's a separator row (like |---|---|)
          const isSeparator = trimmedLine.match(/^[\s|:-]+$/);
          
          if (!isSeparator) {
            // This is a table row
            const tableRows = [];
            
            // Collect all table rows (including current one)
            let j = i;
            while (j < lines.length) {
              const checkLine = lines[j].trim();
              if (!checkLine || !checkLine.includes('|')) {
                break;
              }
              // Skip separator rows
              if (!checkLine.match(/^[\s|:-]+$/)) {
                tableRows.push(checkLine);
              }
              j++;
            }
            
            if (tableRows.length > 0) {
              // Parse table
              const parsedTable = tableRows.map(row => {
                const cells = row.split('|')
                  .map(cell => cell.trim())
                  .filter(cell => cell.length > 0);
                return cells;
              });
              
              if (parsedTable.length > 0 && parsedTable[0].length > 0) {
                const numCols = parsedTable[0].length;
                const colWidth = maxWidth / numCols;
                const baseRowHeight = 10;
                const cellPadding = 4;
                
                // Draw table with borders
                const tableStartY = yPosition;
                let totalTableHeight = 0;
                
                parsedTable.forEach((row, rowIndex) => {
                  // Check if we need a new page
                  if (yPosition > pageHeight - margin - baseRowHeight - 15) {
                    pdf.addPage();
                    yPosition = margin;
                  }
                  
                  const isHeader = rowIndex === 0;
                  let maxCellHeight = baseRowHeight;
                  
                  // Calculate max height needed for this row
                  row.forEach(cell => {
                    // Remove markdown formatting (**text** -> text)
                    const cleanCell = parseMarkdownText(cell);
                    const cellLines = pdf.splitTextToSize(cleanCell, colWidth - (cellPadding * 2));
                    const cellHeight = cellLines.length * 5 + cellPadding;
                    if (cellHeight > maxCellHeight) {
                      maxCellHeight = cellHeight;
                    }
                  });
                  
                  const rowHeight = isHeader ? maxCellHeight + 2 : maxCellHeight;
                  totalTableHeight += rowHeight;
                  
                  // Draw row background for header
                  if (isHeader) {
                    pdf.setFillColor(245, 245, 245);
                    pdf.rect(margin, yPosition, maxWidth, rowHeight, 'F');
                  }
                  
                  // Draw cells
                  row.forEach((cell, colIndex) => {
                    const xPos = margin + (colIndex * colWidth);
                    
                    // Draw cell border
                    pdf.setDrawColor(180, 180, 180);
                    pdf.rect(xPos, yPosition, colWidth, rowHeight, 'S');
                    
                    // Clean cell text (remove markdown formatting)
                    const cleanCell = parseMarkdownText(cell);
                    
                    // Draw cell text
                    pdf.setFontSize(isHeader ? 10 : 9);
                    pdf.setFont(undefined, isHeader ? 'bold' : 'normal');
                    
                    const cellText = pdf.splitTextToSize(cleanCell, colWidth - (cellPadding * 2));
                    const textY = yPosition + (rowHeight / 2) - ((cellText.length - 1) * 2.5) + 3;
                    
                    pdf.text(cellText, xPos + cellPadding, textY);
                  });
                  
                  yPosition += rowHeight;
                });
                
                // Draw outer border around entire table
                pdf.setDrawColor(150, 150, 150);
                pdf.setLineWidth(0.5);
                pdf.rect(margin, tableStartY, maxWidth, totalTableHeight, 'S');
                pdf.setLineWidth(0.2);
                
                yPosition += 8; // Space after table
                pdf.setFontSize(11);
                pdf.setFont(undefined, 'normal');
                
                // Skip processed lines
                i = j;
                continue;
              }
            }
          } else {
            // Skip separator row
            i++;
            continue;
          }
        }

        // Handle headings
        if (trimmedLine.startsWith('# ')) {
          pdf.setFontSize(16);
          pdf.setFont(undefined, 'bold');
          const text = parseMarkdownText(trimmedLine.substring(2));
          const textLines = pdf.splitTextToSize(text, maxWidth);
          pdf.text(textLines, margin, yPosition);
          yPosition += textLines.length * 7;
          pdf.setFontSize(11);
          pdf.setFont(undefined, 'normal');
        } else if (trimmedLine.startsWith('## ')) {
          pdf.setFontSize(14);
          pdf.setFont(undefined, 'bold');
          const text = parseMarkdownText(trimmedLine.substring(3));
          const textLines = pdf.splitTextToSize(text, maxWidth);
          pdf.text(textLines, margin, yPosition);
          yPosition += textLines.length * 6;
          pdf.setFontSize(11);
          pdf.setFont(undefined, 'normal');
        } else if (trimmedLine.startsWith('### ')) {
          pdf.setFontSize(12);
          pdf.setFont(undefined, 'bold');
          const text = parseMarkdownText(trimmedLine.substring(4));
          const textLines = pdf.splitTextToSize(text, maxWidth);
          pdf.text(textLines, margin, yPosition);
          yPosition += textLines.length * 6;
          pdf.setFontSize(11);
          pdf.setFont(undefined, 'normal');
        } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
          // Bullet points - but check if it's actually a bullet or markdown formatting
          if (trimmedLine.startsWith('- ')) {
            const text = parseMarkdownText(trimmedLine.substring(2));
            const textLines = pdf.splitTextToSize(`• ${text}`, maxWidth - 10);
            pdf.text(textLines, margin + 5, yPosition);
            yPosition += textLines.length * 5;
          } else if (trimmedLine.startsWith('* ') && !trimmedLine.match(/^\*\s+\*\*/)) {
            // Regular bullet point, not markdown
            const text = parseMarkdownText(trimmedLine.substring(2));
            const textLines = pdf.splitTextToSize(`• ${text}`, maxWidth - 10);
            pdf.text(textLines, margin + 5, yPosition);
            yPosition += textLines.length * 5;
          } else {
            // Might be markdown formatting, parse it
            const text = parseMarkdownText(trimmedLine);
            const textLines = pdf.splitTextToSize(text, maxWidth);
            pdf.text(textLines, margin, yPosition);
            yPosition += textLines.length * 5;
          }
        } else if (/^\d+\.\s/.test(trimmedLine)) {
          // Numbered list
          const text = parseMarkdownText(trimmedLine.replace(/^\d+\.\s/, ''));
          const textLines = pdf.splitTextToSize(text, maxWidth - 10);
          pdf.text(textLines, margin + 5, yPosition);
          yPosition += textLines.length * 5;
        } else {
          // Regular text - handle bold formatting
          const cleanText = parseMarkdownText(trimmedLine);
          const textLines = pdf.splitTextToSize(cleanText, maxWidth);
          pdf.text(textLines, margin, yPosition);
          yPosition += textLines.length * 5;
        }

        yPosition += 3; // Small spacing between lines
        i++;
      }

      // Save the PDF
      const fileName = `${title.replace(/[^a-z0-9]/gi, '_')}_StudySheet.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      setError('Failed to generate PDF. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Quiz title is required');
      return;
    }

    if (formData.questions.length === 0) {
      setError('Quiz must have at least one question');
      return;
    }

    // Validate questions
    for (let i = 0; i < formData.questions.length; i++) {
      const q = formData.questions[i];
      if (!q.questionText.trim()) {
        setError(`Question ${i + 1} text is required`);
        return;
      }
      if (q.options.some(opt => !opt.trim())) {
        setError(`Question ${i + 1} must have all options filled`);
        return;
      }
    }

    setLoading(true);
    try {
      await quizAPI.createQuiz(formData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="quiz-form-container">
      <div className="quiz-form">
        <h1>Create New Quiz</h1>
        {error && <div className="error-message">{error}</div>}
        
        {/* Enhanced AI Quiz Maker Section */}
        <div className="enhanced-ai-section" style={{ marginBottom: '2rem', padding: '1.5rem', border: '2px dashed #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>✨ Enhanced AI Quiz Maker</h2>
            <button
              type="button"
              onClick={() => setEnhancedAIMode(!enhancedAIMode)}
              className="btn btn-secondary"
              style={{ fontSize: '0.9rem' }}
            >
              {enhancedAIMode ? 'Hide' : 'Show'}
            </button>
          </div>
          
          {enhancedAIMode && (
            <div>
              <p style={{ marginBottom: '1rem', color: '#666', fontSize: '0.9rem' }}>
                Upload a PDF, SRT, or video file (MP4, MOV, WEBM, AVI), or provide a YouTube video URL. AI will analyze the content, create a study sheet, and automatically generate a complete quiz with appropriate parameters. Video files are analyzed directly by Gemini AI.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                {/* File Upload */}
                <div>
                  <label className="form-label">Upload File (PDF, SRT, or Video)</label>
                  <input
                    type="file"
                    accept=".pdf,.srt,.mp4,.mov,.webm,.avi"
                    onChange={handleFileUpload}
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
                    onClick={generateFromFile}
                    className="btn btn-primary"
                    disabled={!uploadedFile || generatingFromSource}
                    style={{ width: '100%' }}
                  >
                    {generatingFromSource ? '✨ Generating...' : '✨ Generate from File'}
                  </button>
                </div>
                
                {/* YouTube URL */}
                <div>
                  <label className="form-label">YouTube Video URL</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    disabled={generatingFromSource}
                    style={{ marginBottom: '0.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={generateFromYouTube}
                    className="btn btn-primary"
                    disabled={!youtubeUrl.trim() || generatingFromSource}
                    style={{ width: '100%' }}
                  >
                    {generatingFromSource ? '✨ Generating...' : '✨ Generate from YouTube'}
                  </button>
                </div>
              </div>
              
              {generatingFromSource && (
                <div style={{ textAlign: 'center', padding: '1rem', color: '#666' }}>
                  <div>✨ AI is analyzing your content...</div>
                  <div style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    Creating study sheet, determining parameters, generating questions, and creating images...
                  </div>
                  <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#999' }}>
                    This may take a minute or two
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Quiz Title *</label>
            <div className="input-with-icon">
              <input
                type="text"
                className="form-input"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
              <button
                type="button"
                onClick={generateTitle}
                className="icon-button"
                disabled={generatingTitle || !formData.category || !formData.difficulty}
                title="Generate title with AI"
              >
                {generatingTitle ? '⏳' : '✨'}
              </button>
            </div>
            {studySheet && (
              <div style={{ marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={downloadStudySheetPDF}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
                  title="Download study sheet as PDF"
                >
                  📥 Download Study Sheet PDF
                </button>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <div className="textarea-with-icon">
              <textarea
                className="form-input"
                rows="3"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <button
                type="button"
                onClick={generateDescription}
                className="icon-button"
                disabled={generatingDescription || !formData.title.trim() || !formData.category || !formData.difficulty}
                title="Generate description with AI"
              >
                {generatingDescription ? '⏳' : '✨'}
              </button>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {QUIZ_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {formatCategory(cat)}
                    {cat === 'reading' ? ' Comprehension' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Difficulty</label>
              <select
                className="form-select"
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
              >
                {QUIZ_DIFFICULTIES.map(diff => (
                  <option key={diff} value={diff}>
                    {formatDifficulty(diff)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Question Number</label>
              <input
                type="number"
                className="form-input"
                min="1"
                max="50"
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="form-group">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                console.log('Button clicked, disabled state:', generatingQuestions || !formData.title.trim() || !formData.category || !formData.difficulty);
                generateQuestionsByAI();
              }}
              className="btn btn-primary btn-large"
              disabled={generatingQuestions || !formData.title.trim() || !formData.category || !formData.difficulty}
              title={
                !formData.title.trim() ? 'Please enter a quiz title first' :
                !formData.category ? 'Please select a category' :
                !formData.difficulty ? 'Please select a difficulty' :
                'Generate questions using AI'
              }
            >
              {generatingQuestions ? '✨ Generating Questions & Images...' : '✨ Generate by AI'}
            </button>
            {(!formData.title.trim() || !formData.category || !formData.difficulty) && (
              <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                {!formData.title.trim() && '⚠ Please enter a title first. '}
                {!formData.category && '⚠ Please select a category. '}
                {!formData.difficulty && '⚠ Please select a difficulty.'}
              </div>
            )}
          </div>

          <div className="questions-section">
            <div className="questions-header">
              <h2>Questions ({formData.questions.length})</h2>
              <button type="button" onClick={addQuestion} className="btn btn-primary">
                + Add Question
              </button>
            </div>

            {formData.questions.map((question, qIndex) => (
              <div key={qIndex} className="question-card">
                <div className="question-header">
                  <h3>Question {qIndex + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeQuestion(qIndex)}
                    className="btn btn-danger btn-sm"
                  >
                    Remove
                  </button>
                </div>

                <div className="form-group">
                  <label className="form-label">Question Text *</label>
                  <textarea
                    className="form-input"
                    rows="2"
                    value={question.questionText}
                    onChange={(e) => updateQuestion(qIndex, 'questionText', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <div className="image-section">
                    <label className="form-label">Question Image</label>
                    <div className="image-controls">
                      {(() => {
                        const history = imageHistory[qIndex];
                        const hasHistory = history && history.history.length > 0;
                        const canGoBack = hasHistory && history.currentIndex > 0;
                        const canGoForward = hasHistory && history.currentIndex < history.history.length - 1;
                        const currentImageNum = hasHistory ? history.currentIndex + 1 : 0;
                        const totalImages = hasHistory ? history.history.length : 0;
                        
                        return (
                          <>
                            <button
                              type="button"
                              onClick={() => navigateImage(qIndex, 'prev')}
                              className="btn btn-secondary btn-sm"
                              disabled={!canGoBack}
                              title="Previous image"
                            >
                              ◀ Back
                            </button>
                            <button
                              type="button"
                              onClick={() => generateImage(qIndex)}
                              className="btn btn-secondary btn-sm"
                              disabled={generatingImages[qIndex] || !question.questionText.trim()}
                            >
                              {generatingImages[qIndex] ? 'Generating...' : '🖼️ Generate Image'}
                            </button>
                            <button
                              type="button"
                              onClick={() => navigateImage(qIndex, 'next')}
                              className="btn btn-secondary btn-sm"
                              disabled={!canGoForward}
                              title="Next image"
                            >
                              Forward ▶
                            </button>
                            {hasHistory && (
                              <span className="image-counter">
                                {currentImageNum} / {totalImages}
                              </span>
                            )}
                            {question.imageUrl && (
                              <button
                                type="button"
                                onClick={() => removeImage(qIndex)}
                                className="btn btn-danger btn-sm"
                              >
                                Remove Image
                              </button>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    {question.imageUrl && (
                      <div className="question-image-preview">
                        <img 
                          src={question.imageUrl} 
                          alt="Question" 
                          onError={(e) => {
                            e.target.style.display = 'none';
                            setError('Failed to load image');
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Options *</label>
                  {question.options.map((option, oIndex) => (
                    <div key={oIndex} className="option-row">
                      <input
                        type="radio"
                        name={`correct-${qIndex}`}
                        checked={question.correctAnswer === oIndex}
                        onChange={() => updateQuestion(qIndex, 'correctAnswer', oIndex)}
                      />
                      <input
                        type="text"
                        className="form-input option-input"
                        placeholder={`Option ${oIndex + 1}`}
                        value={option}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        required
                      />
                    </div>
                  ))}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Points</label>
                    <input
                      type="number"
                      className="form-input"
                      min="1"
                      value={question.points}
                      onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Time Limit (seconds)</label>
                    <input
                      type="number"
                      className="form-input"
                      min="5"
                      max="60"
                      value={question.timeLimit}
                      onChange={(e) => updateQuestion(qIndex, 'timeLimit', parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
              {loading ? 'Creating...' : 'Create Quiz'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn btn-secondary btn-large"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateQuiz;

