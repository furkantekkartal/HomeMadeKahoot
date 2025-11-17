import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEdit, FaTrash, FaHourglassHalf } from 'react-icons/fa';
import { flashcardAPI } from '../services/api';
import { DECK_LEVELS, DECK_SKILLS, DECK_TASKS, formatLevel, formatSkill, formatTask } from '../constants/deckConstants';
import './Decks.css';

const Decks = () => {
  const navigate = useNavigate();
  const [decks, setDecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    loadDecks();
  }, [showHidden]);

  const loadDecks = async () => {
    try {
      setLoading(true);
      // Fetch all decks including hidden ones when showHidden is true
      const response = await flashcardAPI.getMyDecks(showHidden);
      setDecks(response.data || []);
    } catch (error) {
      console.error('Error loading decks:', error);
      alert('Failed to load decks: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (deckId, deckName) => {
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

  const handleEdit = (deck) => {
    navigate(`/edit-deck/${deck._id}`);
  };

  const handleToggleVisibility = async (deckId, currentVisibility) => {
    try {
      await flashcardAPI.toggleDeckVisibility(deckId);
      loadDecks();
    } catch (error) {
      console.error('Error toggling visibility:', error);
      alert('Failed to toggle visibility: ' + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="decks-container">
      <div className="decks-header">
        <h1>My Decks</h1>
        <div className="decks-header-controls">
          <label className="show-hidden-toggle">
            <input
              type="checkbox"
              checked={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
            />
            Show Hidden
          </label>
          <button
            onClick={() => navigate('/create-deck')}
            className="btn btn-primary"
          >
            + New Deck
          </button>
        </div>
      </div>

      {loading ? (
        <div className="decks-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', minHeight: '400px' }}>
          <FaHourglassHalf style={{ fontSize: '4rem', opacity: 0.6 }} />
        </div>
      ) : decks.length === 0 ? (
        <div className="decks-empty">
          <p>No decks found. Create your first deck to get started!</p>
          <button
            onClick={() => navigate('/create-deck')}
            className="btn btn-primary"
          >
            Create New Deck
          </button>
        </div>
      ) : (
        <div className="decks-grid">
          {decks.map(deck => (
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
                  onClick={() => handleToggleVisibility(deck._id, deck.isVisible)}
                  className={`btn btn-sm ${deck.isVisible ? 'btn-secondary' : 'btn-primary'}`}
                  title={deck.isVisible ? 'Hide from flashcards' : 'Show in flashcards'}
                >
                  {deck.isVisible ? '👁️ Hide' : '👁️‍🗨️ Show'}
                </button>
                <button
                  onClick={() => handleEdit(deck)}
                  className="btn btn-secondary btn-sm"
                  title="Edit deck"
                >
                  <FaEdit />
                </button>
                <button
                  onClick={() => handleDelete(deck._id, deck.name)}
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
    </div>
  );
};

export default Decks;

