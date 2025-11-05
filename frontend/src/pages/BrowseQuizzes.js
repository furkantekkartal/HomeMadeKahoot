import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { quizAPI } from '../services/api';
import './BrowseQuizzes.css';

const BrowseQuizzes = () => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
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
                <Link
                  to={`/quiz/${quiz._id}/self-paced`}
                  className="btn btn-primary btn-sm"
                >
                  Take Quiz
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BrowseQuizzes;

