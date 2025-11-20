import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { wordAPI, flashcardAPI } from '../services/api';
import { useStudyTimer } from '../hooks/useStudyTimer';
import StudyTimer from '../components/Common/StudyTimer';
import { FaHourglassHalf } from 'react-icons/fa';
import './Spelling.css';

// Constants
const CONSTANTS = {
  MIN_SWIPE_DISTANCE: 50,
  AUTO_ADVANCE_DELAY: 150,
  ANIMATION_DURATION: 300,
  AUDIO_ANIMATION_DURATION: 300,
  SWIPE_RESET_DELAY: 100,
  DEFAULT_IMAGE_URL: 'https://img.freepik.com/free-vector/illustration-gallery-icon_53876-27002.jpg?semt=ais_hybrid&w=740&q=80',
  WORDS_LIMIT: 1000
};

const Spelling = () => {
  const location = useLocation();
  
  // Deck state
  const [decks, setDecks] = useState([]);
  const [currentDeck, setCurrentDeck] = useState(null);
  const [deckStats, setDeckStats] = useState({ totalWords: 0, masteredWords: 0, remainingWords: 0 });

  // Card state
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Writing state
  const [userAnswer, setUserAnswer] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const inputRef = useRef(null);

  // Loading and UI state
  const [loading, setLoading] = useState(true);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
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

  // State for "Known" and "Unknown" text animation overlays
  const [showKnownText, setShowKnownText] = useState(false);
  const [showUnknownText, setShowUnknownText] = useState(false);

  // State for writing pane animation
  const [writingPaneOffset, setWritingPaneOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [writingPaneOpacity, setWritingPaneOpacity] = useState(1);
  const [writingPaneScale, setWritingPaneScale] = useState(1);

  // Shared AudioContext for all sounds (mobile-friendly)
  const audioContextRef = useRef(null);
  
  // Initialize and resume AudioContext
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (error) {
        console.debug('Audio context not available:', error);
        return null;
      }
    }
    
    // Resume if suspended (required on mobile)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume().catch(err => {
        console.debug('Failed to resume audio context:', err);
      });
    }
    
    return audioContextRef.current;
  };

  // Touch gesture state
  const [touchStart, setTouchStart] = useState({ x: null, y: null });
  const [touchEnd, setTouchEnd] = useState({ x: null, y: null });
  const swipeDetectedRef = useRef(false);

  // Auto-pause timer state
  const cardDisplayStartTimeRef = useRef(null);
  const wasAutoPausedRef = useRef(false);

  // Study timer
  const [timerActive, setTimerActive] = useState(true);
  const { durationFormatted, isActive, endSession, resetSession } = useStudyTimer('Spelling', timerActive);

  // Show known words checkbox
  const [showKnown, setShowKnown] = useState(false);

  useEffect(() => {
    const initializeSpelling = async () => {
      // First, load decks
      await loadDecks();
    };
    initializeSpelling();
  }, []);

  // Auto-select deck from navigation state or first deck when decks are loaded
  useEffect(() => {
    if (decks.length > 0 && !currentDeck) {
      // Check if deckId was passed from navigation
      const deckIdFromState = location.state?.deckId;
      if (deckIdFromState) {
        const deck = decks.find(d => d._id === deckIdFromState);
        if (deck) {
          setCurrentDeck(deck);
          // Clear the state to avoid re-selecting on re-renders
          window.history.replaceState({}, document.title);
          return;
        }
      }
      // Otherwise, automatically select the first deck
      setCurrentDeck(decks[0]);
    }
  }, [decks, currentDeck, location.state]);

  // Load default cards if no decks exist
  useEffect(() => {
    if (decks.length === 0 && cards.length === 0 && !loading && !currentDeck) {
      loadDefaultCards();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decks.length, cards.length, loading, currentDeck, showKnown]);

  useEffect(() => {
    if (currentDeck) {
      // Reset timer when a new deck is selected and start it
      resetSession();
      setTimerActive(true);
      loadDeckCards();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDeck, showKnown]);

  // Calculate currentCard for use in effects
  const currentCard = cards.length > 0 && currentIndex < cards.length ? cards[currentIndex] : null;

  // Focus input when card changes
  useEffect(() => {
    if (currentCard && inputRef.current && !showAnswer) {
      inputRef.current.focus();
    }
  }, [currentIndex, showAnswer, cards]);

  // Reset answer state when card changes
  useEffect(() => {
    setUserAnswer('');
    setShowAnswer(false);
    setWritingPaneOpacity(1);
    setWritingPaneScale(1);
  }, [currentIndex]);

  // Auto-read English word when new card appears
  useEffect(() => {
    if (currentCard && currentCard.englishWord && !showAnswer) {
      // Small delay to ensure card is fully loaded
      const timer = setTimeout(() => {
        speakText(currentCard.englishWord, 'en-US', 'audioWord');
      }, 300);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, cards, showAnswer]);

  // Track card display time and auto-pause timer after 60 seconds
  useEffect(() => {
    if (cards.length > 0 && currentIndex < cards.length && !loading) {
      // Reset card display start time when card changes
      cardDisplayStartTimeRef.current = Date.now();
      
      // Resume timer if it was auto-paused
      if (wasAutoPausedRef.current) {
        setTimerActive(true);
        wasAutoPausedRef.current = false;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, cards.length, loading]);

  // Check every second if card has been displayed for more than 60 seconds
  useEffect(() => {
    if (!timerActive || loading || cards.length === 0) return;

    const checkInterval = setInterval(() => {
      if (cardDisplayStartTimeRef.current && timerActive) {
        const timeDisplayed = (Date.now() - cardDisplayStartTimeRef.current) / 1000; // in seconds
        
        if (timeDisplayed > 60) {
          // Auto-pause timer if card shown for more than 60 seconds
          setTimerActive(false);
          wasAutoPausedRef.current = true;
        }
      }
    }, 1000); // Check every second

    return () => clearInterval(checkInterval);
  }, [timerActive, loading, cards.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = async (e) => {
      // Handle '0', '1', and Tab keys even when input is focused (for audio/reset)
      const isAudioKey = e.key === '0' || e.key === '1';
      const isResetKey = e.key === 'Tab';
      
      // Prevent default for audio keys and Tab when input is focused
      if ((isAudioKey || isResetKey) && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        e.preventDefault();
      }
      
      // Don't handle keyboard events if user is typing in an input field (except Enter, 0, 1, Tab)
      if ((e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && e.key !== 'Enter' && !isAudioKey && !isResetKey) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          if (cards.length > 0) {
            goToNextCard();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (cards.length > 0) {
            goToPrevCard();
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          // Arrow up no longer used for known/unknown in spelling page
          break;
        case 'ArrowDown':
          e.preventDefault();
          // Arrow down no longer used for known/unknown in spelling page
          break;
        case 'Enter':
          e.preventDefault();
          if (cards.length > 0 && currentIndex < cards.length && userAnswer.trim()) {
            await checkAnswer();
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
        case 'Tab':
          e.preventDefault();
          if (cards.length > 0 && currentIndex < cards.length) {
            // Reset answer state to allow rewriting the word
            setUserAnswer('');
            setShowAnswer(false);
            // Focus the input field
            if (inputRef.current) {
              inputRef.current.focus();
            }
            // Replay the word audio
            const card = cards[currentIndex];
            if (card && card.englishWord) {
              speakText(card.englishWord, 'en-US', 'audioWord');
            }
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
  }, [cards, currentIndex, userAnswer]);


  const loadDecks = async () => {
    try {
      const response = await flashcardAPI.getMyDecks();
      const loadedDecks = response.data || [];
      setDecks(loadedDecks);
      return loadedDecks;
    } catch (error) {
      console.error('Failed to load decks:', error);
      return [];
    }
  };

  const loadDeckCards = async (showKnownOverride = null) => {
    if (!currentDeck) return;
    
    try {
      setLoading(true);
      setShowResults(false); // Reset results when loading new deck
      // Use override value if provided, otherwise use state
      const shouldShowKnown = showKnownOverride !== null ? showKnownOverride : showKnown;
      // Use 'all' filterType when showKnown is true to get all words including known ones
      const filterType = shouldShowKnown ? 'all' : 'spelling';
      const response = await flashcardAPI.getDeck(currentDeck._id, filterType);
      setCards(response.data.words || []);
      
      // Store deck statistics
      if (response.data.stats) {
        setDeckStats({
          totalWords: response.data.stats.totalWords || 0,
          masteredWords: response.data.stats.masteredWords || 0,
          remainingWords: response.data.stats.remainingWords || 0
        });
      }
      
      setCurrentIndex(0);
      setUserAnswer('');
      setShowAnswer(false);
      // Ensure timer is active when cards are loaded
      setTimerActive(true);
    } catch (error) {
      console.error('Failed to load deck cards:', error);
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultCards = async (showKnownOverride = null) => {
    try {
      setLoading(true);
      // Reset timer when loading default cards
      resetSession();
      // Use override value if provided, otherwise use state
      const shouldShowKnown = showKnownOverride !== null ? showKnownOverride : showKnown;
      const response = await wordAPI.getWordsWithStatus({
        limit: CONSTANTS.WORDS_LIMIT,
        showKnown: shouldShowKnown ? 'true' : 'false',
        showUnknown: 'true'
      });

      let filtered = response.data.words || [];
      // Filter to show only unknown words if showKnown is false
      if (!shouldShowKnown) {
        filtered = filtered.filter(w => w.isKnown !== true);
      }

      // Shuffle cards for variety
      const shuffled = [...filtered].sort(() => Math.random() - 0.5);
      
      setCards(shuffled);
      setCurrentIndex(0);
      setUserAnswer('');
      setShowAnswer(false);
      setCurrentDeck(null);
      // Start timer when default cards are loaded
      setTimerActive(true);
    } catch (error) {
      console.error('Failed to load cards:', error);
      setCards([]);
    } finally {
      setLoading(false);
    }
  };


  // Navigation helpers
  const goToNextCard = () => {
    triggerAnimation('navNext');
    // Move old card left (exit)
    setWritingPaneOffset({ x: -600, y: 0 });
    playTickSound();
    
    setTimeout(() => {
      setCurrentIndex((prevIndex) => {
        // If on last card and trying to go next, show results instead
        if (prevIndex >= cards.length - 1) {
          // Show results when trying to go past the last card
          if (!showResults) {
            setShowResults(true);
            setTimerActive(false);
          }
          setWritingPaneOffset({ x: 0, y: 0 });
          return prevIndex; // Stay on last card
        }
        return prevIndex + 1;
      });
      // Start new card from right and animate to center
      setWritingPaneOffset({ x: 600, y: 0 });
      setTimeout(() => {
        setWritingPaneOffset({ x: 0, y: 0 });
      }, 10);
    }, 150);
  };

  const goToPrevCard = () => {
    triggerAnimation('navPrev');
    // Move old card right (exit)
    setWritingPaneOffset({ x: 600, y: 0 });
    playTockSound();
    
    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex - 1 + cards.length) % cards.length);
      // Start new card from left and animate to center
      setWritingPaneOffset({ x: -600, y: 0 });
      setTimeout(() => {
        setWritingPaneOffset({ x: 0, y: 0 });
      }, 10);
    }, 150);
  };

  const nextCard = () => {
    goToNextCard();
  };

  const prevCard = () => {
    goToPrevCard();
  };

  const randomCard = () => {
    const direction = Math.random() > 0.5 ? -600 : 600;
    setWritingPaneOffset({ x: direction, y: 0 });
    // Random sound - tick or tock
    if (direction < 0) {
      playTickSound();
    } else {
      playTockSound();
    }
    
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * cards.length);
      setCurrentIndex(randomIndex);
      setWritingPaneOffset({ x: 0, y: 0 });
    }, 150);
  };

  // Update spelling status and always advance to next card
  const updateSpellingStatus = async (isSpelled, card = null) => {
    const targetCard = card || cards[currentIndex];
    if (!targetCard || !targetCard._id) return;

    // Always show animation and sound
    triggerAnimation(isSpelled ? 'known' : 'unknown');

    // Start fade/scale transition immediately, at the same time as sound and text overlay
    if (currentIndex < cards.length - 1) {
      setWritingPaneScale(1.05);
      setWritingPaneOpacity(0);
    }

    // Always show text animation overlay
    if (isSpelled) {
      setShowKnownText(true);
      playSuccessSound();
      setTimeout(() => setShowKnownText(false), 200);
    } else {
      setShowUnknownText(true);
      playUnknownSound();
      setTimeout(() => setShowUnknownText(false), 200);
    }

    try {
      await wordAPI.toggleSpellingStatus(targetCard._id, isSpelled);
      
      // Update local card state
      setCards(prevCards => prevCards.map(c => 
        c._id === targetCard._id ? { ...c, isSpelled } : c
      ));

      // Update last studied if using a deck
      if (currentDeck) {
        await flashcardAPI.updateLastStudied(currentDeck._id);
      }
      
      // Wait for fade transition to complete (150ms) before showing new word
      setTimeout(() => {
        if (cards.length > 0 && currentIndex < cards.length) {
          // Check if we're not on the last card before advancing
          if (currentIndex < cards.length - 1) {
            setCurrentIndex((prevIndex) => prevIndex + 1);
            setWritingPaneOffset({ x: 0, y: 0 });
            setWritingPaneScale(1);
            setWritingPaneOpacity(1);
            playTickSound();
          } else {
            // If on last card, show results instead
            if (!showResults) {
              setShowResults(true);
              setTimerActive(false);
            }
          }
        }
      }, 150);
    } catch (error) {
      console.error('Failed to update spelling status:', error);
    }
  };

  // Check answer and mark as correct/incorrect (without advancing)
  const checkAnswer = async () => {
    if (!currentCard || !userAnswer.trim()) return;

    const normalizedUserAnswer = userAnswer.trim().toLowerCase();
    const normalizedCorrectAnswer = currentCard.englishWord.trim().toLowerCase();
    
    // Check if answer is correct (case-insensitive)
    const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;
    
    // Show the answer
    setShowAnswer(true);
    
    // Wait a bit, then mark spelling status (but don't advance)
    setTimeout(async () => {
      await updateSpellingStatus(isCorrect);
    }, 200);
  };

  // Function to play success sound (for known words)
  const playSuccessSound = () => {
    const audioContext = getAudioContext();
    if (!audioContext) return;
    
    try {
      const masterGain = audioContext.createGain();
      masterGain.connect(audioContext.destination);
      masterGain.gain.setValueAtTime(0.2, audioContext.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

      // Create a pleasant chord (C major: C-E-G)
      const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
      
      frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(masterGain);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        // Stagger the start times slightly for a more natural sound
        const startTime = audioContext.currentTime + (index * 0.05);
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.4);
      });
    } catch (error) {
      console.debug('Error playing success sound:', error);
    }
  };

  // Function to play unknown sound (lower, more neutral tone)
  const playUnknownSound = () => {
    const audioContext = getAudioContext();
    if (!audioContext) return;
    
    try {
      const masterGain = audioContext.createGain();
      masterGain.connect(audioContext.destination);
      masterGain.gain.setValueAtTime(0.2, audioContext.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

      // Create a lower, more neutral chord (A minor: A-C-E)
      const frequencies = [440.00, 523.25, 659.25]; // A4, C5, E5
      
      frequencies.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(masterGain);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        // Stagger the start times slightly for a more natural sound
        const startTime = audioContext.currentTime + (index * 0.05);
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.4);
      });
    } catch (error) {
      console.debug('Error playing unknown sound:', error);
    }
  };

  // Function to play clock tick sound (for next card)
  const playTickSound = () => {
    const audioContext = getAudioContext();
    if (!audioContext) return;
    
    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Tick sound - higher pitch, short
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.debug('Error playing tick sound:', error);
    }
  };

  // Function to play clock tock sound (for previous card)
  const playTockSound = () => {
    const audioContext = getAudioContext();
    if (!audioContext) return;
    
    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Tock sound - lower pitch, slightly longer
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.15);
      
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (error) {
      console.debug('Error playing tock sound:', error);
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
        setTimeout(() => setAnimations(prev => ({ ...prev, [animationType]: false })), CONSTANTS.AUDIO_ANIMATION_DURATION);
      }
    }
  };
  
  const triggerAnimation = (key) => {
    setAnimations(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setAnimations(prev => ({ ...prev, [key]: false })), CONSTANTS.ANIMATION_DURATION);
  };

  // Touch gesture handlers
  const minSwipeDistance = CONSTANTS.MIN_SWIPE_DISTANCE;

  const handleTouchStart = (e) => {
    const touch = e.targetTouches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setTouchEnd({ x: null, y: null });
    swipeDetectedRef.current = false;
    // Prevent scrolling when touching the writing pane
    e.preventDefault();
  };

  const handleTouchMove = (e) => {
    const touch = e.targetTouches[0];
    setTouchEnd({ x: touch.clientX, y: touch.clientY });
    // Prevent scrolling during swipe gesture
    e.preventDefault();
  };

  const handleTouchEnd = async (e) => {
    if (!touchStart.x || !touchStart.y || !touchEnd.x || !touchEnd.y) {
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
          goToNextCard();
        }
      } else {
        // Swipe right - previous card
        if (cards.length > 0) {
          goToPrevCard();
        }
      }
    } else if (absDeltaY > absDeltaX && absDeltaY > minSwipeDistance) {
      swipeDetectedRef.current = true;
      // Vertical swipe - no longer used for known/unknown in spelling page
      // Swipe gestures are now only for navigation
    }
    
    // Reset touch state
    setTouchStart({ x: null, y: null });
    setTouchEnd({ x: null, y: null });
    
    // Reset swipe detection after a short delay
    setTimeout(() => {
      swipeDetectedRef.current = false;
    }, CONSTANTS.SWIPE_RESET_DELAY);
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
      // Timer will reset in loadDefaultCards
      await loadDefaultCards();
      return;
    }

    const deck = decks.find(d => d._id === deckId);
    if (deck) {
      // Timer will reset in useEffect when currentDeck changes
      setCurrentDeck(deck);
    }
  };

  // Memoized progress stats (must be called before any early returns)
  const progressStats = useMemo(() => ({
    spelledCorrectly: cards.filter(card => card.isSpelled === true).length,
    spelledIncorrectly: cards.filter(card => card.isSpelled === false).length,
    notSpelled: cards.filter(card => card.isSpelled === null || card.isSpelled === undefined).length,
    // Remaining = cards left AFTER current card (so last card shows remaining = 0, but we still show it)
    remaining: Math.max(0, cards.length - currentIndex - 1)
  }), [cards, currentIndex]);

  const isAnswerCorrect = currentCard && userAnswer.trim() && showAnswer 
    ? userAnswer.trim().toLowerCase() === currentCard.englishWord.trim().toLowerCase()
    : null;

  return (
    <div className="spelling-container">
      {/* Top Bar */}
      <div className="spelling-header">
        <div className="header-title-section">
          <h1>Spelling</h1>
          <select
            value={currentDeck?._id || ''}
            onChange={(e) => handleDeckSelect(e.target.value)}
            className="deck-select"
          >
            <option value="">Default (All Cards)</option>
            {decks.filter(deck => deck.isVisible !== false).map(deck => (
              <option key={deck._id} value={deck._id}>
                {deck.name} ({deck.totalCards} cards)
              </option>
            ))}
          </select>
          <StudyTimer 
            durationFormatted={durationFormatted}
            isActive={timerActive}
            onToggle={() => setTimerActive(!timerActive)}
          />
        </div>
        <div className="header-controls">
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
            <input
              type="checkbox"
              checked={showKnown}
              onChange={(e) => {
                const newValue = e.target.checked;
                setShowKnown(newValue);
                // Reload cards immediately with the new value
                if (currentDeck) {
                  // Reload deck cards with new value
                  loadDeckCards(newValue);
                } else {
                  // Reload default cards with new value
                  loadDefaultCards(newValue);
                }
              }}
              style={{ cursor: 'pointer' }}
            />
            <span>Show known</span>
          </label>
        </div>
      </div>

      {/* Main Content */}
      <div className="spelling-content">
        {/* Center - Writing Area */}
        <div className="spelling-area">
          {loading ? (
            <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <FaHourglassHalf style={{ fontSize: '4rem', opacity: 0.6 }} />
            </div>
          ) : cards.length === 0 ? (
            <div className="empty-state">
              <p>No words available. Select a deck from the dropdown above or create a new deck.</p>
            </div>
          ) : showResults ? (
            <div className="results-page">
              <div className="results-container">
                <h2 className="results-title">🎉 Deck Completed!</h2>
                <div className="results-stats">
                  <div className="result-stat-card">
                    <p className="result-stat-label">Total Cards</p>
                    <p className="result-stat-value">{cards.length}</p>
                  </div>
                  <div className="result-stat-card result-stat-known">
                    <p className="result-stat-label">Spelled Correctly</p>
                    <p className="result-stat-value">{progressStats.spelledCorrectly}</p>
                  </div>
                  <div className="result-stat-card result-stat-unknown">
                    <p className="result-stat-label">Spelled Incorrectly</p>
                    <p className="result-stat-value">{progressStats.spelledIncorrectly}</p>
                  </div>
                  <div className="result-stat-card result-stat-time">
                    <p className="result-stat-label">Time Spent</p>
                    <p className="result-stat-value">{durationFormatted}</p>
                  </div>
                </div>
                <div className="results-actions">
                  <button
                    onClick={() => {
                      setShowResults(false);
                      setCurrentIndex(0);
                      setUserAnswer('');
                      setShowAnswer(false);
                      // Reset timer for new study session
                      resetSession();
                      setTimerActive(true);
                    }}
                    className="btn btn-primary"
                  >
                    Study Again
                  </button>
                  <button
                    onClick={() => {
                      setShowResults(false);
                      setCurrentDeck(null);
                      setCards([]);
                      setCurrentIndex(0);
                      setUserAnswer('');
                      setShowAnswer(false);
                      setTimerActive(false);
                      endSession();
                    }}
                    className="btn btn-secondary"
                  >
                    Select Another Deck
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Progress Bar */}
              <div className="progress-container">
                <div className="progress-info">
                  <span>Word {currentIndex + 1} of {cards.length}</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Image - Separate from writing pane */}
              {currentCard && (
                <div className="spelling-image-container">
                  <img
                    src={currentCard.imageUrl || CONSTANTS.DEFAULT_IMAGE_URL}
                    alt={currentCard.englishWord || 'Word image'}
                    className={`spelling-image ${
                      animations.known ? 'animate-image-known' : 
                      animations.unknown ? 'animate-image-unknown' : ''
                    }`}
                    onError={(e) => { 
                      e.target.src = CONSTANTS.DEFAULT_IMAGE_URL;
                    }}
                  />
                </div>
              )}

              {/* Writing Pane Container */}
              <div className="writing-pane-container">
                <div
                  className="writing-pane"
                  style={{
                    transform: `translateX(${writingPaneOffset.x}px) translateY(${writingPaneOffset.y}px) scale(${writingPaneScale})`,
                    opacity: writingPaneOpacity,
                    transition: isDragging ? 'none' : 'opacity 0.15s ease-in-out, transform 0.15s ease-out, scale 0.15s ease-out'
                  }}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* Known/Unknown text overlay on writing pane */}
                  {showKnownText && (
                    <div className="known-text-overlay">
                      Known
                    </div>
                  )}
                  {showUnknownText && (
                    <div className="unknown-text-overlay">
                      Unknown
                    </div>
                  )}

                  {/* Question: Turkish meaning */}
                  <div className="writing-question">
                    <div className="question-text-container">
                      <h2 className="question-text">{currentCard?.turkishMeaning || ''}</h2>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (currentCard?.englishWord) {
                            speakText(currentCard.englishWord, 'en-US', 'audioWord');
                          }
                        }}
                        className={`audio-btn-inline ${animations.audioWord ? 'animate-sound-wave' : ''}`}
                        title="Pronounce word"
                      >
                        🔊
                      </button>
                    </div>
                  </div>

                  {/* Answer input */}
                  <div className="writing-answer-section">
                    <label className="answer-label answer-label-centered">Type the English word:</label>
                    <input
                      ref={inputRef}
                      type="text"
                      className={`answer-input ${showAnswer ? (isAnswerCorrect ? 'answer-correct' : 'answer-incorrect') : ''}`}
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && userAnswer.trim()) {
                          e.preventDefault();
                          checkAnswer();
                        }
                      }}
                      placeholder="Type your answer..."
                      disabled={showAnswer}
                      autoFocus
                    />
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
                  onClick={() => handleGenerateImage(currentCard?._id)} 
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
            </>
          )}
        </div>

        {/* Right Sidebar - Mark As & Progress */}
        <div className="spelling-sidebar">
          {/* Mark as Section */}
          <div className="mark-as-section">
            <h3 className="mark-as-title">Is Spelled?</h3>
            <div className="status-buttons">
              <button
                onClick={() => updateSpellingStatus(false)}
                className={`status-btn status-unknown ${animations.unknown ? 'animate-pulse-status' : ''}`}
              >
                ❌ No
              </button>
              <button
                onClick={() => updateSpellingStatus(true)}
                className={`status-btn status-known ${animations.known ? 'animate-pulse-status' : ''}`}
              >
                ✅ Yes
              </button>
            </div>
          </div>

          <h3>Progress</h3>
          
          {/* Progress Stats - Showing Spelling Statistics */}
          <div className="stats-grid">
            <div className="stat-card stat-correct">
              <p className="stat-label">Spelled Correctly</p>
              <p className="stat-value">{progressStats.spelledCorrectly}</p>
            </div>

            <div className="stat-card stat-incorrect">
              <p className="stat-label">Spelled Incorrectly</p>
              <p className="stat-value">{progressStats.spelledIncorrectly}</p>
            </div>

            <div className="stat-card stat-remaining">
              <p className="stat-label">Not Spelled Yet</p>
              <p className="stat-value">{progressStats.notSpelled}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Spelling;

