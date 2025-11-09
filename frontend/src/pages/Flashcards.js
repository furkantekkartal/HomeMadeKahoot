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

  // Loading and UI state
  const [loading, setLoading] = useState(true);
  const [generatingImage, setGeneratingImage] = useState(false);

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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = async (e) => {
      // Don't handle keyboard events if user is typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          if (cards.length > 0) {
            setIsFlipped(false);
            setCurrentIndex((prevIndex) => (prevIndex + 1) % cards.length);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (cards.length > 0) {
            setIsFlipped(false);
            setCurrentIndex((prevIndex) => (prevIndex - 1 + cards.length) % cards.length);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (cards.length > 0 && currentIndex < cards.length) {
            const card = cards[currentIndex];
            if (card && card._id) {
              try {
                await wordAPI.toggleWordStatus(card._id, true);
                setCards(prevCards => prevCards.map(c => 
                  c._id === card._id ? { ...c, isKnown: true } : c
                ));
                if (currentDeck) {
                  await flashcardAPI.updateLastStudied(currentDeck._id);
                }
                setTimeout(() => {
                  setIsFlipped(false);
                  setCurrentIndex((prevIndex) => (prevIndex + 1) % cards.length);
                }, 300);
              } catch (error) {
                console.error('Failed to update card status:', error);
              }
            }
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (cards.length > 0 && currentIndex < cards.length) {
            const card = cards[currentIndex];
            if (card && card._id) {
              try {
                await wordAPI.toggleWordStatus(card._id, false);
                setCards(prevCards => prevCards.map(c => 
                  c._id === card._id ? { ...c, isKnown: false } : c
                ));
                if (currentDeck) {
                  await flashcardAPI.updateLastStudied(currentDeck._id);
                }
                setTimeout(() => {
                  setIsFlipped(false);
                  setCurrentIndex((prevIndex) => (prevIndex + 1) % cards.length);
                }, 300);
              } catch (error) {
                console.error('Failed to update card status:', error);
              }
            }
          }
          break;
        case '0':
          e.preventDefault();
          if (cards.length > 0 && currentIndex < cards.length) {
            const card = cards[currentIndex];
            if (card && card.englishWord) {
              speakText(card.englishWord);
            }
          }
          break;
        case '1':
          e.preventDefault();
          if (cards.length > 0 && currentIndex < cards.length) {
            const card = cards[currentIndex];
            if (card && card.sampleSentenceEn) {
              speakText(card.sampleSentenceEn);
            }
          }
          break;
        case ' ':
          e.preventDefault();
          if (cards.length > 0) {
            randomCard();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [cards, currentIndex, currentDeck]);


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
      const response = await wordAPI.getWordsWithStatus({
        limit: 1000,
        showKnown: 'false',
        showUnknown: 'true'
      });

      let filtered = response.data.words || [];
      // Filter to show only unknown words
      filtered = filtered.filter(w => w.isKnown !== true);

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

  if (cards.length === 0) {
    return (
      <div className="flashcards-container">
        <div className="flashcards-header">
          <h1>Flashcards</h1>
        </div>
        <div className="empty-state">
          <p>No flashcards available. Create a deck or wait for cards to load.</p>
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
            New Deck
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

          {/* Image - Same size as card */}
          {currentCard && (
            <img
              src={currentCard.imageUrl || 'https://img.freepik.com/free-vector/illustration-gallery-icon_53876-27002.jpg?semt=ais_hybrid&w=740&q=80'}
              alt={currentCard.englishWord || 'Word image'}
              className="flashcard-image"
              onError={(e) => { 
                e.target.src = 'https://img.freepik.com/free-vector/illustration-gallery-icon_53876-27002.jpg?semt=ais_hybrid&w=740&q=80';
              }}
            />
          )}

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

    </div>
  );
};

export default Flashcards;

