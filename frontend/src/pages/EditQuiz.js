import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quizAPI } from '../services/api';
import { QUIZ_LEVELS, QUIZ_SKILLS, QUIZ_TASKS, formatLevel, formatSkill, formatTask } from '../constants/quizConstants';
import './EditQuiz.css';

const EditQuiz = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quizData, setQuizData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadQuiz();
  }, [id]);

  const loadQuiz = async () => {
    try {
      setLoading(true);
      const response = await quizAPI.getQuiz(id);
      const quiz = response.data;
      
      setQuizData({
        title: quiz.title || '',
        description: quiz.description || '',
        level: quiz.level || '',
        skill: quiz.skill || '',
        task: quiz.task || '',
        questions: quiz.questions || []
      });
    } catch (error) {
      setError('Error loading quiz');
      console.error('Error loading quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!quizData.title.trim()) {
      setError('Quiz title is required');
      return;
    }

    if (!quizData.questions || quizData.questions.length === 0) {
      setError('Quiz must have at least one question');
      return;
    }

    setSaving(true);
    try {
      await quizAPI.updateQuiz(id, {
        title: quizData.title,
        description: quizData.description,
        level: quizData.level,
        skill: quizData.skill,
        task: quizData.task,
        questions: quizData.questions
      });
      navigate('/quizzes');
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating quiz');
    } finally {
      setSaving(false);
    }
  };

  const handleQuestionChange = (index, field, value) => {
    const updatedQuestions = [...quizData.questions];
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
    setQuizData({ ...quizData, questions: updatedQuestions });
  };

  const handleDeleteQuestion = (index) => {
    const updatedQuestions = quizData.questions.filter((_, i) => i !== index);
    setQuizData({ ...quizData, questions: updatedQuestions });
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!quizData) {
    return <div className="error-message">Quiz not found</div>;
  }

  return (
    <div className="edit-quiz-container">
      <div className="edit-quiz-layout">
        {/* Pane 1: Edit Quiz Information */}
        <div className="edit-quiz-pane">
          <h1>Edit Quiz</h1>
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Quiz Title *</label>
              <input
                type="text"
                className="form-input"
                value={quizData.title}
                onChange={(e) => setQuizData({ ...quizData, title: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                rows="3"
                value={quizData.description || ''}
                onChange={(e) => setQuizData({ ...quizData, description: e.target.value })}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Level</label>
                <select
                  className="form-select"
                  value={quizData.level}
                  onChange={(e) => setQuizData({ ...quizData, level: e.target.value })}
                >
                  <option value="">Select Level</option>
                  {QUIZ_LEVELS.map(level => (
                    <option key={level} value={level}>
                      {formatLevel(level)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Skill</label>
                <select
                  className="form-select"
                  value={quizData.skill}
                  onChange={(e) => setQuizData({ ...quizData, skill: e.target.value })}
                >
                  <option value="">Select Skill</option>
                  {QUIZ_SKILLS.map(skill => (
                    <option key={skill} value={skill}>
                      {formatSkill(skill)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Task</label>
                <select
                  className="form-select"
                  value={quizData.task}
                  onChange={(e) => setQuizData({ ...quizData, task: e.target.value })}
                >
                  <option value="">Select Task</option>
                  {QUIZ_TASKS.map(task => (
                    <option key={task} value={task}>
                      {formatTask(task)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-large" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/quizzes')}
                className="btn btn-secondary btn-large"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Pane 2: Questions Section */}
        <div className="questions-pane">
          <div className="questions-header">
            <h2>Questions ({quizData.questions.length})</h2>
          </div>

          {quizData.questions.length === 0 ? (
            <div className="no-questions-message">
              <p>No questions in this quiz. Add questions from the Create Quiz page.</p>
            </div>
          ) : (
            <div className="questions-grid">
              {quizData.questions.map((question, index) => (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default EditQuiz;

