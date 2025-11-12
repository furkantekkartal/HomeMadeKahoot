import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { quizAPI, sessionAPI } from '../services/api';
import './Quiz.css';

const Quiz = () => {
  const navigate = useNavigate();
  const [allQuizzes, setAllQuizzes] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hostingQuizId, setHostingQuizId] = useState(null);
  const [sessionFilter, setSessionFilter] = useState('all'); // 'all', 'completed', 'active', 'waiting'

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [quizzesRes, sessionsRes] = await Promise.all([
        quizAPI.getAll(false), // Get all visible quizzes
        sessionAPI.getMySessions()
      ]);
      setAllQuizzes(quizzesRes.data);
      setRecentSessions(sessionsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = async (id) => {
    if (window.confirm('Are you sure you want to delete this quiz?')) {
      try {
        await quizAPI.deleteQuiz(id);
        setAllQuizzes(allQuizzes.filter(q => q._id !== id));
      } catch (error) {
        alert('Error deleting quiz');
      }
    }
  };

  const handleHostQuiz = async (quizId, event) => {
    // If it's a Link click, let React Router handle it
    // But we need to create the session first
    if (event && event.defaultPrevented) {
      return; // Already handled by Link
    }
    
    event?.preventDefault();
    setHostingQuizId(quizId);
    
    try {
      const response = await sessionAPI.createSession({ quizId });
      const session = response.data;
      
      if (!session || !session._id) {
        alert('Failed to create session. Please try again.');
        setHostingQuizId(null);
        return;
      }

      // Navigate using React Router (same window)
      // This ensures React Router handles the route properly
      // If user wants new tab, they can right-click and "Open in new tab"
      navigate(`/host/${session._id}`);
    } catch (error) {
      console.error('Error creating session:', error);
      alert(`Error creating session: ${error.response?.data?.message || error.message}`);
      setHostingQuizId(null);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const filteredSessions = sessionFilter === 'all' 
    ? recentSessions 
    : recentSessions.filter(session => session.status === sessionFilter);

  return (
    <div className="quiz">
      <div className="quiz-header">
        <h1>Quiz</h1>
      </div>

      <div className="quiz-grid-layout">
        <div className="quiz-section">
          <h2>All Quizzes ({allQuizzes.length})</h2>
          {allQuizzes.length === 0 ? (
            <div className="empty-state">
              <p>No quizzes available.</p>
            </div>
          ) : (
            <div className="quiz-grid">
              {allQuizzes.map(quiz => (
                <div key={quiz._id} className="quiz-card">
                  <div className="quiz-card-header">
                    <h3>{quiz.title}</h3>
                    <div className="header-badges">
                      <span className="badge badge-level">
                        {quiz.level || (quiz.difficulty === 'beginner' ? 'A1' : quiz.difficulty === 'intermediate' ? 'B1' : quiz.difficulty === 'advanced' ? 'C1' : 'A1')}
                      </span>
                    </div>
                  </div>
                  <p className="quiz-description">{quiz.description || 'No description'}</p>
                  <div className="quiz-meta">
                    <span>📚 {quiz.task || (quiz.category === 'vocabulary' ? 'Vocabulary' : quiz.category === 'grammar' ? 'Grammar' : quiz.category || 'Vocabulary')}</span>
                    <span>🎯 {quiz.skill || (quiz.category === 'reading' ? 'Reading' : quiz.category === 'listening' ? 'Listening' : 'Reading')}</span>
                    <span>❓ {quiz.questions.length} questions</span>
                    <span>👤 {quiz.creatorId?.username || 'Unknown'}</span>
                  </div>
                  <div className="quiz-actions">
                    <button
                      onClick={(e) => handleHostQuiz(quiz._id, e)}
                      className="btn btn-success btn-sm"
                      disabled={hostingQuizId === quiz._id}
                    >
                      {hostingQuizId === quiz._id ? 'Creating...' : 'Host Quiz'}
                    </button>
                    <Link 
                      to={`/edit-quiz/${quiz._id}`} 
                      className="btn btn-secondary btn-sm"
                      title="Edit quiz"
                    >
                      <FaEdit />
                    </Link>
                    <button
                      onClick={() => handleDeleteQuiz(quiz._id)}
                      className="btn btn-danger btn-sm"
                      title="Delete quiz"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="quiz-section">
          <div className="sessions-header">
            <h2>Recent Sessions</h2>
            <div className="session-filters">
              <label>
                <input
                  type="radio"
                  name="sessionFilter"
                  value="all"
                  checked={sessionFilter === 'all'}
                  onChange={(e) => setSessionFilter(e.target.value)}
                />
                All
              </label>
              <label>
                <input
                  type="radio"
                  name="sessionFilter"
                  value="completed"
                  checked={sessionFilter === 'completed'}
                  onChange={(e) => setSessionFilter(e.target.value)}
                />
                Completed
              </label>
              <label>
                <input
                  type="radio"
                  name="sessionFilter"
                  value="active"
                  checked={sessionFilter === 'active'}
                  onChange={(e) => setSessionFilter(e.target.value)}
                />
                Active
              </label>
              <label>
                <input
                  type="radio"
                  name="sessionFilter"
                  value="waiting"
                  checked={sessionFilter === 'waiting'}
                  onChange={(e) => setSessionFilter(e.target.value)}
                />
                Waiting
              </label>
            </div>
          </div>
          {filteredSessions.length === 0 ? (
            <div className="empty-state">
              <p>No sessions found</p>
            </div>
          ) : (
            <div className="sessions-list">
              {filteredSessions.map(session => (
                <div key={session._id} className="session-item">
                  <div className="session-item-content">
                    <strong>{session.quizId?.title || 'Quiz'}</strong>
                    <div className="session-meta">
                      <span>PIN: {session.pin}</span>
                      <span className={`status status-${session.status}`}>
                        {session.status}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/host/${session._id}`)}
                    className="btn btn-success btn-sm"
                    title="Reopen host page"
                  >
                    Rejoin Host
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Quiz;

