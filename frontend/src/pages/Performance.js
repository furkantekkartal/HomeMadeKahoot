import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sessionAPI, pronunciationAPI } from '../services/api';
import { QUIZ_LEVELS, QUIZ_SKILLS, QUIZ_TASKS, formatLevel, formatSkill, formatTask } from '../constants/quizConstants';
import { FaHourglassHalf } from 'react-icons/fa';
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
    totalStudents: 0,
    quizSuccess: 0,
    quizTotalPoints: 0,
    quizTotalCompleted: 0,
    gameTotalTime: 0,
    gameFlashcardCompleted: 0,
    gameSpellingCompleted: 0,
    pronunciationAvgOverall: 0,
    pronunciationTotalWords: 0,
    pronunciationTotalSentences: 0
  });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [gameStats, setGameStats] = useState([]);
  const [gameTotals, setGameTotals] = useState({
    totalStudents: 0,
    totalFlashcardsSessions: 0,
    totalSpellingSessions: 0,
    totalSessions: 0,
    totalHours: 0
  });
  const [pronunciationStats, setPronunciationStats] = useState([]);
  const [pronunciationTotals, setPronunciationTotals] = useState({
    totalStudents: 0,
    totalWords: 0,
    totalSentences: 0
  });
  const [expandedPronunciationRows, setExpandedPronunciationRows] = useState(new Set());
  const [expandedWordDetails, setExpandedWordDetails] = useState(new Set());
  const [expandedSentenceDetails, setExpandedSentenceDetails] = useState(new Set());
  const [resettingGameStats, setResettingGameStats] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    loadAllData();
  }, [appliedFilters]);

  const loadAllData = async () => {
    await Promise.all([
      loadPerformance(),
      loadGameStats(),
      loadPronunciationStats()
    ]);
  };

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
      const perfData = response.data.performance || [];
      setPerformance(perfData);
      
      // Calculate quiz performance summary
      const totalStudents = perfData.length;
      const totalQuestions = perfData.reduce((sum, p) => sum + (p.totalQuestions || 0), 0);
      const totalCorrect = perfData.reduce((sum, p) => sum + (p.totalCorrect || 0), 0);
      const quizSuccess = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
      const quizTotalPoints = perfData.reduce((sum, p) => sum + (p.totalPoints || 0), 0);
      const quizTotalCompleted = response.data.totalQuizzes || 0;
      
      setSummary(prev => ({
        ...prev,
        totalStudents,
        quizSuccess,
        quizTotalPoints,
        quizTotalCompleted
      }));
    } catch (error) {
      console.error('Error loading performance:', error);
      alert('Failed to load performance data: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const loadGameStats = async () => {
    try {
      // Use main filters for game stats
      const activeFilters = Object.entries(appliedFilters).reduce((acc, [key, value]) => {
        if (value && value !== '' && (key === 'studentName' || key === 'dateFrom' || key === 'dateTo')) {
          acc[key] = value;
        }
        return acc;
      }, {});
      
      const response = await sessionAPI.getGameStats(activeFilters);
      setGameStats(response.data.gameStats || []);
      const totals = response.data.totals || {
        totalStudents: 0,
        totalFlashcardsSessions: 0,
        totalSpellingSessions: 0,
        totalSessions: 0,
        totalHours: 0
      };
      setGameTotals(totals);
      
      // Calculate game performance summary
      const gameTotalTime = totals.totalHours || 0;
      const gameFlashcardCompleted = totals.totalFlashcardsSessions || 0;
      const gameSpellingCompleted = totals.totalSpellingSessions || 0;
      
      setSummary(prev => ({
        ...prev,
        gameTotalTime,
        gameFlashcardCompleted,
        gameSpellingCompleted
      }));
    } catch (error) {
      console.error('Error loading game stats:', error);
      // Don't show alert for game stats, just log error
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

  const handleResetGamePerformance = async () => {
    if (!window.confirm('Are you sure you want to reset all game performance statistics? This will delete all Flashcards and Spelling session data. This action cannot be undone.')) {
      return;
    }

    try {
      setResettingGameStats(true);
      const response = await sessionAPI.resetGamePerformance();
      
      if (response.data.success) {
        alert(`Successfully reset game performance statistics. Deleted ${response.data.deletedCount} sessions.`);
        // Reload game stats to show empty state
        await loadGameStats();
      }
    } catch (error) {
      console.error('Error resetting game performance:', error);
      alert('Failed to reset game performance: ' + (error.response?.data?.message || error.message));
    } finally {
      setResettingGameStats(false);
    }
  };


  const loadPronunciationStats = async () => {
    try {
      // Use main filters for pronunciation stats
      const activeFilters = Object.entries(appliedFilters).reduce((acc, [key, value]) => {
        if (value && value !== '' && (key === 'studentName' || key === 'dateFrom' || key === 'dateTo')) {
          acc[key] = value;
        }
        return acc;
      }, {});
      
      const response = await pronunciationAPI.getPronunciationStats(activeFilters);
      const stats = response.data.stats || [];
      setPronunciationStats(stats);
      const totals = response.data.totals || {
        totalStudents: 0,
        totalWords: 0,
        totalSentences: 0
      };
      setPronunciationTotals(totals);
      
      // Calculate pronunciation performance summary
      const pronunciationTotalWords = totals.totalWords || 0;
      const pronunciationTotalSentences = totals.totalSentences || 0;
      
      // Calculate average overall score (sum of all students' overall scores / student count)
      const totalOverallScore = stats.reduce((sum, s) => sum + (s.overall.averageScores.generalScore || 0), 0);
      const pronunciationAvgOverall = stats.length > 0 ? Math.round(totalOverallScore / stats.length) : 0;
      
      setSummary(prev => ({
        ...prev,
        pronunciationAvgOverall,
        pronunciationTotalWords,
        pronunciationTotalSentences
      }));
    } catch (error) {
      console.error('Error loading pronunciation stats:', error);
      // Don't show alert for pronunciation stats, just log error
    }
  };


  const togglePronunciationRow = (studentName) => {
    const newExpanded = new Set(expandedPronunciationRows);
    if (newExpanded.has(studentName)) {
      newExpanded.delete(studentName);
    } else {
      newExpanded.add(studentName);
    }
    setExpandedPronunciationRows(newExpanded);
  };

  const toggleWordDetails = (studentName) => {
    const newExpanded = new Set(expandedWordDetails);
    if (newExpanded.has(studentName)) {
      newExpanded.delete(studentName);
    } else {
      newExpanded.add(studentName);
    }
    setExpandedWordDetails(newExpanded);
  };

  const toggleSentenceDetails = (studentName) => {
    const newExpanded = new Set(expandedSentenceDetails);
    if (newExpanded.has(studentName)) {
      newExpanded.delete(studentName);
    } else {
      newExpanded.add(studentName);
    }
    setExpandedSentenceDetails(newExpanded);
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

  const hasActiveFilters = Object.values(appliedFilters).some(v => v !== '');

  return (
    <div className="performance-container">
      <div className="performance-header">
        <h1>Student Performance</h1>
        <Link to="/quiz" className="btn btn-secondary">
          Back to Quiz
        </Link>
      </div>

      <div className="performance-content-wrapper">
        <div className="performance-content">
        {/* Simplified Summary Cards - Only Key Metrics */}
        <div className="summary-cards-simple">
          <div className="summary-card-simple">
            <div className="summary-card-icon">👥</div>
            <div className="summary-card-content">
              <div className="summary-card-value">
                {loading ? <FaHourglassHalf style={{ fontSize: '2rem', opacity: 0.7 }} /> : summary.totalStudents}
              </div>
              <div className="summary-card-label">Total Students</div>
            </div>
          </div>
          
          <div className="summary-card-simple">
            <div className="summary-card-icon">📊</div>
            <div className="summary-card-content">
              <div className="summary-card-value">
                {loading ? <FaHourglassHalf style={{ fontSize: '2rem', opacity: 0.7 }} /> : `${summary.quizSuccess}%`}
              </div>
              <div className="summary-card-label">Quiz Success Rate</div>
            </div>
          </div>
          
          <div className="summary-card-simple">
            <div className="summary-card-icon">✅</div>
            <div className="summary-card-content">
              <div className="summary-card-value">
                {loading ? <FaHourglassHalf style={{ fontSize: '2rem', opacity: 0.7 }} /> : summary.quizTotalCompleted}
              </div>
              <div className="summary-card-label">Quizzes Completed</div>
            </div>
          </div>
          
          <div className="summary-card-simple">
            <div className="summary-card-icon">⏱️</div>
            <div className="summary-card-content">
              <div className="summary-card-value">
                {loading ? <FaHourglassHalf style={{ fontSize: '2rem', opacity: 0.7 }} /> : `${summary.gameTotalTime}h`}
              </div>
              <div className="summary-card-label">Total Study Time</div>
            </div>
          </div>
          
          <div className="summary-card-simple">
            <div className="summary-card-icon">🎯</div>
            <div className="summary-card-content">
              <div className="summary-card-value">
                {loading ? <FaHourglassHalf style={{ fontSize: '2rem', opacity: 0.7 }} /> : summary.pronunciationAvgOverall}
              </div>
              <div className="summary-card-label">Avg Pronunciation Score</div>
            </div>
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
              <label>Quiz/Deck Name</label>
              <input
                type="text"
                placeholder="Search by quiz or deck name..."
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

            <div className="filter-actions-inline">
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
        </div>

        {/* Quiz Performance Table */}
        <div className="quiz-performance-container">
          {performance.length === 0 ? (
            <div className="empty-state">
              <p>No performance data available yet. Take some quizzes to see your performance here!</p>
              <Link to="/quiz" className="btn btn-primary">
                Go to Quiz
              </Link>
            </div>
          ) : (
            <div className="performance-table-container">
              <h2>Quiz Performance</h2>
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
                        <td>
                          <span className={`accuracy accuracy-${student.successPercentage >= 70 ? 'high' : student.successPercentage >= 40 ? 'medium' : 'low'}`}>
                            {student.successPercentage}%
                          </span>
                        </td>
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

        {/* Game Stats Section */}
        <div className="game-stats-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Game Performance</h2>
            <button
              onClick={handleResetGamePerformance}
              disabled={resettingGameStats}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: resettingGameStats ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
                opacity: resettingGameStats ? 0.6 : 1,
                transition: 'opacity 0.2s'
              }}
              title="Reset all game performance statistics (DEV only)"
            >
              {resettingGameStats ? 'Resetting...' : 'Reset Game Stats'}
            </button>
          </div>
          
          {/* Game Stats Table */}
          {gameStats.length === 0 ? (
            <div className="empty-state">
              <p>No game performance data available yet.</p>
            </div>
          ) : (
            <div className="performance-table-container">
              <div className="table-wrapper">
                <table className="performance-table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>
                        <div>Flashcards</div>
                        <div>Sessions</div>
                      </th>
                      <th>
                        <div>Flashcards</div>
                        <div>Time (Minutes)</div>
                      </th>
                      <th>
                        <div>Spelling</div>
                        <div>Sessions</div>
                      </th>
                      <th>
                        <div>Spelling</div>
                        <div>Time (Minutes)</div>
                      </th>
                      <th>
                        <div>Total</div>
                        <div>Sessions</div>
                      </th>
                      <th>
                        <div>Total</div>
                        <div>Time (Minutes)</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {gameStats.map((student, idx) => (
                      <tr key={student.studentName || idx}>
                        <td className="student-name">{student.studentName}</td>
                        <td>{student.flashcards.sessions}</td>
                        <td>{student.flashcards.totalMinutes}</td>
                        <td>{student.spelling.sessions}</td>
                        <td>{student.spelling.totalMinutes}</td>
                        <td>{student.totalSessions}</td>
                        <td className="score">{student.totalMinutes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Pronunciation Stats Section */}
        <div className="pronunciation-stats-container">
          <h2>Pronunciation Performance</h2>
          
          {/* Pronunciation Stats Table */}
          {pronunciationStats.length === 0 ? (
            <div className="empty-state">
              <p>No pronunciation performance data available yet.</p>
            </div>
          ) : (
            <div className="performance-table-container">
              <div className="table-wrapper">
                <table className="performance-table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th className="group-separator">Overall Avg Score</th>
                      <th className="group-separator">Word</th>
                      <th className="group-separator">Sentences</th>
                      <th className="group-separator">Word Details</th>
                      <th>Sentence Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pronunciationStats.map((student, idx) => (
                      <React.Fragment key={student.studentName || idx}>
                        <tr className={expandedPronunciationRows.has(student.studentName) ? 'expanded' : ''}>
                          <td className="student-name">{student.studentName}</td>
                          <td className="score group-separator">{student.overall.averageScores.generalScore}</td>
                          <td className="group-separator stacked-cell">
                            <div className="stacked-top">{student.word.totalWords}</div>
                            <div className="stacked-bottom score">{student.word.averageScores.generalScore}</div>
                          </td>
                          <td className="group-separator stacked-cell">
                            <div className="stacked-top">{student.sentence.totalSentences}</div>
                            <div className="stacked-bottom score">{student.sentence.averageScores.generalScore}</div>
                          </td>
                          <td className="group-separator">
                            {student.word.totalWords > 0 && (
                              <button
                                onClick={() => toggleWordDetails(student.studentName)}
                                className="btn btn-small"
                              >
                                {expandedWordDetails.has(student.studentName) ? '▼ Hide' : '▶ Show'}
                              </button>
                            )}
                          </td>
                          <td>
                            {student.sentence.totalSentences > 0 && (
                              <button
                                onClick={() => toggleSentenceDetails(student.studentName)}
                                className="btn btn-small"
                              >
                                {expandedSentenceDetails.has(student.studentName) ? '▼ Hide' : '▶ Show'}
                              </button>
                            )}
                          </td>
                        </tr>
                        {/* Word Details Row */}
                        {expandedWordDetails.has(student.studentName) && student.word.totalWords > 0 && (
                          <tr className="detail-row">
                            <td colSpan="6">
                              <div className="session-details">
                                <div className="pronunciation-items-list">
                                  {student.word.itemsList.map((item, itemIdx) => (
                                    <div key={itemIdx} className="pronunciation-item-card">
                                      <div className="pronunciation-item-header">
                                        <div className="word-analysis">
                                          {item.wordAnalysis && item.wordAnalysis.length > 0 ? (
                                            item.wordAnalysis.map((wordItem, wIdx) => {
                                              const statusTooltips = {
                                                'matched': 'Matched: Word was pronounced correctly',
                                                'missing': 'Missing: Word was not pronounced',
                                                'wrong': 'Wrong: Word was mispronounced'
                                              };
                                              return (
                                                <span
                                                  key={wIdx}
                                                  className={`word-status word-${wordItem.status}`}
                                                  title={statusTooltips[wordItem.status] || wordItem.status}
                                                >
                                                  {wordItem.word}
                                                </span>
                                              );
                                            })
                                          ) : (
                                            <span className="word-status word-matched" title="Matched: Word was pronounced correctly">{item.referenceText}</span>
                                          )}
                                        </div>
                                        <div className="pronunciation-scores">
                                          <span className="score-overall" title="Overall Score: Average of all pronunciation metrics">🎯 {item.overallScore}</span>
                                          <span className="score-pronunciation" title="Pronunciation Score: Accuracy of word pronunciation">🗣️ {item.pronunciationScore}</span>
                                          <span className="score-fluency" title="Oral Fluency Score: Flow and rhythm of speech">⚡ {item.oralFluencyScore}</span>
                                          <span className="score-content" title="Content Score: Completeness of the spoken text">📄 {item.contentScore}</span>
                                          <span className="pronunciation-date-spacer"></span>
                                          <span className="pronunciation-date">{new Date(item.date).toLocaleDateString()}</span>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}

                        {/* Sentence Details Row */}
                        {expandedSentenceDetails.has(student.studentName) && student.sentence.totalSentences > 0 && (
                          <tr className="detail-row">
                            <td colSpan="6">
                              <div className="session-details">
                                <div className="pronunciation-items-list">
                                  {student.sentence.itemsList.map((item, itemIdx) => (
                                    <div key={itemIdx} className="pronunciation-item-card">
                                      <div className="pronunciation-item-header">
                                        <div className="word-analysis">
                                          {item.wordAnalysis && item.wordAnalysis.length > 0 ? (
                                            item.wordAnalysis.map((wordItem, wIdx) => {
                                              const statusTooltips = {
                                                'matched': 'Matched: Word was pronounced correctly',
                                                'missing': 'Missing: Word was not pronounced',
                                                'wrong': 'Wrong: Word was mispronounced'
                                              };
                                              return (
                                                <span
                                                  key={wIdx}
                                                  className={`word-status word-${wordItem.status}`}
                                                  title={statusTooltips[wordItem.status] || wordItem.status}
                                                >
                                                  {wordItem.word}
                                                </span>
                                              );
                                            })
                                          ) : (
                                            <span className="word-status word-matched" title="Matched: Word was pronounced correctly">{item.referenceText}</span>
                                          )}
                                        </div>
                                        <div className="pronunciation-scores">
                                          <span className="score-overall" title="Overall Score: Average of all pronunciation metrics">🎯 {item.overallScore}</span>
                                          <span className="score-pronunciation" title="Pronunciation Score: Accuracy of word pronunciation">🗣️ {item.pronunciationScore}</span>
                                          <span className="score-fluency" title="Oral Fluency Score: Flow and rhythm of speech">⚡ {item.oralFluencyScore}</span>
                                          <span className="score-content" title="Content Score: Completeness of the spoken text">📄 {item.contentScore}</span>
                                          <span className="pronunciation-date-spacer"></span>
                                          <span className="pronunciation-date">{new Date(item.date).toLocaleDateString()}</span>
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
        
        {/* Right Sidebar - Filter Summary */}
        {hasActiveFilters && (
          <div className="performance-sidebar">
            <h3>Active Filters</h3>
            <div className="sidebar-filters">
              {appliedFilters.studentName && (
                <div className="sidebar-filter-item">
                  <span className="sidebar-filter-label">Student:</span>
                  <span className="sidebar-filter-value">{appliedFilters.studentName}</span>
                </div>
              )}
              {appliedFilters.quizName && (
                <div className="sidebar-filter-item">
                  <span className="sidebar-filter-label">Quiz:</span>
                  <span className="sidebar-filter-value">{appliedFilters.quizName}</span>
                </div>
              )}
              {appliedFilters.level && (
                <div className="sidebar-filter-item">
                  <span className="sidebar-filter-label">Level:</span>
                  <span className="sidebar-filter-value">{formatLevel(appliedFilters.level)}</span>
                </div>
              )}
              {appliedFilters.skill && (
                <div className="sidebar-filter-item">
                  <span className="sidebar-filter-label">Skill:</span>
                  <span className="sidebar-filter-value">{formatSkill(appliedFilters.skill)}</span>
                </div>
              )}
              {appliedFilters.task && (
                <div className="sidebar-filter-item">
                  <span className="sidebar-filter-label">Task:</span>
                  <span className="sidebar-filter-value">{formatTask(appliedFilters.task)}</span>
                </div>
              )}
              {(appliedFilters.dateFrom || appliedFilters.dateTo) && (
                <div className="sidebar-filter-item">
                  <span className="sidebar-filter-label">Date Range:</span>
                  <span className="sidebar-filter-value">
                    {appliedFilters.dateFrom || 'Any'} - {appliedFilters.dateTo || 'Any'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Performance;

