import React, { useState, useEffect } from 'react';
import { wordAPI, flashcardAPI } from '../services/api';
import './Flashcards.css';

const Flashcards = () => {
  // Deck state
  const [decks, setDecks] = useState([]);
  const [currentDeck, setCurrentDeck] = useState(null);
  const [deckName, setDeckName] = useState('');
  const [showCreateDeck, setShowCreateDeck] = useState(false);

  // Card state
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Setup state
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('unknown'); // unknown, known, all
  const [loading, setLoading] = useState(false);

  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  useEffect(() => {
    loadDecks();
  }, []);

  useEffect(() => {
    if (currentDeck) {
      loadDeckCards();
    }
  }, [currentDeck]);

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

      const response = await wordAPI.getWordsWithStatus({
        ...filters,
        limit: 1000,
        showKnown: selectedStatus === 'all' || selectedStatus === 'known' ? 'true' : 'false',
        showUnknown: selectedStatus === 'all' || selectedStatus === 'unknown' ? 'true' : 'false'
      });

      let filtered = response.data.words;

      // Apply status filter
      if (selectedStatus === 'unknown') {
        filtered = filtered.filter(w => w.isKnown !== true);
      } else if (selectedStatus === 'known') {
        filtered = filtered.filter(w => w.isKnown === true);
      }

      setCards(filtered);
      setCurrentIndex(0);
      setIsFlipped(false);
      setCurrentDeck(null);
    } catch (error) {
      console.error('Failed to load cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDeck = async () => {
    if (!deckName.trim() || cards.length === 0) {
      alert('Please enter a deck name and load some cards first');
      return;
    }

    try {
      const wordIds = cards.map(c => c._id);
      const response = await flashcardAPI.createDeck(deckName, wordIds);
      
      setCurrentDeck(response.data);
      setDecks([...decks, response.data]);
      setShowCreateDeck(false);
      setDeckName('');
      alert(`Deck "${deckName}" created with ${cards.length} cards!`);
    } catch (error) {
      console.error('Failed to create deck:', error);
      alert('Failed to create deck: ' + (error.response?.data?.message || error.message));
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
            onClick={() => setShowCreateDeck(true)}
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
          <div className="card-counter">
            Card {currentIndex + 1} of {cards.length}
          </div>

          {/* Flashcard */}
          <div
            className={`flashcard ${isFlipped ? 'flipped' : ''}`}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div className="flashcard-inner">
              {/* Front */}
              <div className="flashcard-front">
                {currentCard.imageUrl && currentCard.imageUrl !== '' && (
                  <img
                    src={currentCard.imageUrl}
                    alt={currentCard.englishWord}
                    className="card-image"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
                <h2 className="card-word">{currentCard.englishWord}</h2>
                <p className="card-type">{currentCard.wordType}</p>
                {currentCard.sampleSentenceEn && (
                  <p className="card-sentence">"{currentCard.sampleSentenceEn}"</p>
                )}
                <div className="card-audio-buttons">
                  <button
                    onClick={(e) => { e.stopPropagation(); speakText(currentCard.englishWord); }}
                    className="audio-btn"
                    title="Pronounce word"
                  >
                    🔊 Word
                  </button>
                  {currentCard.sampleSentenceEn && (
                    <button
                      onClick={(e) => { e.stopPropagation(); speakText(currentCard.sampleSentenceEn); }}
                      className="audio-btn"
                      title="Pronounce sentence"
                    >
                      🔊 Sentence
                    </button>
                  )}
                </div>
                <p className="card-hint">Click to flip</p>
              </div>

              {/* Back */}
              <div className="flashcard-back">
                {currentCard.imageUrl && currentCard.imageUrl !== '' && (
                  <img
                    src={currentCard.imageUrl}
                    alt={currentCard.turkishMeaning}
                    className="card-image"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
                <h2 className="card-word">{currentCard.turkishMeaning}</h2>
                <p className="card-translation">{currentCard.englishWord}</p>
                {currentCard.sampleSentenceTr && (
                  <p className="card-sentence">"{currentCard.sampleSentenceTr}"</p>
                )}
                <div className="card-audio-buttons">
                  <button
                    onClick={(e) => { e.stopPropagation(); speakText(currentCard.turkishMeaning, 'tr-TR'); }}
                    className="audio-btn"
                    title="Kelimeyi telaffuz et"
                  >
                    🔊 Kelime
                  </button>
                  {currentCard.sampleSentenceTr && (
                    <button
                      onClick={(e) => { e.stopPropagation(); speakText(currentCard.sampleSentenceTr, 'tr-TR'); }}
                      className="audio-btn"
                      title="Cümleyi telaffuz et"
                    >
                      🔊 Cümle
                    </button>
                  )}
                </div>
                <p className="card-hint">Click to flip back</p>
              </div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="card-navigation">
            <button onClick={prevCard} className="btn btn-secondary">
              ← Previous
            </button>
            <button onClick={() => setIsFlipped(!isFlipped)} className="btn btn-primary">
              {isFlipped ? 'Show Front' : 'Show Back'}
            </button>
            <button onClick={randomCard} className="btn btn-secondary">
              🎲 Random
            </button>
            <button onClick={nextCard} className="btn btn-secondary">
              Next →
            </button>
          </div>
        </div>

        {/* Right Sidebar - Mark As */}
        <div className="flashcard-sidebar">
          <h3>Mark as</h3>
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

      {/* Create Deck Modal */}
      {showCreateDeck && (
        <div className="modal-overlay" onClick={() => setShowCreateDeck(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create Flashcard Deck</h2>
            <div className="modal-input-group">
              <label>Deck Name</label>
              <input
                type="text"
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder="e.g., 'Business Vocabulary'"
                autoFocus
              />
            </div>
            <p className="modal-info">
              This deck will contain {cards.length} cards currently loaded.
            </p>
            <div className="modal-actions">
              <button onClick={createDeck} className="btn btn-primary">
                Create Deck
              </button>
              <button onClick={() => setShowCreateDeck(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Flashcards;

