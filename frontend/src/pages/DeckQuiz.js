import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEdit, FaTrash, FaHourglassHalf, FaIdCard, FaQuestionCircle, FaPlus } from 'react-icons/fa';
import { flashcardAPI, quizAPI, sessionAPI } from '../services/api';
import { DECK_LEVELS, DECK_SKILLS, DECK_TASKS, formatLevel, formatSkill, formatTask } from '../constants/deckConstants';
import { useAuth } from '../context/AuthContext';
import './DeckQuiz.css';

const DeckQuiz = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('decks'); // 'decks' or 'quizzes'
  
  // Filter state
  const [filters, setFilters] = useState({
    level: 'all',
    skill: 'all',
    task: 'all'
  });
  
  // Deck state
  const [decks, setDecks] = useState([]);
  const [decksLoading, setDecksLoading] = useState(true);
  const [showHidden, setShowHidden] = useState(false);
  
  // Quiz state
  const [allQuizzes, setAllQuizzes] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [quizzesLoading, setQuizzesLoading] = useState(true);
  const [hostingQuizId, setHostingQuizId] = useState(null);
  const [creatingSession, setCreatingSession] = useState(null);
  const [sessionFilter, setSessionFilter] = useState('all'); // 'all', 'completed', 'active', 'waiting'

  useEffect(() => {
    if (activeTab === 'decks') {
      loadDecks();
    } else {
      loadQuizzes();
    }
  }, [activeTab, showHidden]);

  const loadDecks = async () => {
    try {
      setDecksLoading(true);
      const response = await flashcardAPI.getMyDecks(showHidden);
      setDecks(response.data || []);
    } catch (error) {
      console.error('Error loading decks:', error);
      alert('Failed to load decks: ' + (error.response?.data?.message || error.message));
    } finally {
      setDecksLoading(false);
    }
  };

  const loadQuizzes = async () => {
    try {
      setQuizzesLoading(true);
      const [quizzesRes, sessionsRes] = await Promise.all([
        quizAPI.getAll(showHidden), // Get quizzes based on showHidden
        sessionAPI.getMySessions()
      ]);
      setAllQuizzes(quizzesRes.data);
      setRecentSessions(sessionsRes.data);
    } catch (error) {
      console.error('Error loading quizzes:', error);
      alert('Failed to load quizzes: ' + (error.response?.data?.message || error.message));
    } finally {
      setQuizzesLoading(false);
    }
  };

  // Deck handlers
  const handleDeleteDeck = async (deckId, deckName) => {
    if (!window.confirm(`Are you sure you want to delete "${deckName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await flashcardAPI.deleteDeck(deckId);
      alert('Deck deleted successfully');
      loadDecks();
    } catch (error) {
      console.error('Error deleting deck:', error);
      alert('Failed to delete deck: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleEditDeck = (deck) => {
    navigate(`/edit-deck/${deck._id}`);
  };

  const handleToggleVisibility = async (deckId) => {
    try {
      await flashcardAPI.toggleDeckVisibility(deckId);
      loadDecks();
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

  // Quiz handlers
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
    if (event && event.defaultPrevented) {
      return;
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

      navigate(`/host/${session._id}`);
    } catch (error) {
      console.error('Error creating session:', error);
      alert(`Error creating session: ${error.response?.data?.message || error.message}`);
      setHostingQuizId(null);
    }
  };

  const handleToggleQuizVisibility = async (quizId) => {
    try {
      await quizAPI.toggleQuizVisibility(quizId);
      loadQuizzes();
    } catch (error) {
      console.error('Error toggling visibility:', error);
      alert('Failed to toggle visibility: ' + (error.response?.data?.message || error.message));
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

  // Filter decks
  const filteredDecks = decks.filter(deck => {
    if (filters.level !== 'all' && deck.level !== filters.level) return false;
    if (filters.skill !== 'all' && deck.skill !== filters.skill) return false;
    if (filters.task !== 'all' && deck.task !== filters.task) return false;
    return true;
  });

  // Filter quizzes
  const filteredQuizzes = allQuizzes.filter(quiz => {
    // Filter by visibility if showHidden is false
    if (!showHidden && quiz.isVisible === false) {
      return false;
    }
    // Use new fields (level, skill, task) if available, fallback to legacy fields
    const quizLevel = quiz.level || (quiz.difficulty === 'beginner' ? 'A1' : quiz.difficulty === 'intermediate' ? 'B1' : quiz.difficulty === 'advanced' ? 'C1' : 'A1');
    const quizSkill = quiz.skill || (quiz.category === 'reading' ? 'Reading' : quiz.category === 'listening' ? 'Listening' : 'Reading');
    const quizTask = quiz.task || (quiz.category === 'vocabulary' ? 'Vocabulary' : quiz.category === 'grammar' ? 'Grammar' : 'Vocabulary');
    
    if (filters.level !== 'all' && quizLevel !== filters.level) return false;
    if (filters.skill !== 'all' && quizSkill !== filters.skill) return false;
    if (filters.task !== 'all' && quizTask !== filters.task) return false;
    return true;
  });

  const filteredSessions = sessionFilter === 'all' 
    ? recentSessions 
    : recentSessions.filter(session => session.status === sessionFilter);

  return (
    <div className="deck-quiz-container">
      <div className="deck-quiz-header">
        <h1>Deck/Quiz</h1>
        <div className="header-controls">
          <button
            onClick={() => navigate(activeTab === 'decks' ? '/create-deck' : '/create-quiz')}
            className="btn btn-primary"
          >
            <FaPlus /> {activeTab === 'decks' ? 'New Deck' : 'New Quiz'}
          </button>
          <div className="deck-quiz-tabs">
            <button
              className={`tab-button ${activeTab === 'decks' ? 'active' : ''}`}
              onClick={() => setActiveTab('decks')}
            >
              <FaIdCard /> Decks
            </button>
            <button
              className={`tab-button ${activeTab === 'quizzes' ? 'active' : ''}`}
              onClick={() => setActiveTab('quizzes')}
            >
              <FaQuestionCircle /> Quizzes
            </button>
          </div>
          <div className="filters">
            <select
              className="filter-select"
              value={filters.level}
              onChange={(e) => setFilters({ ...filters, level: e.target.value })}
            >
              <option value="all">All Levels</option>
              {DECK_LEVELS.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
            <select
              className="filter-select"
              value={filters.skill}
              onChange={(e) => setFilters({ ...filters, skill: e.target.value })}
            >
              <option value="all">All Skills</option>
              {DECK_SKILLS.map(skill => (
                <option key={skill} value={skill}>{skill}</option>
              ))}
            </select>
            <select
              className="filter-select"
              value={filters.task}
              onChange={(e) => setFilters({ ...filters, task: e.target.value })}
            >
              <option value="all">All Tasks</option>
              {DECK_TASKS.map(task => (
                <option key={task} value={task}>{task}</option>
              ))}
            </select>
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
      </div>
      
      <div className="deck-quiz-content">

      {activeTab === 'decks' ? (
        <>
          {decksLoading ? (
            <div className="decks-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', minHeight: '400px' }}>
              <FaHourglassHalf style={{ fontSize: '4rem', opacity: 0.6 }} />
            </div>
          ) : filteredDecks.length === 0 ? (
            <div className="decks-empty">
              <p>{decks.length === 0 ? 'No decks found. Create your first deck to get started!' : 'No decks found matching your filters.'}</p>
              {decks.length === 0 && (
                <button
                  onClick={() => navigate('/create-deck')}
                  className="btn btn-primary"
                >
                  Create New Deck
                </button>
              )}
            </div>
          ) : (
            <div className="decks-grid">
              {filteredDecks.map(deck => (
                <div key={deck._id} className={`deck-card ${!deck.isVisible ? 'deck-hidden' : ''}`}>
                  <div className="deck-card-header">
                    <h3>{deck.name}</h3>
                    {!deck.isVisible && (
                      <span className="deck-hidden-badge">Hidden</span>
                    )}
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
                    {deck.lastStudied && (
                      <div className="deck-stat">
                        <span className="deck-stat-label">Last Studied:</span>
                        <span className="deck-stat-value">
                          {new Date(deck.lastStudied).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="deck-actions">
                    <button
                      onClick={() => handlePlayFlashcards(deck._id)}
                      className="btn btn-primary btn-sm"
                      title="Play Flashcards"
                    >
                      📚
                    </button>
                    <button
                      onClick={() => handlePlaySpelling(deck._id)}
                      className="btn btn-success btn-sm"
                      title="Play Spelling"
                    >
                      ⌨️
                    </button>
                    <button
                      onClick={() => handleToggleVisibility(deck._id)}
                      className={`btn btn-sm ${deck.isVisible ? 'btn-secondary' : 'btn-primary'}`}
                      title={deck.isVisible ? 'Hide from flashcards' : 'Show in flashcards'}
                    >
                      {deck.isVisible ? '👁️' : '👁️‍🗨️'}
                    </button>
                    <button
                      onClick={() => handleEditDeck(deck)}
                      className="btn btn-secondary btn-sm"
                      title="Edit deck"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDeleteDeck(deck._id, deck.name)}
                      className="btn btn-danger btn-sm"
                      title="Delete deck"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="quiz-grid-layout">
            <div className="quiz-section">
              <h2>All Quizzes ({filteredQuizzes.length})</h2>
              {quizzesLoading ? (
                <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', minHeight: '400px' }}>
                  <FaHourglassHalf style={{ fontSize: '4rem', opacity: 0.6 }} />
                </div>
              ) : filteredQuizzes.length === 0 ? (
                <div className="empty-state">
                  <p>{allQuizzes.length === 0 ? 'No quizzes available.' : 'No quizzes found matching your filters.'}</p>
                  {allQuizzes.length === 0 && (
                    <button
                      onClick={() => navigate('/create-quiz')}
                      className="btn btn-primary"
                    >
                      Create New Quiz
                    </button>
                  )}
                </div>
              ) : (
                <div className="quiz-grid">
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
                          title={creatingSession === quiz._id ? 'Starting...' : 'Take Quiz'}
                        >
                          {creatingSession === quiz._id ? '⏳' : '🎮'}
                        </button>
                        <button
                          onClick={(e) => handleHostQuiz(quiz._id, e)}
                          className="btn btn-success btn-sm"
                          disabled={hostingQuizId === quiz._id}
                          title={hostingQuizId === quiz._id ? 'Creating...' : 'Host Quiz'}
                        >
                          {hostingQuizId === quiz._id ? '⏳' : '🎯'}
                        </button>
                        {user && quiz.creatorId && (quiz.creatorId._id === user._id || quiz.creatorId === user._id) && (
                          <button
                            onClick={() => handleToggleQuizVisibility(quiz._id)}
                            className={`btn btn-sm ${quiz.isVisible ? 'btn-secondary' : 'btn-primary'}`}
                            title={quiz.isVisible ? 'Hide quiz' : 'Show quiz'}
                          >
                            {quiz.isVisible ? '👁️' : '👁️‍🗨️'}
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/edit-quiz/${quiz._id}`)}
                          className="btn btn-secondary btn-sm"
                          title="Edit quiz"
                        >
                          <FaEdit />
                        </button>
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
      )}
      </div>
    </div>
  );
};

export default DeckQuiz;

