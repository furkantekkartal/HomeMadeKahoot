import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sessionAPI } from '../services/api';
import './Results.css';

const Results = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      const response = await sessionAPI.getMyResults();
      setResults(response.data);
    } catch (error) {
      console.error('Error loading results:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="results-page">
      <h1>My Results</h1>
      {results.length === 0 ? (
        <div className="empty-state card">
          <p>No results yet. Complete some quizzes to see your results here!</p>
          <Link to="/dashboard" className="btn btn-primary">
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <div className="results-list">
          {results.map(result => {
            const percentage = Math.round((result.correctAnswers / result.totalQuestions) * 100);
            return (
              <div key={result._id} className="result-card card">
                <div className="result-header">
                  <div>
                    <h3>{result.quizId?.title || 'Quiz'}</h3>
                    <div className="result-meta">
                      <span className={`badge badge-${result.quizId?.difficulty || 'beginner'}`}>
                        {result.quizId?.difficulty || 'beginner'}
                      </span>
                      <span className="badge badge-category">
                        {result.quizId?.category || 'general'}
                      </span>
                      <span className={`badge badge-${result.mode}`}>
                        {result.mode === 'live' ? 'Live' : 'Self-Paced'}
                      </span>
                    </div>
                  </div>
                  <div className="result-score">
                    <div className="score-value">{result.score}</div>
                    <div className="score-label">points</div>
                  </div>
                </div>
                <div className="result-stats">
                  <div className="stat-item">
                    <div className="stat-value">{result.correctAnswers}/{result.totalQuestions}</div>
                    <div className="stat-label">Correct</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">{percentage}%</div>
                    <div className="stat-label">Accuracy</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">
                      {new Date(result.completedAt).toLocaleDateString()}
                    </div>
                    <div className="stat-label">Date</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Results;

