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

  useEffect(() => {
    loadQuiz();
  }, [id]);

  const loadQuiz = async () => {
    try {
      const response = await quizAPI.getQuiz(id);
      setFormData(response.data);
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
          timeLimit: 20
        }
      ]
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

