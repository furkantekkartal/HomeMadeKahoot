import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { flashcardAPI, wordAPI } from '../services/api';
import { DECK_LEVELS, DECK_SKILLS, DECK_TASKS, formatLevel, formatSkill, formatTask } from '../constants/deckConstants';
import { useWordList } from '../context/WordListContext';
import WordList from '../components/WordList/WordList';
import './EditDeck.css';

const EditDeck = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { 
    words, 
    selectedWords,
    setWords,
    setAllWordsForFiltering,
    setAllFilteredWords,
    setColumnVisibility,
    handleFieldChange
  } = useWordList();
  
  const [deckData, setDeckData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDeck();
  }, [id]);

  // Note: Column visibility is now managed by WordListContext with localStorage persistence
  // No need to set it here - it will use saved preferences or defaults

  const loadDeck = async () => {
    try {
      setLoading(true);
      const response = await flashcardAPI.getDeck(id);
      const deck = response.data;
      
      setDeckData({
        name: deck.name || '',
        description: deck.description || '',
        level: deck.level || '',
        skill: deck.skill || '',
        task: deck.task || ''
      });

      // Load words into context
      if (deck.words && deck.words.length > 0) {
        setWords(deck.words);
        setAllWordsForFiltering(deck.words);
        setAllFilteredWords(deck.words);
      } else {
        setWords([]);
        setAllWordsForFiltering([]);
        setAllFilteredWords([]);
      }
    } catch (error) {
      setError('Error loading deck');
      console.error('Error loading deck:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!deckData.name.trim()) {
      setError('Deck name is required');
      return;
    }

    setSaving(true);
    try {
      // Update words in database (words are managed by context)
      for (const word of words) {
        if (word._id) {
          try {
            await wordAPI.updateWord(word._id, {
              englishWord: word.englishWord,
              turkishMeaning: word.turkishMeaning,
              wordType: word.wordType,
              englishLevel: word.englishLevel,
              category1: word.category1,
              category2: word.category2,
              category3: word.category3,
              sampleSentenceEn: word.sampleSentenceEn,
              sampleSentenceTr: word.sampleSentenceTr,
              imageUrl: word.imageUrl
            });
          } catch (err) {
            console.error(`Failed to update word ${word._id}:`, err);
          }
        }
      }

      // Update deck with wordIds based on selected words
      // If words are selected, use only selected words; otherwise, use all words
      let wordIds;
      if (selectedWords && selectedWords.size > 0) {
        // Use only selected words
        wordIds = Array.from(selectedWords);
      } else {
        // Use all words in the deck
        wordIds = words.map(word => word._id);
      }

      await flashcardAPI.updateDeck(id, {
        ...deckData,
        wordIds
      });
      navigate('/decks');
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating deck');
    } finally {
      setSaving(false);
    }
  };



  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!deckData) {
    return <div className="error-message">Deck not found</div>;
  }

  return (
    <div className="edit-deck-container">
      <div className="edit-deck-layout">
        {/* Pane 1: Edit Deck Information */}
        <div className="edit-deck-pane">
          <h1>Edit Deck</h1>
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Deck Name *</label>
              <input
                type="text"
                className="form-input"
                value={deckData.name}
                onChange={(e) => setDeckData({ ...deckData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                rows="3"
                value={deckData.description || ''}
                onChange={(e) => setDeckData({ ...deckData, description: e.target.value })}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Level</label>
                <select
                  className="form-select"
                  value={deckData.level}
                  onChange={(e) => setDeckData({ ...deckData, level: e.target.value })}
                >
                  <option value="">Select Level</option>
                  {DECK_LEVELS.map(level => (
                    <option key={level} value={level}>
                      {formatLevel(level)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Skill</label>
                <select
                  className="form-select"
                  value={deckData.skill}
                  onChange={(e) => setDeckData({ ...deckData, skill: e.target.value })}
                >
                  <option value="">Select Skill</option>
                  {DECK_SKILLS.map(skill => (
                    <option key={skill} value={skill}>
                      {formatSkill(skill)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Task</label>
                <select
                  className="form-select"
                  value={deckData.task}
                  onChange={(e) => setDeckData({ ...deckData, task: e.target.value })}
                >
                  <option value="">Select Task</option>
                  {DECK_TASKS.map(task => (
                    <option key={task} value={task}>
                      {formatTask(task)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-large" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/decks')}
                className="btn btn-secondary btn-large"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Pane 2: Words Section */}
        <div className="words-pane">
          <div className="words-header">
            <h2>Words ({words.length})</h2>
          </div>

          {words.length === 0 ? (
            <div className="no-words-message">
              <p>No words in this deck. Add words from the Create Deck page.</p>
            </div>
          ) : (
            <WordList 
              showFilters={false} 
              showDeleteButton={false}
              initialColumnVisibility={{
                englishWord: true,
                turkishMeaning: true,
                wordType: false,
                englishLevel: true,
                image: false, // Hidden by default, can be shown via right-click
                category1: true,
                category2: false,
                category3: false,
                sampleSentenceEn: false,
                sampleSentenceTr: false,
                source: true,
                isKnown: false,
                isSpelled: false
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default EditDeck;
