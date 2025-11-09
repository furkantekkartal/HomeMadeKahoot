import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { wordAPI, flashcardAPI } from '../services/api';
import { useStudyTimer } from '../hooks/useStudyTimer';
import StudyTimer from '../components/Common/StudyTimer';
import './Flashcards.css';

const Flashcards = () => {
  const navigate = useNavigate();
  
  // Deck state
  const [decks, setDecks] = useState([]);
  const [currentDeck, setCurrentDeck] = useState(null);

  // Card state
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Setup state
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('unknown'); // unknown, known, all
  const [loading, setLoading] = useState(true); // Start with loading true to show loading state
  const [generatingImage, setGeneratingImage] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [availableWords, setAvailableWords] = useState([]);
  const [searchWordQuery, setSearchWordQuery] = useState('');
  const [loadingWords, setLoadingWords] = useState(false);
  const [categories, setCategories] = useState([]);

  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  // Study timer
  const [timerActive, setTimerActive] = useState(true);
  const { durationFormatted, isActive, endSession } = useStudyTimer('Flashcards', timerActive);

  useEffect(() => {
    loadDecks();
    // Load default cards on initial mount
    loadDefaultCards();
  }, []);

  useEffect(() => {
    if (currentDeck) {
      loadDeckCards();
    }
  }, [currentDeck]);

  // Load categories on initial mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await wordAPI.getWordsWithStatus({
          limit: 1000
        });
        const allWords = response.data.words || [];
        const uniqueCategories = [...new Set(allWords.map(w => w.category1).filter(c => c))].sort();
        setCategories(uniqueCategories);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    loadCategories();
  }, []);

  // Debounce search query
  useEffect(() => {
    if (!showAddCardModal) return;
    
    const timeoutId = setTimeout(() => {
      loadAvailableWords(searchWordQuery);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchWordQuery, showAddCardModal]);

  const loadDecks = async () => {
    try {
      const response = await flashcardAPI.getMyDecks();
      setDecks(response.data);
    } catch (error) {
      console.error('Failed to load decks:', error);
    }
  };

  const loadDeckCards = async () => {
    if (!currentDeck) return;
    
    try {
      const response = await flashcardAPI.getDeck(currentDeck._id);
      setCards(response.data.words || []);
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (error) {
      console.error('Failed to load deck cards:', error);
    }
  };

  const loadDefaultCards = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (selectedLevel) filters.englishLevel = selectedLevel;
      if (selectedCategory) filters.category1 = selectedCategory;

      // Default to showing unknown words if no status is selected
      const statusFilter = selectedStatus || 'unknown';
      
      const response = await wordAPI.getWordsWithStatus({
        ...filters,
        limit: 1000,
        showKnown: statusFilter === 'all' || statusFilter === 'known' ? 'true' : 'false',
        showUnknown: statusFilter === 'all' || statusFilter === 'unknown' ? 'true' : 'false'
      });

      let filtered = response.data.words || [];

      // Apply status filter
      if (statusFilter === 'unknown') {
        filtered = filtered.filter(w => w.isKnown !== true);
      } else if (statusFilter === 'known') {
        filtered = filtered.filter(w => w.isKnown === true);
      }

      // Extract unique categories from loaded words
      const uniqueCategories = [...new Set(filtered.map(w => w.category1).filter(c => c))].sort();
      setCategories(uniqueCategories);

      // Shuffle cards for variety
      const shuffled = [...filtered].sort(() => Math.random() - 0.5);
      
      setCards(shuffled);
      setCurrentIndex(0);
      setIsFlipped(false);
      setCurrentDeck(null);
    } catch (error) {
      console.error('Failed to load cards:', error);
      setCards([]);
    } finally {
      setLoading(false);
    }
  };


  const nextCard = () => {
    setIsFlipped(false);
    setCurrentIndex((currentIndex + 1) % cards.length);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setCurrentIndex((currentIndex - 1 + cards.length) % cards.length);
  };

  const randomCard = () => {
    setIsFlipped(false);
    const randomIndex = Math.floor(Math.random() * cards.length);
    setCurrentIndex(randomIndex);
  };

  const updateCardStatus = async (isKnown) => {
    if (!currentCard) return;

    try {
      await wordAPI.toggleWordStatus(currentCard._id, isKnown);
      
      // Update local card state
      setCards(cards.map(c => 
        c._id === currentCard._id ? { ...c, isKnown } : c
      ));

      // Update last studied if using a deck
      if (currentDeck) {
        await flashcardAPI.updateLastStudied(currentDeck._id);
      }

      // Auto-advance to next card
      setTimeout(nextCard, 300);
    } catch (error) {
      console.error('Failed to update card status:', error);
    }
  };

  const speakText = (text, lang = 'en-US') => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  };

  const handleGenerateImage = async (wordId) => {
    if (!wordId) return;
    
    try {
      setGeneratingImage(true);
      const response = await wordAPI.generateWordImage(wordId);
      
      // Update the current card with the new image URL
      setCards(cards.map(c => 
        c._id === wordId ? { ...c, imageUrl: response.data.imageUrl } : c
      ));
    } catch (error) {
      console.error('Failed to generate image:', error);
      alert('Failed to generate image: ' + (error.response?.data?.message || error.message));
    } finally {
      setGeneratingImage(false);
    }
  };

  const loadAvailableWords = async (query = '') => {
    try {
      setLoadingWords(true);
      const params = { limit: 100 };
      if (query && query.length > 0) {
        params.search = query;
      }
      const response = await wordAPI.getWordsWithStatus(params);
      // Filter out words that are already in the current cards
      const existingWordIds = new Set(cards.map(c => c._id?.toString()));
      const filtered = response.data.words.filter(w => !existingWordIds.has(w._id?.toString()));
      setAvailableWords(filtered);
    } catch (error) {
      console.error('Failed to load words:', error);
    } finally {
      setLoadingWords(false);
    }
  };

  const handleAddCardToDeck = async (word) => {
    if (!currentDeck) {
      // If no deck, just add to current cards
      setCards([...cards, word]);
      setShowAddCardModal(false);
      alert('Card added to current cards!');
      return;
    }

    try {
      // Add word to deck
      const updatedWordIds = [...currentDeck.wordIds.map(w => w._id || w), word._id];
      await flashcardAPI.updateDeck(currentDeck._id, {
        wordIds: updatedWordIds
      });
      
      // Reload deck to get updated cards
      await loadDeckCards();
      setShowAddCardModal(false);
      alert('Card added to deck!');
    } catch (error) {
      console.error('Failed to add card to deck:', error);
      alert('Failed to add card: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleOpenAddCard = async () => {
    setShowAddCardModal(true);
    setSearchWordQuery('');
    // Load initial words
    try {
      setLoadingWords(true);
      const response = await wordAPI.getWordsWithStatus({
        limit: 100
      });
      // Filter out words that are already in the current cards
      const existingWordIds = new Set(cards.map(c => c._id?.toString()));
      const filtered = response.data.words.filter(w => !existingWordIds.has(w._id?.toString()));
      setAvailableWords(filtered);
    } catch (error) {
      console.error('Failed to load words:', error);
    } finally {
      setLoadingWords(false);
    }
  };

  const handleDeckSelect = async (deckId) => {
    if (!deckId) {
      await loadDefaultCards();
      return;
    }

    const deck = decks.find(d => d._id === deckId);
    if (deck) {
      setCurrentDeck(deck);
    }
  };

  if (loading) {
    return <div className="loading">Loading cards...</div>;
  }

  if (cards.length === 0 && !currentDeck) {
    return (
      <div className="flashcards-container">
        <div className="flashcards-setup">
          <h1>Flashcards</h1>
          <div className="setup-filters">
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="filter-select"
            >
              <option value="">All Levels</option>
              {levels.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="filter-select"
            >
              <option value="">All Categories</option>
              <option value="Grammar">Grammar</option>
              <option value="General">General</option>
              <option value="Home">Home</option>
              <option value="Education">Education</option>
              <option value="Technology">Technology</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Words</option>
              <option value="unknown">Unknown Only</option>
              <option value="known">Known Only</option>
            </select>

            <button onClick={loadDefaultCards} className="btn btn-primary">
              Load Cards
            </button>
          </div>
        </div>
        <div className="empty-state">
          <p>No flashcards available. Load some cards or create a deck.</p>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div className="flashcards-container">
      {/* Top Bar */}
      <div className="flashcards-header">
        <h1>Flashcards</h1>
        <div className="header-controls">
          <StudyTimer 
            durationFormatted={durationFormatted}
            isActive={timerActive}
            onToggle={() => setTimerActive(!timerActive)}
          />
          
          <select
            value={currentDeck?._id || ''}
            onChange={(e) => handleDeckSelect(e.target.value)}
            className="deck-select"
          >
            <option value="">Default (All Cards)</option>
            {decks.map(deck => (
              <option key={deck._id} value={deck._id}>
                {deck.name} ({deck.totalCards} cards)
              </option>
            ))}
          </select>

          <button
            onClick={() => navigate('/create-deck')}
            className="btn btn-secondary"
          >
            + New Deck
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flashcards-content">
        {/* Center - Card Area */}
        <div className="flashcard-area">
          {/* Progress Bar */}
          <div className="progress-container">
            <div className="progress-info">
              <span>Card {currentIndex + 1} of {cards.length}</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Image Pane - Separate from card */}
          <div className="image-pane">
            {currentCard.imageUrl && currentCard.imageUrl !== '' ? (
              <img
                src={currentCard.imageUrl}
                alt={currentCard.englishWord}
                className="image-pane-img"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="image-pane-placeholder">
                <span className="placeholder-icon">🖼️</span>
                <p className="placeholder-text">No image available</p>
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleGenerateImage(currentCard._id); 
                  }}
                  className="generate-image-btn"
                  disabled={generatingImage}
                  title="Generate image for this word"
                >
                  {generatingImage ? 'Generating...' : 'Generate Image'}
                </button>
              </div>
            )}
          </div>

          {/* Flashcard */}
          <div
            className={`flashcard ${isFlipped ? 'flipped' : ''}`}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div className="flashcard-inner">
              {/* Front */}
              <div className="flashcard-front">
                <div className="card-word-container">
                  <h2 className="card-word">{currentCard.englishWord}</h2>
                  <button
                    onClick={(e) => { e.stopPropagation(); speakText(currentCard.englishWord); }}
                    className="audio-btn-inline"
                    title="Pronounce word"
                  >
                    🔊
                  </button>
                </div>
                <p className="card-type">{currentCard.wordType}</p>
                {currentCard.sampleSentenceEn && (
                  <div className="card-sentence-container">
                    <p className="card-sentence">"{currentCard.sampleSentenceEn}"</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); speakText(currentCard.sampleSentenceEn); }}
                      className="audio-btn-inline"
                      title="Pronounce sentence"
                    >
                      🔊
                    </button>
                  </div>
                )}
                <p className="card-hint">Click to flip</p>
              </div>

              {/* Back */}
              <div className="flashcard-back">
                <div className="card-word-container">
                  <h2 className="card-word">{currentCard.turkishMeaning}</h2>
                  <button
                    onClick={(e) => { e.stopPropagation(); speakText(currentCard.turkishMeaning, 'tr-TR'); }}
                    className="audio-btn-inline"
                    title="Kelimeyi telaffuz et"
                  >
                    🔊
                  </button>
                </div>
                <p className="card-translation">{currentCard.englishWord}</p>
                {currentCard.sampleSentenceTr && (
                  <div className="card-sentence-container">
                    <p className="card-sentence">"{currentCard.sampleSentenceTr}"</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); speakText(currentCard.sampleSentenceTr, 'tr-TR'); }}
                      className="audio-btn-inline"
                      title="Cümleyi telaffuz et"
                    >
                      🔊
                    </button>
                  </div>
                )}
                <p className="card-hint">Click to flip back</p>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="card-navigation">
            <button onClick={prevCard} className="nav-btn nav-btn-emoji" title="Previous">
              ⬅️
            </button>
            <button onClick={randomCard} className="nav-btn nav-btn-emoji" title="Random">
              🎲
            </button>
            <button 
              onClick={() => handleGenerateImage(currentCard._id)} 
              className="nav-btn nav-btn-emoji"
              disabled={generatingImage}
              title="Generate new image"
            >
              {generatingImage ? '⏳' : '🖼️'}
            </button>
            <button onClick={nextCard} className="nav-btn nav-btn-emoji" title="Next">
              ➡️
            </button>
          </div>
        </div>

        {/* Right Sidebar - Mark As */}
        <div className="flashcard-sidebar">
          {/* Mark as Section */}
          <div className="mark-as-section">
            <h3 className="mark-as-title">Mark as</h3>
            <div className="status-buttons">
              <button
                onClick={() => updateCardStatus(false)}
                className="status-btn status-unknown"
              >
                ❓ Unknown
              </button>
              <button
                onClick={() => updateCardStatus(true)}
                className="status-btn status-known"
              >
                ✅ Known
              </button>
            </div>
          </div>

          <h3>Progress</h3>
          
          {/* Progress Stats */}
          <div className="stats-grid">
            <div className="stat-card stat-correct">
              <p className="stat-label">Known</p>
              <p className="stat-value">{cards.filter(card => card.isKnown).length}</p>
            </div>

            <div className="stat-card stat-incorrect">
              <p className="stat-label">Unknown</p>
              <p className="stat-value">{cards.filter(card => !card.isKnown).length}</p>
            </div>

            <div className="stat-card stat-remaining">
              <p className="stat-label">Remaining</p>
              <p className="stat-value">
                {Math.max(0, cards.length - (currentIndex + 1))}
              </p>
            </div>
          </div>

          {/* Deck Info */}
          {currentDeck && (
            <div className="deck-info">
              <p className="deck-info-title">Current Deck</p>
              <p className="deck-info-name">{currentDeck.name}</p>
              <p className="deck-info-stats">
                {currentDeck.masteredCards || 0} / {currentDeck.totalCards} mastered
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Card Modal */}
      {showAddCardModal && (
        <div className="modal-overlay" onClick={() => setShowAddCardModal(false)}>
          <div className="modal-content add-card-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Card to {currentDeck ? currentDeck.name : 'Current Cards'}</h2>
            <div className="modal-input-group">
              <label>Search Words</label>
              <input
                type="text"
                value={searchWordQuery}
                onChange={(e) => setSearchWordQuery(e.target.value)}
                placeholder="Type to search words..."
                autoFocus
              />
            </div>
            <div className="available-words-list">
              {loadingWords ? (
                <div className="loading">Loading words...</div>
              ) : availableWords.length === 0 ? (
                <div className="empty-state">No words found. Try a different search.</div>
              ) : (
                <div className="words-list">
                  {availableWords.slice(0, 20).map(word => (
                    <div key={word._id} className="word-item" onClick={() => handleAddCardToDeck(word)}>
                      <div className="word-item-content">
                        <strong>{word.englishWord}</strong>
                        <span className="word-type">{word.wordType}</span>
                        <span className="word-meaning">{word.turkishMeaning}</span>
                      </div>
                      <button className="btn btn-sm btn-primary">Add</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowAddCardModal(false)} className="btn btn-secondary">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Flashcards;

