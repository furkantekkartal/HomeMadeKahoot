import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizAPI, sessionAPI, flashcardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DECK_LEVELS, DECK_SKILLS, DECK_TASKS, formatLevel, formatSkill, formatTask } from '../constants/deckConstants';
import { QUIZ_LEVELS, QUIZ_SKILLS, QUIZ_TASKS } from '../constants/quizConstants';
import './BrowseQuizzes.css';

const BrowseQuizzes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('quizzes'); // 'quizzes' or 'decks'
  const [quizzes, setQuizzes] = useState([]);
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingSession, setCreatingSession] = useState(null);
  const [showHidden, setShowHidden] = useState(false);
  const [filters, setFilters] = useState({
    level: 'all',
    skill: 'all',
    task: 'all'
  });

  useEffect(() => {
    loadData();
  }, [showHidden, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'quizzes') {
        const response = await quizAPI.getAll(showHidden);
        setQuizzes(response.data || []);
      } else {
        const response = await flashcardAPI.getMyDecks(showHidden);
        setDecks(response.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load data: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleTakeQuiz = async (quizId, event) => {
    event.preventDefault();
    setCreatingSession(quizId);
    
    try {
      const response = await sessionAPI.createSession({ quizId });
      const session = response.data;
      
      if (!session || !session._id) {
        alert('Failed to create session. Please try again.');
        setCreatingSession(null);
        return;
      }

      const username = user?.username || `User${Math.floor(Math.random() * 1000)}`;
      
      navigate(`/play/${session._id}`, { 
        state: { 
          username,
          autoStart: true
        } 
      });
    } catch (error) {
      console.error('Error creating session:', error);
      alert(`Error creating session: ${error.response?.data?.message || error.message}`);
      setCreatingSession(null);
    }
  };

  const handleToggleQuizVisibility = async (quizId) => {
    try {
      await quizAPI.toggleQuizVisibility(quizId);
      loadData();
    } catch (error) {
      console.error('Error toggling visibility:', error);
      alert('Failed to toggle visibility: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleToggleDeckVisibility = async (deckId) => {
    try {
      await flashcardAPI.toggleDeckVisibility(deckId);
      loadData();
    } catch (error) {
      console.error('Error toggling visibility:', error);
      alert('Failed to toggle visibility: ' + (error.response?.data?.message || error.message));
    }
  };

  const handlePlayFlashcards = (deckId) => {
    navigate('/flashcards', { state: { deckId } });
  };

  const handlePlaySpelling = (deckId) => {
    navigate('/spelling', { state: { deckId } });
  };

  const filteredQuizzes = quizzes.filter(quiz => {
    // Use new fields (level, skill, task) if available, fallback to legacy fields
    const quizLevel = quiz.level || (quiz.difficulty === 'beginner' ? 'A1' : quiz.difficulty === 'intermediate' ? 'B1' : quiz.difficulty === 'advanced' ? 'C1' : 'A1');
    const quizSkill = quiz.skill || (quiz.category === 'reading' ? 'Reading' : quiz.category === 'listening' ? 'Listening' : 'Reading');
    const quizTask = quiz.task || (quiz.category === 'vocabulary' ? 'Vocabulary' : quiz.category === 'grammar' ? 'Grammar' : 'Vocabulary');
    
    if (filters.level !== 'all' && quizLevel !== filters.level) return false;
    if (filters.skill !== 'all' && quizSkill !== filters.skill) return false;
    if (filters.task !== 'all' && quizTask !== filters.task) return false;
    return true;
  });

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="browse-quizzes">
      <div className="browse-header">
        <h1>Browse</h1>
        <div className="browse-controls">
          <div className="tabs">
            <button
              className={`tab-button ${activeTab === 'quizzes' ? 'active' : ''}`}
              onClick={() => setActiveTab('quizzes')}
            >
              Quizzes
            </button>
            <button
              className={`tab-button ${activeTab === 'decks' ? 'active' : ''}`}
              onClick={() => setActiveTab('decks')}
            >
              Decks
            </button>
          </div>
          {activeTab === 'quizzes' && (
            <div className="filters">
              <select
                className="filter-select"
                value={filters.level}
                onChange={(e) => setFilters({ ...filters, level: e.target.value })}
              >
                <option value="all">All Levels</option>
                {QUIZ_LEVELS.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              <select
                className="filter-select"
                value={filters.skill}
                onChange={(e) => setFilters({ ...filters, skill: e.target.value })}
              >
                <option value="all">All Skills</option>
                {QUIZ_SKILLS.map(skill => (
                  <option key={skill} value={skill}>{skill}</option>
                ))}
              </select>
              <select
                className="filter-select"
                value={filters.task}
                onChange={(e) => setFilters({ ...filters, task: e.target.value })}
              >
                <option value="all">All Tasks</option>
                {QUIZ_TASKS.map(task => (
                  <option key={task} value={task}>{task}</option>
                ))}
              </select>
            </div>
          )}
          <label className="show-hidden-toggle">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
            />
            Show Hidden
          </label>
        </div>
      </div>

      {activeTab === 'quizzes' ? (
        <>
          {filteredQuizzes.length === 0 ? (
            <div className="empty-state card">
              <p>No quizzes found matching your filters.</p>
            </div>
          ) : (
            <div className="quizzes-grid">
              {filteredQuizzes.map(quiz => (
                <div key={quiz._id} className={`quiz-card ${!quiz.isVisible ? 'item-hidden' : ''}`}>
                  <div className="quiz-card-header">
                    <h3>{quiz.title}</h3>
                    <div className="header-badges">
                      {!quiz.isVisible && (
                        <span className="hidden-badge">Hidden</span>
                      )}
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
                      onClick={(e) => handleTakeQuiz(quiz._id, e)}
                      className="btn btn-primary btn-sm"
                      disabled={creatingSession === quiz._id}
                    >
                      {creatingSession === quiz._id ? 'Starting...' : 'Take Quiz'}
                    </button>
                    {user && quiz.creatorId && (quiz.creatorId._id === user._id || quiz.creatorId === user._id) && (
                      <button
                        onClick={() => handleToggleQuizVisibility(quiz._id)}
                        className={`btn btn-sm ${quiz.isVisible ? 'btn-secondary' : 'btn-primary'}`}
                        title={quiz.isVisible ? 'Hide quiz' : 'Show quiz'}
                      >
                        {quiz.isVisible ? '👁️ Hide' : '👁️‍🗨️ Show'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {decks.length === 0 ? (
            <div className="empty-state card">
              <p>No decks found. Create your first deck to get started!</p>
            </div>
          ) : (
            <div className="decks-grid">
              {decks.map(deck => (
                <div key={deck._id} className={`deck-card ${!deck.isVisible ? 'item-hidden' : ''}`}>
                  <div className="deck-card-header">
                    <h3>{deck.name}</h3>
                    <div className="header-badges">
                      {!deck.isVisible && (
                        <span className="hidden-badge">Hidden</span>
                      )}
                    </div>
                  </div>
                  
                  {deck.description && (
                    <p className="deck-description">{deck.description}</p>
                  )}
                  
                  <div className="deck-meta">
                    {deck.level && (
                      <span className="deck-badge">Level: {formatLevel(deck.level)}</span>
                    )}
                    {deck.skill && (
                      <span className="deck-badge">Skill: {formatSkill(deck.skill)}</span>
                    )}
                    {deck.task && (
                      <span className="deck-badge">Task: {formatTask(deck.task)}</span>
                    )}
                  </div>
                  
                  <div className="deck-stats">
                    <div className="deck-stat">
                      <span className="deck-stat-label">Cards:</span>
                      <span className="deck-stat-value">{deck.totalCards || 0}</span>
                    </div>
                    <div className="deck-stat">
                      <span className="deck-stat-label">Mastered:</span>
                      <span className="deck-stat-value">{deck.masteredCards || 0}</span>
                    </div>
                  </div>
                  
                  <div className="deck-actions">
                    <button
                      onClick={() => handlePlayFlashcards(deck._id)}
                      className="btn btn-primary btn-sm"
                    >
                      📚 Flashcard
                    </button>
                    <button
                      onClick={() => handlePlaySpelling(deck._id)}
                      className="btn btn-success btn-sm"
                    >
                      ⌨️ Spelling
                    </button>
                    <button
                      onClick={() => handleToggleDeckVisibility(deck._id)}
                      className={`btn btn-sm ${deck.isVisible ? 'btn-secondary' : 'btn-primary'}`}
                      title={deck.isVisible ? 'Hide deck' : 'Show deck'}
                    >
                      {deck.isVisible ? '👁️ Hide' : '👁️‍🗨️ Show'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BrowseQuizzes;
