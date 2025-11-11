import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sessionAPI, quizAPI } from '../services/api';
import { QUIZ_CATEGORIES, QUIZ_DIFFICULTIES, formatCategory, formatDifficulty } from '../constants/quizConstants';
import './Results.css';

const Results = () => {
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    studentName: '',
    quizName: '',
    category: '',
    difficulty: '',
    dateFrom: '',
    dateTo: ''
  });
  const [appliedFilters, setAppliedFilters] = useState({
    studentName: '',
    quizName: '',
    category: '',
    difficulty: '',
    dateFrom: '',
    dateTo: ''
  });
  const [summary, setSummary] = useState({
    totalSessions: 0,
    totalStudents: 0
  });
  const [expandedRows, setExpandedRows] = useState(new Set());

  // Use shared constants for categories and difficulties
  const categories = QUIZ_CATEGORIES;
  const difficulties = QUIZ_DIFFICULTIES;

  useEffect(() => {
    loadAnalytics();
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [appliedFilters]);

  // Categories are now from constants, no need to load from API

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      // Only send filters that have values (not empty strings)
      const activeFilters = Object.entries(appliedFilters).reduce((acc, [key, value]) => {
        if (value && value !== '') {
          acc[key] = value;
        }
        return acc;
      }, {});
      
      const response = await sessionAPI.getTeacherAnalytics(activeFilters);
      setAnalytics(response.data.analytics || []);
      setSummary({
        totalSessions: response.data.totalSessions || 0,
        totalStudents: response.data.totalStudents || 0
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  const clearFilters = () => {
    const emptyFilters = {
      studentName: '',
      quizName: '',
      category: '',
      difficulty: '',
      dateFrom: '',
      dateTo: ''
    };
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
  };

  const toggleRow = (studentName) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(studentName)) {
      newExpanded.delete(studentName);
    } else {
      newExpanded.add(studentName);
    }
    setExpandedRows(newExpanded);
  };

  if (loading) {
    return <div className="loading">Loading analytics...</div>;
  }

  const hasActiveFilters = Object.values(appliedFilters).some(v => v !== '');

  return (
    <div className="results-container">
      {/* Top Bar */}
      <div className="results-header">
        <h1>Student Analytics</h1>
        <div className="header-controls">
          <Link to="/quiz" className="btn btn-secondary">
            Back to Quiz
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="results-content">
        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-value">{summary.totalSessions}</div>
            <div className="summary-label">Total Sessions</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{summary.totalStudents}</div>
            <div className="summary-label">Total Students</div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-panel card">
          <h2>Filters</h2>
          <div className="filters-grid">
            <div className="filter-group">
              <label>Student Name</label>
              <input
                type="text"
                placeholder="Search by student name..."
                value={filters.studentName}
                onChange={(e) => handleFilterChange('studentName', e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>Quiz Name</label>
              <input
                type="text"
                placeholder="Search by quiz name..."
                value={filters.quizName}
                onChange={(e) => handleFilterChange('quizName', e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat.toLowerCase()}>
                    {formatCategory(cat)}
                    {cat === 'reading' ? ' Comprehension' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Difficulty</label>
              <select
                value={filters.difficulty}
                onChange={(e) => {
                  const value = e.target.value;
                  handleFilterChange('difficulty', value);
                }}
              >
                <option value="">All Difficulties</option>
                {difficulties.map(diff => (
                  <option key={diff} value={diff.toLowerCase()}>{formatDifficulty(diff)}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>

            <div className="filter-group">
              <label>Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
          </div>

          <div className="filter-actions">
            <button onClick={applyFilters} className="btn btn-primary">
              Apply Filters
            </button>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="btn btn-secondary">
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Analytics Table */}
        {analytics.length === 0 ? (
          <div className="empty-state card">
            <p>No analytics data available yet. Host some quizzes to see student performance here!</p>
            <Link to="/quiz" className="btn btn-primary">
              Go to Quiz
            </Link>
          </div>
        ) : (
          <div className="analytics-table-container card">
            <h2>Student Performance</h2>
            <div className="table-wrapper">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Quizzes</th>
                    <th>Sessions</th>
                    <th>Questions</th>
                    <th>Points</th>
                    <th>Correct</th>
                    <th>Wrong</th>
                    <th>Success</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.map((student, idx) => (
                    <React.Fragment key={idx}>
                      <tr className={expandedRows.has(student.studentName) ? 'expanded' : ''}>
                        <td className="student-name">{student.studentName}</td>
                        <td>{student.totalQuizzes}</td>
                        <td>{student.totalSessions || 0}</td>
                        <td>{student.totalQuestions}</td>
                        <td className="score">{student.totalPoints}</td>
                        <td className="correct">{student.totalCorrect}</td>
                        <td className="wrong">{student.totalWrong}</td>
                        <td className="accuracy">{student.successPercentage}%</td>
                        <td>
                          <button
                            onClick={() => toggleRow(student.studentName)}
                            className="btn btn-small"
                          >
                            {expandedRows.has(student.studentName) ? '▼ Hide' : '▶ Show'}
                          </button>
                        </td>
                      </tr>
                      {expandedRows.has(student.studentName) && (
                        <tr className="detail-row">
                          <td colSpan="9">
                            <div className="session-details">
                              <h3>Sessions for {student.studentName}</h3>
                              <div className="sessions-list">
                                {student.sessions.map((session, sIdx) => (
                                  <div key={sIdx} className="session-card">
                                    <div className="session-header">
                                      <h4>{session.quizName}</h4>
                                      <span className={`badge badge-${session.difficulty}`}>
                                        {session.difficulty}
                                      </span>
                                      <span className="badge badge-category">
                                        {session.category}
                                      </span>
                                    </div>
                                    <div className="session-meta">
                                      <span>Date: {new Date(session.completedAt).toLocaleDateString()}</span>
                                      <span>Questions: {session.questionCount}</span>
                                    </div>
                                    <div className="session-stats">
                                      <div className="stat">
                                        <span className="stat-label">Points:</span>
                                        <span className="stat-value">{session.points}</span>
                                      </div>
                                      <div className="stat">
                                        <span className="stat-label">Correct:</span>
                                        <span className="stat-value correct">{session.correctAnswers}</span>
                                      </div>
                                      <div className="stat">
                                        <span className="stat-label">Wrong:</span>
                                        <span className="stat-value wrong">{session.wrongAnswers}</span>
                                      </div>
                                      <div className="stat">
                                        <span className="stat-label">Success:</span>
                                        <span className="stat-value">{session.successPercentage}%</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Results;
