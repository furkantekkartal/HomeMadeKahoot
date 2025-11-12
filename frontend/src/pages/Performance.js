import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sessionAPI } from '../services/api';
import { QUIZ_LEVELS, QUIZ_SKILLS, QUIZ_TASKS, formatLevel, formatSkill, formatTask } from '../constants/quizConstants';
import './Performance.css';

const Performance = () => {
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    studentName: '',
    quizName: '',
    level: '',
    skill: '',
    task: '',
    dateFrom: '',
    dateTo: ''
  });
  const [appliedFilters, setAppliedFilters] = useState({
    studentName: '',
    quizName: '',
    level: '',
    skill: '',
    task: '',
    dateFrom: '',
    dateTo: ''
  });
  const [summary, setSummary] = useState({
    totalQuizzes: 0,
    totalSessions: 0
  });
  const [expandedRows, setExpandedRows] = useState(new Set());

  useEffect(() => {
    loadPerformance();
  }, []);

  useEffect(() => {
    loadPerformance();
  }, [appliedFilters]);

  const loadPerformance = async () => {
    try {
      setLoading(true);
      const activeFilters = Object.entries(appliedFilters).reduce((acc, [key, value]) => {
        if (value && value !== '') {
          acc[key] = value;
        }
        return acc;
      }, {});
      
      const response = await sessionAPI.getMyPerformance(activeFilters);
      setPerformance(response.data.performance || []);
      setSummary({
        totalQuizzes: response.data.totalQuizzes || 0,
        totalSessions: response.data.totalSessions || 0
      });
    } catch (error) {
      console.error('Error loading performance:', error);
      alert('Failed to load performance data: ' + (error.response?.data?.message || error.message));
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
      level: '',
      skill: '',
      task: '',
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
    return <div className="loading">Loading performance...</div>;
  }

  const hasActiveFilters = Object.values(appliedFilters).some(v => v !== '');

  return (
    <div className="performance-container">
      <div className="performance-header">
        <h1>Student Performance</h1>
        <Link to="/quiz" className="btn btn-secondary">
          Back to Quiz
        </Link>
      </div>

      <div className="performance-content">
        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-value">{performance.length}</div>
            <div className="summary-label">Total Students</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{summary.totalSessions}</div>
            <div className="summary-label">Total Sessions</div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-panel">
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
              <label>Level</label>
              <select
                value={filters.level}
                onChange={(e) => handleFilterChange('level', e.target.value)}
              >
                <option value="">All Levels</option>
                {QUIZ_LEVELS.map(level => (
                  <option key={level} value={level}>
                    {formatLevel(level)}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Skill</label>
              <select
                value={filters.skill}
                onChange={(e) => handleFilterChange('skill', e.target.value)}
              >
                <option value="">All Skills</option>
                {QUIZ_SKILLS.map(skill => (
                  <option key={skill} value={skill}>
                    {formatSkill(skill)}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Task</label>
              <select
                value={filters.task}
                onChange={(e) => handleFilterChange('task', e.target.value)}
              >
                <option value="">All Tasks</option>
                {QUIZ_TASKS.map(task => (
                  <option key={task} value={task}>
                    {formatTask(task)}
                  </option>
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

        {/* Performance Table */}
        {performance.length === 0 ? (
          <div className="empty-state">
            <p>No performance data available yet. Take some quizzes to see your performance here!</p>
            <Link to="/quiz" className="btn btn-primary">
              Go to Quiz
            </Link>
          </div>
        ) : (
          <div className="performance-table-container">
            <h2>Student Performance</h2>
            <div className="table-wrapper">
              <table className="performance-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Points</th>
                    <th>Quizzes</th>
                    <th>Sessions</th>
                    <th>Questions</th>
                    <th>Correct</th>
                    <th>Wrong</th>
                    <th>Success</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {performance.map((student, idx) => (
                    <React.Fragment key={student.studentName || idx}>
                      <tr className={expandedRows.has(student.studentName) ? 'expanded' : ''}>
                        <td className="student-name">{student.studentName}</td>
                        <td className="score">{student.totalPoints}</td>
                        <td>{student.totalQuizzes}</td>
                        <td>{student.totalSessions}</td>
                        <td>{student.totalQuestions}</td>
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
                                      <div className="session-badges">
                                        {session.level && (
                                          <span className="badge badge-level">
                                            {session.level}
                                          </span>
                                        )}
                                        {session.skill && (
                                          <span className="badge badge-skill">
                                            {session.skill}
                                          </span>
                                        )}
                                        {session.task && (
                                          <span className="badge badge-task">
                                            {session.task}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="session-meta">
                                      <span>Date: {new Date(session.date).toLocaleDateString()}</span>
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

export default Performance;

