import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizAPI, sessionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './BrowseQuizzes.css';

const BrowseQuizzes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingSession, setCreatingSession] = useState(null);
  const [filters, setFilters] = useState({
    category: 'all',
    difficulty: 'all'
  });

  useEffect(() => {
    loadQuizzes();
  }, []);

  const loadQuizzes = async () => {
    try {
      const response = await quizAPI.getAll();
      setQuizzes(response.data);
    } catch (error) {
      console.error('Error loading quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    if (filters.category !== 'all' && quiz.category !== filters.category) return false;
    if (filters.difficulty !== 'all' && quiz.difficulty !== filters.difficulty) return false;
    return true;
  });

  const handleTakeQuiz = async (quizId, event) => {
    event.preventDefault();
    setCreatingSession(quizId);
    
    try {
      // Create a session for this quiz
      const response = await sessionAPI.createSession({ quizId });
      const session = response.data;
      
      if (!session || !session._id) {
        alert('Failed to create session. Please try again.');
        setCreatingSession(null);
        return;
      }

      // Get username from logged-in user or use a default
      const username = user?.username || `User${Math.floor(Math.random() * 1000)}`;
      
      // Navigate to play page with session ID and username
      navigate(`/play/${session._id}`, { 
        state: { 
          username,
          autoStart: true // Flag to auto-start the quiz
        } 
      });
    } catch (error) {
      console.error('Error creating session:', error);
      alert(`Error creating session: ${error.response?.data?.message || error.message}`);
      setCreatingSession(null);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="browse-quizzes">
      <div className="browse-header">
        <h1>Browse Quizzes</h1>
        <div className="filters">
          <select
            className="filter-select"
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
          >
            <option value="all">All Categories</option>
            <option value="vocabulary">Vocabulary</option>
            <option value="grammar">Grammar</option>
            <option value="reading">Reading</option>
            <option value="listening">Listening</option>
          </select>
          <select
            className="filter-select"
            value={filters.difficulty}
            onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
          >
            <option value="all">All Difficulties</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      {filteredQuizzes.length === 0 ? (
        <div className="empty-state card">
          <p>No quizzes found matching your filters.</p>
        </div>
      ) : (
        <div className="quizzes-grid">
          {filteredQuizzes.map(quiz => (
            <div key={quiz._id} className="quiz-card">
              <div className="quiz-card-header">
                <h3>{quiz.title}</h3>
                <span className={`badge badge-${quiz.difficulty}`}>
                  {quiz.difficulty}
                </span>
              </div>
              <p className="quiz-description">{quiz.description || 'No description'}</p>
              <div className="quiz-meta">
                <span>📚 {quiz.category}</span>
                <span>❓ {quiz.questions.length} questions</span>
                <span>👤 {quiz.creatorId?.username || 'Unknown'}</span>
              </div>
              <div className="quiz-actions">
                <button
                  onClick={(e) => handleTakeQuiz(quiz._id, e)}
                  className="btn btn-primary btn-sm"
                  disabled={creatingSession === quiz._id}
                >
                  {creatingSession === quiz._id ? 'Starting...' : 'Take Quiz'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BrowseQuizzes;

