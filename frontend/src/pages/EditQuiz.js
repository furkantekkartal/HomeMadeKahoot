import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quizAPI } from '../services/api';
import { QUIZ_CATEGORIES, QUIZ_DIFFICULTIES, formatCategory, formatDifficulty } from '../constants/quizConstants';
import './QuizForm.css';

const EditQuiz = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingImages, setGeneratingImages] = useState({});
  // Store image history for each question: { questionIndex: { history: [], currentIndex: -1 } }
  const [imageHistory, setImageHistory] = useState({});

  useEffect(() => {
    loadQuiz();
  }, [id]);

  const loadQuiz = async () => {
    try {
      const response = await quizAPI.getQuiz(id);
      const quizData = response.data;
      setFormData(quizData);
      
      // Initialize image history for existing images
      const initialHistory = {};
      if (quizData.questions) {
        quizData.questions.forEach((question, index) => {
          if (question.imageUrl) {
            initialHistory[index] = {
              history: [question.imageUrl],
              currentIndex: 0
            };
          } else {
            initialHistory[index] = {
              history: [],
              currentIndex: -1
            };
          }
        });
      }
      setImageHistory(initialHistory);
    } catch (error) {
      setError('Error loading quiz');
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        {
          questionText: '',
          options: ['', '', '', ''],
          correctAnswer: 0,
          points: 100,
          timeLimit: 20,
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

    setSaving(true);
    try {
      await quizAPI.updateQuiz(id, formData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating quiz');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!formData) {
    return <div className="error-message">Quiz not found</div>;
  }

  return (
    <div className="quiz-form-container">
      <div className="quiz-form">
        <h1>Edit Quiz</h1>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Quiz Title *</label>
            <input
              type="text"
              className="form-input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              rows="3"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
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
            <button type="submit" className="btn btn-primary btn-large" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
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

export default EditQuiz;

