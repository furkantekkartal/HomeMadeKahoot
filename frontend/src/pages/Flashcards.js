import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { wordAPI, flashcardAPI, pronunciationAPI } from '../services/api';
import { useStudyTimer } from '../hooks/useStudyTimer';
import StudyTimer from '../components/Common/StudyTimer';
import { AudioRecorder } from '../utils/audioRecorder';
import { FaHourglassHalf } from 'react-icons/fa';
import './Flashcards.css';

// Constants
const CONSTANTS = {
  MIN_SWIPE_DISTANCE: 50,
  AUTO_ADVANCE_DELAY: 300,
  ANIMATION_DURATION: 600,
  AUDIO_ANIMATION_DURATION: 500,
  SWIPE_RESET_DELAY: 100,
  DEFAULT_IMAGE_URL: 'https://img.freepik.com/free-vector/illustration-gallery-icon_53876-27002.jpg?semt=ais_hybrid&w=740&q=80',
  WORDS_LIMIT: 10000
};

const Flashcards = () => {
  const location = useLocation();
  
  // Deck state
  const [decks, setDecks] = useState([]);
  const [currentDeck, setCurrentDeck] = useState(null);
  const [deckTotalWords, setDeckTotalWords] = useState(0); // Store only total from backend

  // Card state
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

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

  // State for card stack animation
  const [cardStackOffset, setCardStackOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

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
  const isUpdatingDeckTypeRef = useRef(false);
  const isEdgeTouchRef = useRef(false); // Track if touch started in edge area
  const cardElementRef = useRef(null); // Reference to the card element

  // Auto-pause timer state
  const cardDisplayStartTimeRef = useRef(null);
  const wasAutoPausedRef = useRef(false);
  const isUpdatingStatusRef = useRef(false);
  const hasUserInteractedRef = useRef(false); // Track if user has interacted (required for speech synthesis autoplay policy)

  // Study timer
  const [timerActive, setTimerActive] = useState(true);
  const { durationFormatted, isActive, endSession, resetSession } = useStudyTimer('Flashcards', timerActive);

  // Speech evaluation state
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingWord, setIsRecordingWord] = useState(false);
  const [isRecordingSentence, setIsRecordingSentence] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioBlobWord, setAudioBlobWord] = useState(null);
  const [audioBlobSentence, setAudioBlobSentence] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioUrlWord, setAudioUrlWord] = useState(null);
  const [audioUrlSentence, setAudioUrlSentence] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResults, setEvaluationResults] = useState(null);
  const [evaluationType, setEvaluationType] = useState(null); // 'word' or 'sentence'
  const audioRecorderRef = useRef(null);
  const recordingTypeRef = useRef(null); // Track which recording type is active
  const evaluationResultsRef = useRef(null); // Ref for speech evaluation results pane

  // Track user interaction to enable speech synthesis (required by browser autoplay policies)
  useEffect(() => {
    const handleUserInteraction = () => {
      hasUserInteractedRef.current = true;
    };

    // Listen for any user interaction (click, touch, keydown)
    // This is required for speech synthesis to work due to browser autoplay policies
    window.addEventListener('click', handleUserInteraction, { once: true, passive: true });
    window.addEventListener('touchstart', handleUserInteraction, { once: true, passive: true });
    window.addEventListener('keydown', handleUserInteraction, { once: true, passive: true });

    return () => {
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
    };
  }, []);

  useEffect(() => {
    const initializeFlashcards = async () => {
      // First, load decks
      const loadedDecks = await loadDecks();
      
      // Auto-select first deck if available
      if (loadedDecks && loadedDecks.length > 0) {
        // Check if deckId was passed from navigation
        const deckIdFromState = location.state?.deckId;
        if (deckIdFromState) {
          const deck = loadedDecks.find(d => d._id === deckIdFromState);
          if (deck) {
            setCurrentDeck(deck);
            // Clear the state to avoid re-selecting on re-renders
            window.history.replaceState({}, document.title);
            setLoading(false);
            return;
          }
        }
        // Otherwise, automatically select the first deck
        setCurrentDeck(loadedDecks[0]);
        setLoading(false);
      } else {
        // No decks available, load default cards
        await loadDefaultCards();
      }
    };
    initializeFlashcards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-select deck from navigation state or first deck when decks are loaded (fallback)
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
  }, [decks.length, cards.length, loading, currentDeck]);

  useEffect(() => {
    if (currentDeck && !isUpdatingDeckTypeRef.current) {
      // Reset timer when a new deck is selected and start it
      resetSession();
      setTimerActive(true);
      loadDeckCards();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDeck]);

  // Reset evaluation state and audio recordings when card changes
  useEffect(() => {
    setEvaluationResults(null);
    setEvaluationType(null);
    // Clear audio recordings when navigating to a new card
    if (audioUrlWord) {
      URL.revokeObjectURL(audioUrlWord);
    }
    if (audioUrlSentence) {
      URL.revokeObjectURL(audioUrlSentence);
    }
    setAudioBlobWord(null);
    setAudioBlobSentence(null);
    setAudioUrlWord(null);
    setAudioUrlSentence(null);
    setIsRecordingWord(false);
    setIsRecordingSentence(false);
    setIsRecording(false);
    // Stop any active recording
    if (audioRecorderRef.current) {
      try {
        audioRecorderRef.current.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
      audioRecorderRef.current = null;
      recordingTypeRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  // Calculate currentCard for use in effects (same approach as Spelling page)
  const currentCard = cards.length > 0 && currentIndex < cards.length ? cards[currentIndex] : null;

  // Auto-read word when card changes (only when currentIndex changes, not when cards array updates)
  useEffect(() => {  
    if (currentCard && currentCard.englishWord && !loading) {
      // Small delay to ensure card is fully loaded and speech synthesis is ready
      const timer = setTimeout(() => {
        // Double-check the flag in case it changed during the delay
        if (!isUpdatingStatusRef.current && hasUserInteractedRef.current) {
          speakText(currentCard.englishWord, 'en-US', 'audioWord');
        }
      }, 400); // Increased delay to ensure speech synthesis is ready
      return () => clearTimeout(timer);
    }
    // Only depend on currentIndex and loading - not cards array to avoid triggering on status updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, loading, currentCard?.englishWord]);

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
      // Don't handle keyboard events if user is typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
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
          if (cards.length > 0 && currentIndex < cards.length) {
            await handleStatusUpdate(true);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (cards.length > 0 && currentIndex < cards.length) {
            await handleStatusUpdate(false);
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
          // Flip card (same as clicking on the card) - always toggle to the other side
          if (cards.length > 0) {
            setIsFlipped(prev => !prev);
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
      // Backend returns array directly, not wrapped in data property
      const loadedDecks = Array.isArray(response.data) ? response.data : [];
      setDecks(loadedDecks);
      return loadedDecks;
    } catch (error) {
      console.error('Failed to load decks:', error);
      setDecks([]);
      return [];
    }
  };

  const loadDeckCards = async () => {
    if (!currentDeck) return;
    
    try {
      setLoading(true);
      setShowResults(false); // Reset results when loading new deck
      const response = await flashcardAPI.getDeck(currentDeck._id, 'flashcards');
      setCards(response.data.words || []);
      setCurrentIndex(0);
      setIsFlipped(false);
      // Store deck total words (mastered and remaining will be calculated dynamically)
      if (response.data.stats) {
        setDeckTotalWords(response.data.stats.totalWords || 0);
      } else {
        // Fallback: use wordIds length or words length
        const total = response.data.wordIds?.length || response.data.words?.length || 0;
        setDeckTotalWords(total);
      }
      // Update currentDeck with deckType if available and different (prevent infinite loop)
      if (response.data.deckType && currentDeck && currentDeck.deckType !== response.data.deckType) {
        isUpdatingDeckTypeRef.current = true;
        setCurrentDeck(prev => prev ? { ...prev, deckType: response.data.deckType } : prev);
        setTimeout(() => {
          isUpdatingDeckTypeRef.current = false;
        }, 0);
      }
      // Ensure timer is active when cards are loaded
      setTimerActive(true);
    } catch (error) {
      console.error('Failed to load deck cards:', error);
      setCards([]);
      setDeckTotalWords(0);
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultCards = async () => {
    try {
      setLoading(true);
      // Reset timer when loading default cards
      resetSession();
      const response = await wordAPI.getWordsWithStatus({
        limit: CONSTANTS.WORDS_LIMIT,
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
    setIsFlipped(false);
    setCardStackOffset({ x: -600, y: 0 });
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
          setCardStackOffset({ x: 0, y: 0 });
          return prevIndex; // Stay on last card
        }
        return prevIndex + 1;
      });
      setCardStackOffset({ x: 0, y: 0 });
    }, 300);
  };

  const goToPrevCard = () => {
    triggerAnimation('navPrev');
    setIsFlipped(false);
    setCardStackOffset({ x: 600, y: 0 });
    playTockSound();
    
    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex - 1 + cards.length) % cards.length);
      setCardStackOffset({ x: 0, y: 0 });
    }, 300);
  };

  const nextCard = () => {
    goToNextCard();
  };

  const prevCard = () => {
    goToPrevCard();
  };

  const randomCard = () => {
    setIsFlipped(false);
    const direction = Math.random() > 0.5 ? -600 : 600;
    setCardStackOffset({ x: direction, y: 0 });
    // Random sound - tick or tock
    if (direction < 0) {
      playTickSound();
    } else {
      playTockSound();
    }
    
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * cards.length);
      setCurrentIndex(randomIndex);
      setCardStackOffset({ x: 0, y: 0 });
    }, 300);
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

  // Shared function for status updates
  const handleStatusUpdate = async (isKnown, card = null) => {
    const targetCard = card || cards[currentIndex];
    if (!targetCard || !targetCard._id) return;

    // If already in the desired state, don't do anything
    if (isKnown && targetCard.isKnown === true) {
      return;
    }
    if (!isKnown && targetCard.isKnown === false) {
      return;
    }

    // Prevent multiple simultaneous status updates
    if (isUpdatingStatusRef.current) {
      return;
    }

    // Cancel any ongoing speech
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }

    // Set flag to prevent auto-read during status update
    isUpdatingStatusRef.current = true;

    // Show animation and sound for both known and unknown
    if (isKnown) {
      triggerAnimation('known');
      // Show text animation overlay for known
      if (!showKnownText) {
        setShowKnownText(true);
        playSuccessSound();
        setTimeout(() => setShowKnownText(false), 300);
        goToNextCard();
      }
    } else {
      triggerAnimation('unknown');
      // Show text animation overlay for unknown
      if (!showUnknownText) {
        setShowUnknownText(true);
        playUnknownSound();
        setTimeout(() => setShowUnknownText(false), 300);
        goToNextCard();
      }
    }

    try {
      // STEP 1: Mark as known/unknown (update status first)
      await wordAPI.toggleWordStatus(targetCard._id, isKnown);
      
      // Update local card state - this will trigger deckStats recalculation via useMemo
      setCards(prevCards => prevCards.map(c => 
        c._id === targetCard._id ? { ...c, isKnown } : c
      ));

      // Update last studied if using a deck
      if (currentDeck) {
        await flashcardAPI.updateLastStudied(currentDeck._id);
      }
      
      // STEP 2: After status is updated, automatically advance to next card
      // Wait for text overlay animation (300ms) + small buffer (50ms) = 350ms
      setTimeout(() => {
        if (cards.length > 0 && currentIndex < cards.length) {
          // Check if we're not on the last card before advancing
          if (currentIndex < cards.length - 1) {
            goToNextCard();
          } else {
            // If on last card, show results instead
            if (!showResults) {
              setShowResults(true);
              setTimerActive(false);
            }
          }
        }
        // Reset flag after advancing to next card
        isUpdatingStatusRef.current = false;
      }, 350);
    } catch (error) {
      console.error('Failed to update card status:', error);
      // Reset flag on error
      isUpdatingStatusRef.current = false;
    }
  };

  const updateCardStatus = async (isKnown) => {
    await handleStatusUpdate(isKnown);
  };

  const speakText = (text, lang = 'en-US', animationType = null) => {
    if ('speechSynthesis' in window) {
      try {
        // Trigger animation immediately for visual feedback
        if (animationType) {
          setAnimations(prev => ({ ...prev, [animationType]: true }));
          setTimeout(() => setAnimations(prev => ({ ...prev, [animationType]: false })), CONSTANTS.AUDIO_ANIMATION_DURATION);
        }
        
        // Cancel any ongoing speech before starting new one
        speechSynthesis.cancel();
        
        // Small delay to ensure speech synthesis is ready after cancel
        setTimeout(() => {
          try {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            utterance.rate = 0.9;
            
            utterance.onend = () => {
              // Speech completed
            };
            
            utterance.onerror = (error) => {
              console.debug('Speech synthesis error:', error);
            };
            
            speechSynthesis.speak(utterance);
          } catch (error) {
            console.debug('Error creating/speaking utterance:', error);
          }
        }, 50);
      } catch (error) {
        console.debug('Error in speakText:', error);
        // Still trigger animation even if speech fails
        if (animationType) {
          setAnimations(prev => ({ ...prev, [animationType]: true }));
          setTimeout(() => setAnimations(prev => ({ ...prev, [animationType]: false })), CONSTANTS.AUDIO_ANIMATION_DURATION);
        }
      }
    } else if (animationType) {
      // If speech synthesis is not available, still show animation for consistency
      setAnimations(prev => ({ ...prev, [animationType]: true }));
      setTimeout(() => setAnimations(prev => ({ ...prev, [animationType]: false })), CONSTANTS.AUDIO_ANIMATION_DURATION);
    }
  };
  
  const triggerAnimation = (key) => {
    setAnimations(prev => ({ ...prev, [key]: true }));
    setTimeout(() => setAnimations(prev => ({ ...prev, [key]: false })), CONSTANTS.ANIMATION_DURATION);
  };

  // Touch gesture handlers
  const minSwipeDistance = CONSTANTS.MIN_SWIPE_DISTANCE;
  const EDGE_THRESHOLD = 0.15; // 15% of card width from each edge

  const handleTouchStart = (e) => {
    const touch = e.targetTouches[0];
    const touchX = touch.clientX;
    
    // Check if touch is in edge area (left or right 15% of card)
    if (cardElementRef.current) {
      const cardRect = cardElementRef.current.getBoundingClientRect();
      const cardWidth = cardRect.width;
      const relativeX = touchX - cardRect.left;
      const edgeWidth = cardWidth * EDGE_THRESHOLD;
      
      // Check if touch is in left or right edge
      if (relativeX < edgeWidth || relativeX > (cardWidth - edgeWidth)) {
        // Touch is in edge area - allow page scrolling
        isEdgeTouchRef.current = true;
        // Don't prevent default - allow native scrolling behavior
        // Let event bubble naturally for scrolling
        return;
      }
    }
    
    // Touch is in center area - handle gesture
    isEdgeTouchRef.current = false;
    setTouchStart({ x: touchX, y: touch.clientY });
    setTouchEnd({ x: null, y: null });
    swipeDetectedRef.current = false;
    // Don't prevent default here - we'll check movement direction in handleTouchMove
  };

  const handleTouchMove = (e) => {
    // If touch started in edge area, don't interfere with scrolling at all
    if (isEdgeTouchRef.current) {
      // Don't prevent default - allow native scrolling
      // Let event bubble naturally for scrolling
      return;
    }
    
    const touch = e.targetTouches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;
    
    // Always update touchEnd to track position for gesture detection
    setTouchEnd({ x: currentX, y: currentY });
    
    // Check if this is primarily a vertical movement (scrolling)
    if (touchStart.x !== null && touchStart.y !== null) {
      const deltaX = Math.abs(currentX - touchStart.x);
      const deltaY = Math.abs(currentY - touchStart.y);
      
      // If vertical movement is greater, allow scrolling (don't prevent default)
      if (deltaY > deltaX) {
        // This is a vertical scroll - don't prevent default to allow scrolling
        return;
      }
    }
    
    // For horizontal movements, prevent default to enable swipe gestures
    e.preventDefault();
  };

  const handleTouchEnd = async (e) => {
    // If touch started in edge area, don't process gestures and allow normal behavior
    if (isEdgeTouchRef.current) {
      isEdgeTouchRef.current = false;
      // Don't prevent default - allow normal touch end behavior
      // Let event bubble naturally
      return;
    }
    
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
      // Vertical swipe - only process if not in edge area
      if (deltaY > 0) {
        // Swipe up - known word
        if (cards.length > 0 && currentIndex < cards.length) {
          await handleStatusUpdate(true);
        }
      } else {
        // Swipe down - unknown word
        if (cards.length > 0 && currentIndex < cards.length) {
          await handleStatusUpdate(false);
        }
      }
    }
    
    // Reset touch state
    setTouchStart({ x: null, y: null });
    setTouchEnd({ x: null, y: null });
    
    // Reset swipe detection after a short delay to allow click handler to check
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

  // Speech evaluation handlers
  const startRecording = async (type) => {
    try {
      // Reset previous results
      setEvaluationResults(null);
      setEvaluationType(null);
      
      // Clear previous audio
      if (type === 'word') {
        setAudioBlobWord(null);
        setAudioUrlWord(null);
      } else {
        setAudioBlobSentence(null);
        setAudioUrlSentence(null);
      }

      audioRecorderRef.current = new AudioRecorder();
      await audioRecorderRef.current.start();
      setIsRecording(true);
      recordingTypeRef.current = type;
      
      if (type === 'word') {
        setIsRecordingWord(true);
      } else {
        setIsRecordingSentence(true);
      }
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Unable to access microphone. Please ensure microphone permissions are granted.');
      audioRecorderRef.current = null;
      setIsRecording(false);
      setIsRecordingWord(false);
      setIsRecordingSentence(false);
    }
  };

  const stopRecording = () => {
    if (audioRecorderRef.current && isRecording) {
      const wavBlob = audioRecorderRef.current.stop();
      const url = URL.createObjectURL(wavBlob);
      const type = recordingTypeRef.current;
      
      if (type === 'word') {
        setAudioBlobWord(wavBlob);
        setAudioUrlWord(url);
        setIsRecordingWord(false);
      } else {
        setAudioBlobSentence(wavBlob);
        setAudioUrlSentence(url);
        setIsRecordingSentence(false);
      }
      
      setIsRecording(false);
      audioRecorderRef.current = null;
      recordingTypeRef.current = null;
    }
  };

  const handleRecordAgain = (type) => {
    if (type === 'word') {
      setAudioBlobWord(null);
      setAudioUrlWord(null);
    } else {
      setAudioBlobSentence(null);
      setAudioUrlSentence(null);
    }
    setEvaluationResults(null);
    setEvaluationType(null);
  };

  const handleEvaluate = async (type) => {
    const audioBlob = type === 'word' ? audioBlobWord : audioBlobSentence;
    const currentCard = cards[currentIndex];
    
    if (!audioBlob || !currentCard) {
      return;
    }

    const referenceText = type === 'word' 
      ? currentCard.englishWord 
      : (currentCard.sampleSentenceEn || currentCard.englishWord);

    if (!referenceText) {
      alert('No reference text available for evaluation');
      return;
    }

    setIsEvaluating(true);
    setEvaluationType(type);
    setEvaluationResults(null);

    try {
      const response = await pronunciationAPI.assessPronunciation(audioBlob, referenceText, type);
      setEvaluationResults(response.data);
    } catch (error) {
      console.error('Error evaluating pronunciation:', error);
      alert('Failed to evaluate pronunciation: ' + (error.response?.data?.error || error.message));
      setEvaluationResults(null);
      setEvaluationType(null);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Handle mouse/touch events for press-and-hold
  const handleMicMouseDown = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    startRecording(type);
  };

  const handleMicMouseUp = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isRecording) {
      stopRecording();
    }
  };

  const handleMicTouchStart = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    startRecording(type);
  };

  const handleMicTouchEnd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isRecording) {
      stopRecording();
    }
  };

  // Cleanup audio URLs on unmount
  useEffect(() => {
    return () => {
      if (audioUrlWord) URL.revokeObjectURL(audioUrlWord);
      if (audioUrlSentence) URL.revokeObjectURL(audioUrlSentence);
    };
  }, [audioUrlWord, audioUrlSentence]);

  // Auto-scroll to evaluation results when they become visible
  useEffect(() => {
    if (evaluationResults && evaluationType && evaluationResultsRef.current) {
      // Small delay to ensure the element is rendered
      setTimeout(() => {
        evaluationResultsRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }, 100);
    }
  }, [evaluationResults, evaluationType]);


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
    known: cards.filter(card => card.isKnown === true).length,
    unknown: cards.filter(card => card.isKnown !== true).length,
    // Remaining = total unknown words (not cards left to study)
    remaining: cards.filter(card => card.isKnown !== true).length
  }), [cards]);

  // Memoized deck stats - calculated dynamically from cards array
  const deckStats = useMemo(() => {
    if (!currentDeck || cards.length === 0) {
      return { totalWords: 0, masteredWords: 0, remainingWords: 0 };
    }
    const totalWords = deckTotalWords || cards.length;
    const masteredWords = cards.filter(card => card.isKnown === true).length;
    const remainingWords = cards.filter(card => card.isKnown !== true).length;
    return { totalWords, masteredWords, remainingWords };
  }, [cards, currentDeck, deckTotalWords]);

  // Check if deck is completed - only show results when user tries to advance past last card
  // We don't check remaining === 0 here because that would trigger on the last card itself
  // Instead, we check in goToNextCard and handleStatusUpdate when trying to go past the last card

  return (
    <div className="flashcards-container">
      {/* Top Bar */}
      <div className="flashcards-header">
        <div className="header-title-section">
        <h1>Flashcards</h1>
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
        </div>
      </div>

      {/* Main Content */}
      <div className="flashcards-content">
        {/* Center - Card Area */}
        <div className="flashcard-area">
          {loading ? (
            <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <FaHourglassHalf style={{ fontSize: '4rem', opacity: 0.6 }} />
            </div>
          ) : cards.length === 0 ? (
            <div className="empty-state">
              <p>No flashcards available. Select a deck from the dropdown above or create a new deck.</p>
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
                    <p className="result-stat-label">Known</p>
                    <p className="result-stat-value">{progressStats.known}</p>
                  </div>
                  <div className="result-stat-card result-stat-unknown">
                    <p className="result-stat-label">Unknown</p>
                    <p className="result-stat-value">{progressStats.unknown}</p>
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
                      setIsFlipped(false);
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
                      setIsFlipped(false);
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
                  <span>Card {currentIndex + 1} of {cards.length}</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

          {/* Image - Separate from card stack */}
          {currentCard && (
            <div className="flashcard-image-container">
              <img
                src={currentCard.imageUrl || CONSTANTS.DEFAULT_IMAGE_URL}
                alt={currentCard.englishWord || 'Word image'}
                className={`flashcard-image ${
                  animations.known ? 'animate-image-known' : 
                  animations.unknown ? 'animate-image-unknown' : ''
                }`}
                onError={(e) => { 
                  e.target.src = CONSTANTS.DEFAULT_IMAGE_URL;
                }}
              />
            </div>
          )}

          {/* Card Stack Container - Only flashcards */}
          <div className="card-stack-container">
            {/* Show up to 3 cards in the stack */}
            {cards.slice(currentIndex, currentIndex + 3).map((card, stackIndex) => {
              const isTopCard = stackIndex === 0;
              const cardIndex = currentIndex + stackIndex;
              
              return (
                <div key={`${card._id}-${cardIndex}`} className="card-stack-wrapper">
                  {/* Flashcard */}
                  <div
                    ref={isTopCard ? cardElementRef : null}
                    className={`flashcard card-stack-item ${isFlipped && isTopCard ? 'flipped' : ''} ${
                      isTopCard ? 'card-stack-top' : ''
                    }`}
                    style={{
                      transform: isTopCard 
                        ? `translateX(${cardStackOffset.x}px) translateY(${cardStackOffset.y}px)`
                        : `translateY(${stackIndex * 8}px) scale(${1 - stackIndex * 0.05})`,
                      zIndex: 10 - stackIndex,
                      opacity: 1,
                      transition: isDragging ? 'none' : 'transform 0.3s ease-out'
                    }}
                    onClick={(e) => {
                      if (!isTopCard) return;
                      // Only flip on click if no swipe was detected
                      if (!swipeDetectedRef.current) {
                        setIsFlipped(prev => !prev);
                      }
                    }}
                    onTouchStart={isTopCard ? handleTouchStart : undefined}
                    onTouchMove={isTopCard ? handleTouchMove : undefined}
                    onTouchEnd={isTopCard ? handleTouchEnd : undefined}
                  >
                    {/* Known/Unknown text overlay on card */}
                    {isTopCard && showKnownText && (
                      <div className="known-text-overlay">
                        Known
                      </div>
                    )}
                    {isTopCard && showUnknownText && (
                      <div className="unknown-text-overlay">
                        Unknown
                      </div>
                    )}
                    <div className="flashcard-inner">
                      {/* Front */}
                      <div className="flashcard-front">
                        <div className="card-word-container">
                          <h2 className="card-word">{card.englishWord}</h2>
                          <div className="audio-controls-group">
                            <button
                              onClick={(e) => { 
                                if (isTopCard) {
                                  e.stopPropagation(); 
                                  speakText(card.englishWord);
                                }
                              }}
                              className={`audio-btn-inline ${isTopCard && animations.audioWord ? 'animate-sound-wave' : ''}`}
                              title="Pronounce word"
                              disabled={!isTopCard}
                            >
                              🔊
                            </button>
                            {isTopCard && (
                              <>
                                {!isRecordingWord && !audioBlobWord && (
                                  <button
                                    onMouseDown={(e) => handleMicMouseDown(e, 'word')}
                                    onMouseUp={handleMicMouseUp}
                                    onMouseLeave={handleMicMouseUp}
                                    onTouchStart={(e) => handleMicTouchStart(e, 'word')}
                                    onTouchEnd={handleMicTouchEnd}
                                    className="mic-btn-inline"
                                    title="Hold to record word"
                                    disabled={isRecording || isEvaluating}
                                  >
                                    🎤
                                  </button>
                                )}
                                {isRecordingWord && (
                                  <button
                                    onMouseUp={handleMicMouseUp}
                                    onMouseLeave={handleMicMouseUp}
                                    onTouchEnd={handleMicTouchEnd}
                                    className="mic-btn-inline recording"
                                    title="Recording... Release to stop"
                                  >
                                    <span className="recording-pulse"></span>
                                  </button>
                                )}
                                {audioBlobWord && !isRecordingWord && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (audioUrlWord) {
                                          const audio = new Audio(audioUrlWord);
                                          audio.play();
                                        }
                                      }}
                                      className="play-btn-inline"
                                      title="Play recording"
                                    >
                                      ▶️
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRecordAgain('word');
                                      }}
                                      className="record-again-btn-inline"
                                      title="Record again"
                                      disabled={isEvaluating}
                                    >
                                      🔄
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEvaluate('word');
                                      }}
                                      className="evaluate-btn-inline"
                                      title="Send for evaluation"
                                      disabled={isEvaluating}
                                    >
                                      {isEvaluating && evaluationType === 'word' ? (
                                        <span className="spinner-small"></span>
                                      ) : (
                                        '📊'
                                      )}
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        <p className="card-type">{card.wordType}</p>
                        {card.sampleSentenceEn && (
                          <div className="card-sentence-container">
                            <p className="card-sentence">"{card.sampleSentenceEn}"</p>
                            <div className="card-sentence-controls">
                            <div className="audio-controls-group">
                              <button
                                onClick={(e) => { 
                                  if (isTopCard) {
                                    e.stopPropagation(); 
                                    speakText(card.sampleSentenceEn);
                                  }
                                }}
                                className={`audio-btn-inline ${isTopCard && animations.audioSentence ? 'animate-sound-wave' : ''}`}
                                title="Pronounce sentence"
                                disabled={!isTopCard}
                              >
                                🔊
                              </button>
                              {isTopCard && (
                                <>
                                  {!isRecordingSentence && !audioBlobSentence && (
                                    <button
                                      onMouseDown={(e) => handleMicMouseDown(e, 'sentence')}
                                      onMouseUp={handleMicMouseUp}
                                      onMouseLeave={handleMicMouseUp}
                                      onTouchStart={(e) => handleMicTouchStart(e, 'sentence')}
                                      onTouchEnd={handleMicTouchEnd}
                                      className="mic-btn-inline"
                                      title="Hold to record sentence"
                                      disabled={isRecording || isEvaluating}
                                    >
                                      🎤
                                    </button>
                                  )}
                                  {isRecordingSentence && (
                                    <button
                                      onMouseUp={handleMicMouseUp}
                                      onMouseLeave={handleMicMouseUp}
                                      onTouchEnd={handleMicTouchEnd}
                                      className="mic-btn-inline recording"
                                      title="Recording... Release to stop"
                                    >
                                      <span className="recording-pulse"></span>
                                    </button>
                                  )}
                                  {audioBlobSentence && !isRecordingSentence && (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (audioUrlSentence) {
                                            const audio = new Audio(audioUrlSentence);
                                            audio.play();
                                          }
                                        }}
                                        className="play-btn-inline"
                                        title="Play recording"
                                      >
                                        ▶️
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRecordAgain('sentence');
                                        }}
                                        className="record-again-btn-inline"
                                        title="Record again"
                                        disabled={isEvaluating}
                                      >
                                        🔄
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEvaluate('sentence');
                                        }}
                                        className="evaluate-btn-inline"
                                        title="Send for evaluation"
                                        disabled={isEvaluating}
                                      >
                                        {isEvaluating && evaluationType === 'sentence' ? (
                                          <span className="spinner-small"></span>
                                        ) : (
                                          '📊'
                                        )}
                                      </button>
                                    </>
                                  )}
                                </>
                              )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Back */}
                      <div className="flashcard-back">
                        <div className="card-word-container">
                          <h2 className="card-word">{card.turkishMeaning}</h2>
                          <button
                            onClick={(e) => { 
                              if (isTopCard) {
                                e.stopPropagation(); 
                                speakText(card.turkishMeaning, 'tr-TR');
                              }
                            }}
                            className="audio-btn-inline"
                            title="Kelimeyi telaffuz et"
                            disabled={!isTopCard}
                          >
                            🔊
                          </button>
                        </div>
                        <p className="card-translation">{card.englishWord}</p>
                        {card.sampleSentenceTr && (
                          <div className="card-sentence-container">
                            <p className="card-sentence">"{card.sampleSentenceTr}"</p>
                            <div className="card-sentence-controls">
                              <div className="audio-controls-group">
                            <button
                              onClick={(e) => { 
                                if (isTopCard) {
                                  e.stopPropagation(); 
                                  speakText(card.sampleSentenceTr, 'tr-TR');
                                }
                              }}
                              className="audio-btn-inline"
                              title="Cümleyi telaffuz et"
                              disabled={!isTopCard}
                            >
                              🔊
                            </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Speech Evaluation Results Pane */}
          {evaluationResults && evaluationType && (
            <div ref={evaluationResultsRef} className="speech-evaluation-results">
              <div className="results-header">
                <h3>Your Results <span className="ai-label">(AI Detection)</span></h3>
              </div>
              
              <div className="results-content">
                {/* Recognized text with color coding */}
                <div className="recognized-text-box">
                  {evaluationResults.words && evaluationResults.words.map((word, index) => {
                    const getWordClassName = (errorType) => {
                      switch (errorType) {
                        case 'None':
                          return 'word-correct';
                        case 'Omission':
                          return 'word-missing';
                        case 'Mispronunciation':
                          return 'word-wrong';
                        default:
                          return '';
                      }
                    };
                    
                    return (
                      <span
                        key={index}
                        className={`word ${getWordClassName(word.errorType)}`}
                        title={`Score: ${Math.round(word.accuracyScore)}`}
                      >
                        {word.word}{' '}
                      </span>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="legend">
                  <span className="legend-item">
                    <span className="legend-color correct"></span> matched
                  </span>
                  <span className="legend-item">
                    <span className="legend-color missing"></span> missing
                  </span>
                  <span className="legend-item">
                    <span className="legend-color wrong"></span> wrong
                  </span>
                </div>

                {/* Audio Player */}
                {evaluationType === 'word' && audioUrlWord && (
                  <div className="audio-player-container">
                    <audio controls src={audioUrlWord}>
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}
                {evaluationType === 'sentence' && audioUrlSentence && (
                  <div className="audio-player-container">
                    <audio controls src={audioUrlSentence}>
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}

                {/* Scores */}
                <div className="score-card">
                  <div className="score-header">
                    <span>Enabling Skills</span>
                    <span className="score-value">{evaluationResults.pteScore || 0} / 90</span>
                  </div>

                  <div className="score-metrics">
                    <div className="metric">
                      <div className="metric-header">
                        <span>📝 Content</span>
                        <span className="metric-score">
                          {evaluationResults.contentScore || 0} / 90
                        </span>
                      </div>
                      <div className="metric-bar">
                        <div
                          className="metric-fill"
                          style={{
                            width: `${(evaluationResults.contentScore || 0) * 100 / 90}%`,
                            backgroundColor: '#667eea'
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="metric">
                      <div className="metric-header">
                        <span>🗣️ Pronunciation</span>
                        <span className="metric-score">
                          {evaluationResults.pronunciationScore || 0} / 90
                        </span>
                      </div>
                      <div className="metric-bar">
                        <div
                          className="metric-fill"
                          style={{
                            width: `${(evaluationResults.pronunciationScore || 0) * 100 / 90}%`,
                            backgroundColor: '#667eea'
                          }}
                        ></div>
                      </div>
                    </div>

                    <div className="metric">
                      <div className="metric-header">
                        <span>⚡ Oral Fluency</span>
                        <span className="metric-score">
                          {evaluationResults.fluencyScore || 0} / 90
                        </span>
                      </div>
                      <div className="metric-bar">
                        <div
                          className="metric-fill"
                          style={{
                            width: `${(evaluationResults.fluencyScore || 0) * 100 / 90}%`,
                            backgroundColor: '#667eea'
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

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
            </>
          )}
        </div>

        {/* Right Sidebar - Mark As */}
        <div className="flashcard-sidebar">
          {/* Progress Section - First in mobile view */}
          <div className="progress-section">
          <h3>Progress</h3>
          
          {/* Progress Stats - Now showing Deck Statistics */}
          {currentDeck ? (
            <div className="stats-grid">
              <div className="stat-card stat-incorrect">
                <p className="stat-label">Total Words</p>
                <p className="stat-value">{deckStats.totalWords}</p>
              </div>

              <div className="stat-card stat-correct">
                <p className="stat-label">Mastered</p>
                <p className="stat-value">{deckStats.masteredWords}</p>
              </div>

              <div className="stat-card stat-remaining">
                <p className="stat-label">Remaining</p>
                <p className="stat-value">{deckStats.remainingWords}</p>
              </div>
            </div>
          ) : (
          <div className="stats-grid">
            <div className="stat-card stat-correct">
              <p className="stat-label">Known</p>
              <p className="stat-value">{progressStats.known}</p>
            </div>

            <div className="stat-card stat-incorrect">
              <p className="stat-label">Unknown</p>
              <p className="stat-value">{progressStats.unknown}</p>
            </div>

            <div className="stat-card stat-remaining">
              <p className="stat-label">Remaining</p>
              <p className="stat-value">{progressStats.remaining}</p>
            </div>
            </div>
          )}
          </div>

          {/* Mark as Section - Second in mobile view */}
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
        </div>
      </div>

    </div>
  );
};

export default Flashcards;

