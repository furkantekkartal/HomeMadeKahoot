import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { quizAPI, sessionAPI } from '../services/api';
import './Quiz.css';

const Quiz = () => {
  const navigate = useNavigate();
  const [myQuizzes, setMyQuizzes] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hostingQuizId, setHostingQuizId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [quizzesRes, sessionsRes] = await Promise.all([
        quizAPI.getMyQuizzes(),
        sessionAPI.getMySessions()
      ]);
      setMyQuizzes(quizzesRes.data);
      setRecentSessions(sessionsRes.data.slice(0, 5));
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
        setMyQuizzes(myQuizzes.filter(q => q._id !== id));
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

  return (
    <div className="quiz">
      <div className="quiz-header">
        <h1>Quiz</h1>
        <Link to="/create-quiz" className="btn btn-primary">
          + Create New Quiz
        </Link>
      </div>

      <div className="quiz-grid-layout">
        <div className="quiz-section">
          <h2>My Quizzes ({myQuizzes.length})</h2>
          {myQuizzes.length === 0 ? (
            <div className="empty-state">
              <p>No quizzes yet. Create your first quiz!</p>
              <Link to="/create-quiz" className="btn btn-primary">
                Create Quiz
              </Link>
            </div>
          ) : (
            <div className="quiz-grid">
              {myQuizzes.map(quiz => (
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
                  </div>
                  <div className="quiz-actions">
                    <button
                      onClick={(e) => handleHostQuiz(quiz._id, e)}
                      className="btn btn-success btn-sm"
                      disabled={hostingQuizId === quiz._id}
                    >
                      {hostingQuizId === quiz._id ? 'Creating...' : 'Host Quiz'}
                    </button>
                    <Link to={`/edit-quiz/${quiz._id}`} className="btn btn-secondary btn-sm">
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDeleteQuiz(quiz._id)}
                      className="btn btn-danger btn-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="quiz-section">
          <h2>Recent Sessions</h2>
          {recentSessions.length === 0 ? (
            <div className="empty-state">
              <p>No recent sessions</p>
            </div>
          ) : (
            <div className="sessions-list">
              {recentSessions.map(session => (
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

