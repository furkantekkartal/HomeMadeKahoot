import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { wordAPI, flashcardAPI } from '../services/api';
import { useStudyTimer } from '../hooks/useStudyTimer';
import StudyTimer from '../components/Common/StudyTimer';
import './Writing.css';

const Writing = () => {
  const navigate = useNavigate();
  
  // Exercise state
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [score, setScore] = useState({ correct: 0, incorrect: 0, total: 0 });
  const [hasRetried, setHasRetried] = useState(false);

  // Deck state
  const [decks, setDecks] = useState([]);
  const [currentDeck, setCurrentDeck] = useState(null);

  // Setup state
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('unknown'); // unknown, known, all
  const [loading, setLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  // Study timer
  const [timerActive, setTimerActive] = useState(true);
  const { durationFormatted, isActive, endSession } = useStudyTimer('Writing', timerActive);

  useEffect(() => {
    loadDecks();
    loadWords();
  }, []);

  useEffect(() => {
    if (currentDeck) {
      loadDeckWords();
    }
  }, [currentDeck]);

  // Reload words when filters change (only if no deck is selected)
  useEffect(() => {
    if (!currentDeck && (words.length > 0 || !loading)) {
      loadWords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLevel, selectedStatus]);

  const loadDecks = async () => {
    try {
      const response = await flashcardAPI.getMyDecks();
      setDecks(response.data);
    } catch (error) {
      console.error('Failed to load decks:', error);
    }
  };

  const loadDeckWords = async () => {
    if (!currentDeck) return;
    
    setLoading(true);
    try {
      const response = await flashcardAPI.getDeck(currentDeck._id);
      const deckWords = response.data.wordIds || [];
      
      // Apply status filter if needed
      let filtered = deckWords;
      if (selectedStatus === 'unknown') {
        filtered = filtered.filter(w => w.isKnown !== true);
      } else if (selectedStatus === 'known') {
        filtered = filtered.filter(w => w.isKnown === true);
      }

      // Shuffle (use all words from deck, no limit)
      const shuffled = [...filtered].sort(() => Math.random() - 0.5);

      setWords(shuffled);
      setCurrentIndex(0);
      setScore({ correct: 0, incorrect: 0, total: 0 });
      setHasRetried(false);
      resetInput();
    } catch (error) {
      console.error('Failed to load deck words:', error);
      setWords([]);
    } finally {
      setLoading(false);
    }
  };

  const loadWords = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (selectedLevel) filters.englishLevel = selectedLevel;

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

      // Shuffle (use all words, no limit)
      const shuffled = [...filtered].sort(() => Math.random() - 0.5);

      setWords(shuffled);
      setCurrentIndex(0);
      setScore({ correct: 0, incorrect: 0, total: 0 });
      setHasRetried(false);
      resetInput();
    } catch (error) {
      console.error('Failed to load words:', error);
      setWords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeckSelect = async (deckId) => {
    if (!deckId) {
      setCurrentDeck(null);
      await loadWords();
      return;
    }

    const deck = decks.find(d => d._id === deckId);
    if (deck) {
      setCurrentDeck(deck);
    }
  };

  const handleGenerateImage = async (wordId) => {
    if (!wordId) return;
    
    try {
      setGeneratingImage(true);
      const response = await wordAPI.generateWordImage(wordId);
      
      // Update the current word with the new image URL
      setWords(words.map(w => 
        w._id === wordId ? { ...w, imageUrl: response.data.imageUrl } : w
      ));
    } catch (error) {
      console.error('Failed to generate image:', error);
      alert('Failed to generate image: ' + (error.response?.data?.message || error.message));
    } finally {
      setGeneratingImage(false);
    }
  };

  const resetInput = () => {
    setUserInput('');
    setShowAnswer(false);
    setIsCorrect(null);
  };

  const retryWord = () => {
    setUserInput('');
    setShowAnswer(false);
    setIsCorrect(null);
    setHasRetried(true);
  };

  const checkAnswer = () => {
    const currentWord = words[currentIndex];
    const correct = userInput.trim().toLowerCase() === currentWord.englishWord.toLowerCase();
    
    setIsCorrect(correct);
    setShowAnswer(true);
    
    // Only update score if this is the first attempt (not a retry)
    if (!hasRetried) {
      setScore(prev => ({
        correct: prev.correct + (correct ? 1 : 0),
        incorrect: prev.incorrect + (correct ? 0 : 1),
        total: prev.total + 1
      }));
    } else {
      // On retry, update the score: if now correct, move from incorrect to correct
      if (correct) {
        setScore(prev => ({
          correct: prev.correct + 1,
          incorrect: Math.max(0, prev.incorrect - 1),
          total: prev.total
        }));
      }
    }
  };

  const nextWord = async () => {
    const currentWord = words[currentIndex];
    
    // Update word status based on correctness
    if (isCorrect && currentWord._id) {
      try {
        await wordAPI.toggleWordStatus(currentWord._id, true);
        // Update local state
        setWords(words.map(w => 
          w._id === currentWord._id ? { ...w, isKnown: true } : w
        ));
      } catch (error) {
        console.error('Failed to update word status:', error);
      }
    }

    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setHasRetried(false);
      resetInput();
    } else {
      // Exercise complete
      const finalCorrect = isCorrect ? score.correct + 1 : score.correct;
      const finalTotal = score.total + (hasRetried ? 0 : 1);
      const accuracy = finalTotal > 0 ? Math.round((finalCorrect / finalTotal) * 100) : 0;
      alert(`Exercise complete!\nScore: ${finalCorrect}/${finalTotal}\nAccuracy: ${accuracy}%`);
      // Reset for new exercise
      loadWords();
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

  // Auto-play English pronunciation when word changes
  useEffect(() => {
    if (words.length > 0 && currentIndex >= 0 && currentIndex < words.length) {
      const currentWord = words[currentIndex];
      if (currentWord && currentWord.englishWord) {
        // Auto-play after a short delay
        setTimeout(() => {
          speakText(currentWord.englishWord, 'en-US');
        }, 500);
      }
    }
  }, [currentIndex, words]);

  if (loading && words.length === 0) {
    return (
      <div className="writing-container">
        <div className="loading-state">
          <div className="loading-icon">✍️</div>
          <h2>Loading Words...</h2>
          <p>Please wait</p>
        </div>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="writing-container">
        <div className="writing-header">
          <h1>Writing Practice</h1>
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
              <option value="">Default (All Words)</option>
              {decks.map(deck => (
                <option key={deck._id} value={deck._id}>
                  {deck.name} ({deck.totalCards} words)
                </option>
              ))}
            </select>

            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="filter-select"
              disabled={!!currentDeck}
            >
              <option value="">All Levels</option>
              {levels.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
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
            <button 
              onClick={() => currentDeck ? loadDeckWords() : loadWords()} 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Loading...' : 'New Exercise'}
            </button>
          </div>
        </div>
        <div className="empty-state">
          <div className="empty-icon">✍️</div>
          <h2>No Words Available</h2>
          <p>
            {selectedLevel || selectedStatus !== 'all'
              ? 'No words match your current filters. Try adjusting the filters or generate words first.'
              : 'No words in database. Go to Words page to import some words first.'}
          </p>
          <div className="empty-actions">
            <button onClick={loadWords} className="btn btn-primary">
              Reload Words
            </button>
            <button onClick={() => window.location.href = '/words'} className="btn btn-secondary">
              Go to Words Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const progress = ((currentIndex + 1) / words.length) * 100;

  return (
    <div className="writing-container">
      {/* Header */}
      <div className="writing-header">
        <h1>Writing Practice</h1>
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
            <option value="">Default (All Words)</option>
            {decks.map(deck => (
              <option key={deck._id} value={deck._id}>
                {deck.name} ({deck.totalCards} words)
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
      <div className="writing-content">
        {/* Center - Exercise Area */}
        <div className="writing-exercise-area">
          {/* Progress Bar */}
          <div className="progress-container">
            <div className="progress-info">
              <span>Word {currentIndex + 1} of {words.length}</span>
              <span>Score: {score.correct}/{score.total}</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Image Pane - Separate from card */}
          <div className="image-pane">
            {currentWord.imageUrl && currentWord.imageUrl !== '' ? (
              <div className="image-pane-wrapper">
                <img
                  src={currentWord.imageUrl}
                  alt={currentWord.englishWord}
                  className="image-pane-img"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleGenerateImage(currentWord._id); 
                  }}
                  className="replace-image-btn"
                  disabled={generatingImage}
                  title="Replace image"
                >
                  {generatingImage ? '⏳' : '🖼️'}
                </button>
              </div>
            ) : (
              <div className="image-pane-placeholder">
                <span className="placeholder-icon">🖼️</span>
                <p className="placeholder-text">No image available</p>
                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    handleGenerateImage(currentWord._id); 
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

          {/* Exercise Card */}
          <div className="exercise-card">
            {/* Turkish Word + Audio */}
            <div className="word-display">
              <div className="word-header">
                <h2 className="turkish-word">
                  {currentWord.turkishMeaning}
                </h2>
                <button
                  onClick={() => speakText(currentWord.englishWord, 'en-US')}
                  className="audio-btn"
                  title="Play English pronunciation"
                >
                  🔊
                </button>
              </div>
              <p className="word-hint">Type the English word • Audio plays automatically</p>
            </div>

            {/* Input Field */}
            <div className="input-container">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && userInput.trim() && !showAnswer) {
                    checkAnswer();
                  }
                }}
                placeholder="Type your answer..."
                disabled={showAnswer}
                className="answer-input"
                autoFocus
              />
            </div>

            {/* Show Answer */}
            {showAnswer && (
              <div className={`answer-feedback ${isCorrect ? 'correct' : 'incorrect'}`}>
                <div className="feedback-header">
                  {isCorrect ? (
                    <>
                      <span className="feedback-icon">✅</span>
                      <p className="feedback-word">{currentWord.englishWord}</p>
                    </>
                  ) : (
                    <>
                      <span className="feedback-icon">❌</span>
                      <p className="feedback-word">{currentWord.englishWord}</p>
                    </>
                  )}
                </div>

                {/* Sample Sentences */}
                {(currentWord.sampleSentenceEn || currentWord.sampleSentenceTr) && (
                  <div className="sample-sentences">
                    {currentWord.sampleSentenceEn && (
                      <p className="sentence-en">"{currentWord.sampleSentenceEn}"</p>
                    )}
                    {currentWord.sampleSentenceTr && (
                      <p className="sentence-tr">"{currentWord.sampleSentenceTr}"</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="action-buttons">
              {!showAnswer ? (
                <button
                  onClick={checkAnswer}
                  disabled={!userInput.trim()}
                  className="btn btn-primary btn-large"
                >
                  Check Answer
                </button>
              ) : (
                <>
                  {!isCorrect && (
                    <button
                      onClick={retryWord}
                      className="btn btn-secondary btn-large"
                    >
                      Retry
                    </button>
                  )}
                  <button
                    onClick={nextWord}
                    className="btn btn-primary btn-large"
                  >
                    {currentIndex < words.length - 1 ? 'Next Word →' : 'Finish'}
                  </button>
                </>
              )}
            </div>

            {/* Hint */}
            {!showAnswer && (
              <p className="exercise-hint">
                Press Enter to check • Word type: {currentWord.wordType}
              </p>
            )}
          </div>
        </div>

        {/* Right Sidebar - Progress & Stats */}
        <div className="writing-sidebar">
          {/* Mark as Section */}
          <div className="mark-as-section">
            <h3 className="mark-as-title">Mark as</h3>
            <div className="status-buttons">
              <button
                onClick={() => {
                  if (currentWord._id) {
                    wordAPI.toggleWordStatus(currentWord._id, false).then(() => {
                      setWords(words.map(w => 
                        w._id === currentWord._id ? { ...w, isKnown: false } : w
                      ));
                    }).catch(err => console.error('Failed to update word status:', err));
                  }
                }}
                className="status-btn status-unknown"
              >
                ❓ Unknown
              </button>
              <button
                onClick={() => {
                  if (currentWord._id) {
                    wordAPI.toggleWordStatus(currentWord._id, true).then(() => {
                      setWords(words.map(w => 
                        w._id === currentWord._id ? { ...w, isKnown: true } : w
                      ));
                    }).catch(err => console.error('Failed to update word status:', err));
                  }
                }}
                className="status-btn status-known"
              >
                ✅ Known
              </button>
            </div>
          </div>

          <h3>Progress</h3>
          
          {/* Score Stats */}
          <div className="stats-grid">
            <div className="stat-card stat-correct">
              <p className="stat-label">Correct</p>
              <p className="stat-value">{score.correct}</p>
            </div>

            <div className="stat-card stat-incorrect">
              <p className="stat-label">Incorrect</p>
              <p className="stat-value">{score.incorrect}</p>
            </div>

            <div className="stat-card stat-remaining">
              <p className="stat-label">Remaining</p>
              <p className="stat-value">
                {words.length - currentIndex - 1}
              </p>
            </div>
          </div>

          {/* Accuracy */}
          {score.total > 0 && (
            <div className="stat-card stat-accuracy">
              <p className="stat-label">Accuracy</p>
              <p className="stat-value-large">
                {Math.round((score.correct / score.total) * 100)}%
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Writing;

