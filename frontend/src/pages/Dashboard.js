import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { quizAPI, sessionAPI } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const [myQuizzes, setMyQuizzes] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleHostQuiz = async (quizId) => {
    try {
      const response = await sessionAPI.createSession({ quizId });
      const session = response.data;
      // Small delay to ensure session is saved
      setTimeout(() => {
        window.open(`/host/${session._id}`, '_blank');
      }, 100);
    } catch (error) {
      console.error('Error creating session:', error);
      alert(`Error creating session: ${error.response?.data?.message || error.message}`);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <Link to="/create-quiz" className="btn btn-primary">
          + Create New Quiz
        </Link>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
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
                      onClick={() => handleHostQuiz(quiz._id)}
                      className="btn btn-success btn-sm"
                    >
                      Host Quiz
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

        <div className="dashboard-section">
          <h2>Recent Sessions</h2>
          {recentSessions.length === 0 ? (
            <div className="empty-state">
              <p>No recent sessions</p>
            </div>
          ) : (
            <div className="sessions-list">
              {recentSessions.map(session => (
                <div key={session._id} className="session-item">
                  <div>
                    <strong>{session.quizId?.title || 'Quiz'}</strong>
                    <div className="session-meta">
                      <span>PIN: {session.pin}</span>
                      <span className={`status status-${session.status}`}>
                        {session.status}
                      </span>
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

export default Dashboard;

