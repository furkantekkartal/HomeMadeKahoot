import React, { useState, useEffect, useRef } from 'react';
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
  
  // Animation state for keyboard triggers
  const [animations, setAnimations] = useState({
    known: false,
    unknown: false,
    audioWord: false,
    audioSentence: false,
    navNext: false,
    navPrev: false,
    navRandom: false
  });

  // Touch gesture state
  const [touchStart, setTouchStart] = useState({ x: null, y: null });
  const [touchEnd, setTouchEnd] = useState({ x: null, y: null });
  const swipeDetectedRef = useRef(false);

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
            triggerAnimation('navNext');
            setIsFlipped(false);
            setCurrentIndex((prevIndex) => (prevIndex + 1) % cards.length);
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (cards.length > 0) {
            triggerAnimation('navPrev');
            setIsFlipped(false);
            setCurrentIndex((prevIndex) => (prevIndex - 1 + cards.length) % cards.length);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (cards.length > 0 && currentIndex < cards.length) {
            const card = cards[currentIndex];
            if (card && card._id) {
              triggerAnimation('known');
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
              triggerAnimation('unknown');
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
              speakText(card.englishWord, 'en-US', 'audioWord');
            }
          }
          break;
        case '1':
          e.preventDefault();
          if (cards.length > 0 && currentIndex < cards.length) {
            const card = cards[currentIndex];
            if (card && card.sampleSentenceEn) {
              speakText(card.sampleSentenceEn, 'en-US', 'audioSentence');
            }
          }
          break;
        case ' ':
          e.preventDefault();
          if (cards.length > 0) {
            setIsFlipped(!isFlipped);
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

  const speakText = (text, lang = 'en-US', animationType = null) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
      
      if (animationType) {
        setAnimations(prev => ({ ...prev, [animationType]: true }));
        setTimeout(() => setAnimations(prev => ({ ...prev, [animationType]: false })), 500);
      }
    }
  };
  
  const triggerAnimation = (key) => {
    setAnimations(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setAnimations(prev => ({ ...prev, [key]: false })), 600);
  };

  // Touch gesture handlers
  const minSwipeDistance = 50;

  const handleTouchStart = (e) => {
    const touch = e.targetTouches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setTouchEnd({ x: null, y: null });
    swipeDetectedRef.current = false;
  };

  const handleTouchMove = (e) => {
    const touch = e.targetTouches[0];
    setTouchEnd({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = async (e) => {
    if (!touchStart.x || !touchStart.y || !touchEnd.x || !touchEnd.y) {
      // If no swipe detected, allow click to flip
      return;
    }

    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine if horizontal or vertical swipe is dominant
    if (absDeltaX > absDeltaY && absDeltaX > minSwipeDistance) {
      swipeDetectedRef.current = true;
      // Horizontal swipe
      if (deltaX > 0) {
        // Swipe left - next card
        if (cards.length > 0) {
          triggerAnimation('navNext');
          setIsFlipped(false);
          setCurrentIndex((prevIndex) => (prevIndex + 1) % cards.length);
        }
      } else {
        // Swipe right - previous card
        if (cards.length > 0) {
          triggerAnimation('navPrev');
          setIsFlipped(false);
          setCurrentIndex((prevIndex) => (prevIndex - 1 + cards.length) % cards.length);
        }
      }
    } else if (absDeltaY > absDeltaX && absDeltaY > minSwipeDistance) {
      swipeDetectedRef.current = true;
      // Vertical swipe
      if (deltaY > 0) {
        // Swipe up - known word
        if (cards.length > 0 && currentIndex < cards.length) {
          const card = cards[currentIndex];
          if (card && card._id) {
            triggerAnimation('known');
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
      } else {
        // Swipe down - unknown word
        if (cards.length > 0 && currentIndex < cards.length) {
          const card = cards[currentIndex];
          if (card && card._id) {
            triggerAnimation('unknown');
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
      }
    }
    
    // Reset touch state
    setTouchStart({ x: null, y: null });
    setTouchEnd({ x: null, y: null });
    
    // Reset swipe detection after a short delay to allow click handler to check
    setTimeout(() => {
      swipeDetectedRef.current = false;
    }, 100);
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
              className={`flashcard-image ${
                animations.known ? 'animate-image-known' : 
                animations.unknown ? 'animate-image-unknown' : ''
              }`}
              onError={(e) => { 
                e.target.src = 'https://img.freepik.com/free-vector/illustration-gallery-icon_53876-27002.jpg?semt=ais_hybrid&w=740&q=80';
              }}
            />
          )}

          {/* Flashcard */}
          <div
            className={`flashcard ${isFlipped ? 'flipped' : ''}`}
            onClick={(e) => {
              // Only flip on click if no swipe was detected
              if (!swipeDetectedRef.current) {
                setIsFlipped(!isFlipped);
              }
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="flashcard-inner">
              {/* Front */}
              <div className="flashcard-front">
                <div className="card-word-container">
                  <h2 className="card-word">{currentCard.englishWord}</h2>
                  <button
                    onClick={(e) => { e.stopPropagation(); speakText(currentCard.englishWord); }}
                    className={`audio-btn-inline ${animations.audioWord ? 'animate-sound-wave' : ''}`}
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
                      className={`audio-btn-inline ${animations.audioSentence ? 'animate-sound-wave' : ''}`}
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
            <button 
              onClick={prevCard} 
              className={`nav-btn nav-btn-emoji ${animations.navPrev ? 'animate-press' : ''}`} 
              title="Previous"
            >
              ⬅️
            </button>
            <button 
              onClick={randomCard} 
              className={`nav-btn nav-btn-emoji ${animations.navRandom ? 'animate-press' : ''}`} 
              title="Random"
            >
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
            <button 
              onClick={nextCard} 
              className={`nav-btn nav-btn-emoji ${animations.navNext ? 'animate-press' : ''}`} 
              title="Next"
            >
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
                className={`status-btn status-unknown ${animations.unknown ? 'animate-pulse-status' : ''}`}
              >
                ❓ Unknown
              </button>
              <button
                onClick={() => updateCardStatus(true)}
                className={`status-btn status-known ${animations.known ? 'animate-pulse-status' : ''}`}
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

