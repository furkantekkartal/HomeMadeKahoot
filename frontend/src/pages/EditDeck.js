import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { flashcardAPI, wordAPI } from '../services/api';
import { DECK_LEVELS, DECK_SKILLS, DECK_TASKS, formatLevel, formatSkill, formatTask } from '../constants/deckConstants';
import './EditDeck.css';

const DEFAULT_IMAGE_URL = 'https://img.freepik.com/free-vector/illustration-gallery-icon_53876-27002.jpg?semt=ais_hybrid&w=740&q=80';

const EditDeck = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [deckData, setDeckData] = useState(null);
  const [words, setWords] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingImages, setGeneratingImages] = useState({});
  const [generatingAllImages, setGeneratingAllImages] = useState(false);
  const [savingWords, setSavingWords] = useState({});
  const [savingAllWords, setSavingAllWords] = useState(false);
  const [customKeywords, setCustomKeywords] = useState({});
  const [searchQueries, setSearchQueries] = useState({});
  const [imageErrors, setImageErrors] = useState({}); // Store errors per word index
  const [imageService, setImageService] = useState(() => {
    // Load from localStorage or default to 'google'
    return localStorage.getItem('imageService') || 'google';
  });

  useEffect(() => {
    loadDeck();
  }, [id]);

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

      // Words are already populated from the backend
      // The backend populates wordIds, so we can use them directly
      // If words array is provided separately, use that instead
      if (deck.words && deck.words.length > 0) {
        setWords(deck.words);
      } else if (deck.wordIds && deck.wordIds.length > 0) {
        setWords(deck.wordIds);
      } else {
        setWords([]);
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
      // Update words in database
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

      // Update deck
      const wordIds = words.map(word => word._id);
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

  const handleGenerateImage = async (wordId, wordIndex) => {
    setGeneratingImages({ ...generatingImages, [wordIndex]: true });
    // Clear previous error for this specific word
    setImageErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[wordIndex];
      return newErrors;
    });
    setError(''); // Clear general error

    try {
      const customKeyword = customKeywords[wordIndex]?.trim();
      const response = await wordAPI.generateWordImage(wordId, customKeyword, imageService);
      const newImageUrl = response.data.imageUrl;
      const searchQuery = response.data.searchQuery;
      
      // Store the search query for display (always show it)
      setSearchQueries(prev => ({ ...prev, [wordIndex]: searchQuery }));
      
      // Update the word in the words array
      const updatedWords = [...words];
      updatedWords[wordIndex] = { ...updatedWords[wordIndex], imageUrl: newImageUrl };
      setWords(updatedWords);
    } catch (err) {
      // Set error specific to this word, displayed under the image
      const errorMessage = err.response?.data?.message || err.message || 'Failed to generate image';
      setImageErrors(prev => ({ ...prev, [wordIndex]: errorMessage }));
    } finally {
      setGeneratingImages({ ...generatingImages, [wordIndex]: false });
    }
  };

  const handleGenerateAllImages = async () => {
    if (words.length === 0) {
      setError('No words to generate images for');
      return;
    }

    // Filter words that need images (no imageUrl or empty imageUrl)
    const wordsNeedingImages = words.filter((word, index) => {
      return word._id && (!word.imageUrl || word.imageUrl.trim() === '' || word.imageUrl === DEFAULT_IMAGE_URL);
    });

    if (wordsNeedingImages.length === 0) {
      setError('All words already have images');
      return;
    }

    setGeneratingAllImages(true);
    setError('');

    try {
      // Generate images only for words that don't have images
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        // Skip words that already have an image
        if (!word._id || (word.imageUrl && word.imageUrl.trim() !== '' && word.imageUrl !== DEFAULT_IMAGE_URL)) {
          continue;
        }

        setGeneratingImages(prev => ({ ...prev, [i]: true }));
        // Clear previous error for this word
        setImageErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[i];
          return newErrors;
        });
        try {
          const customKeyword = customKeywords[i]?.trim();
          const response = await wordAPI.generateWordImage(word._id, customKeyword, imageService);
          const newImageUrl = response.data.imageUrl;
          const searchQuery = response.data.searchQuery;
          
          // Store the search query for display
          setSearchQueries(prev => ({ ...prev, [i]: searchQuery }));
          
          // Update the word in the words array
          setWords(prevWords => {
            const updated = [...prevWords];
            updated[i] = { ...updated[i], imageUrl: newImageUrl };
            return updated;
          });
        } catch (err) {
          // Set error specific to this word
          const errorMessage = err.response?.data?.message || err.message || 'Failed to generate image';
          setImageErrors(prev => ({ ...prev, [i]: errorMessage }));
          console.error(`Failed to generate image for word ${i + 1}:`, err);
        } finally {
          setGeneratingImages(prev => ({ ...prev, [i]: false }));
        }
      }
    } catch (err) {
      setError('Failed to generate some images');
    } finally {
      setGeneratingAllImages(false);
    }
  };

  const handleImageServiceChange = (service) => {
    setImageService(service);
    localStorage.setItem('imageService', service);
  };

  const handleWordFieldChange = (wordIndex, field, value) => {
    const updatedWords = [...words];
    updatedWords[wordIndex] = { ...updatedWords[wordIndex], [field]: value };
    setWords(updatedWords);
  };

  const handleRemoveWord = (wordIndex) => {
    if (window.confirm('Are you sure you want to remove this word from the deck?')) {
      const updatedWords = words.filter((_, index) => index !== wordIndex);
      setWords(updatedWords);
    }
  };

  const handleSaveWord = async (wordIndex) => {
    const word = words[wordIndex];
    if (!word || !word._id) {
      setError('Word ID is required');
      return;
    }

    setSavingWords({ ...savingWords, [wordIndex]: true });
    setError('');

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
      
      // Show success feedback (optional - could use a toast notification)
      console.log(`Word ${wordIndex + 1} saved successfully`);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to save word ${wordIndex + 1}`);
    } finally {
      setSavingWords({ ...savingWords, [wordIndex]: false });
    }
  };

  const handleSaveAllWords = async () => {
    if (words.length === 0) {
      setError('No words to save');
      return;
    }

    setSavingAllWords(true);
    setError('');

    try {
      // Save all words sequentially
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        if (word._id) {
          setSavingWords(prev => ({ ...prev, [i]: true }));
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
            console.error(`Failed to save word ${i + 1}:`, err);
          } finally {
            setSavingWords(prev => ({ ...prev, [i]: false }));
          }
        }
      }
    } catch (err) {
      setError('Failed to save some words');
    } finally {
      setSavingAllWords(false);
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
      <div className="edit-deck-form">
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

          <div className="words-section">
            <div className="words-header">
              <h2>Words ({words.length})</h2>
              {words.length > 0 && (
                <div className="words-header-actions">
                  <div className="image-service-selector">
                    <label className="image-service-label">Image Service:</label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="imageService"
                          value="google"
                          checked={imageService === 'google'}
                          onChange={(e) => handleImageServiceChange(e.target.value)}
                        />
                        <span>Google</span>
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="imageService"
                          value="unsplash"
                          checked={imageService === 'unsplash'}
                          onChange={(e) => handleImageServiceChange(e.target.value)}
                        />
                        <span>Unsplash</span>
                      </label>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveAllWords}
                    className="btn btn-primary btn-sm"
                    disabled={savingAllWords}
                  >
                    {savingAllWords ? 'Saving All...' : '💾 Save All'}
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateAllImages}
                    className="btn btn-primary btn-sm"
                    disabled={generatingAllImages}
                  >
                    {generatingAllImages ? 'Generating All Images...' : '🖼️ Generate All Images'}
                  </button>
                </div>
              )}
            </div>

            {words.length === 0 ? (
              <div className="no-words-message">
                <p>No words in this deck. Add words from the Create Deck page.</p>
              </div>
            ) : (
              <div className="words-list">
                {words.map((word, wordIndex) => (
                  <div key={word._id || wordIndex} className="word-card">
                    <div className="word-header">
                      <h3>Word {wordIndex + 1}</h3>
                      <div className="word-header-actions">
                        <button
                          type="button"
                          onClick={() => handleSaveWord(wordIndex)}
                          className="btn btn-primary btn-sm"
                          disabled={savingWords[wordIndex]}
                        >
                          {savingWords[wordIndex] ? 'Saving...' : '💾 Save'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveWord(wordIndex)}
                          className="btn btn-danger btn-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="word-content">
                      <div className="word-main-info">
                        <div className="form-group">
                          <label className="form-label">English Word</label>
                          <input
                            type="text"
                            className="form-input form-input-small"
                            value={word.englishWord || ''}
                            onChange={(e) => handleWordFieldChange(wordIndex, 'englishWord', e.target.value)}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Turkish Meaning</label>
                          <input
                            type="text"
                            className="form-input form-input-small"
                            value={word.turkishMeaning || ''}
                            onChange={(e) => handleWordFieldChange(wordIndex, 'turkishMeaning', e.target.value)}
                          />
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label className="form-label">Word Type</label>
                            <input
                              type="text"
                              className="form-input form-input-small"
                              value={word.wordType || ''}
                              onChange={(e) => handleWordFieldChange(wordIndex, 'wordType', e.target.value)}
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">English Level</label>
                            <input
                              type="text"
                              className="form-input form-input-small"
                              value={word.englishLevel || ''}
                              onChange={(e) => handleWordFieldChange(wordIndex, 'englishLevel', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="form-row">
                          <div className="form-group">
                            <label className="form-label">Category 1</label>
                            <input
                              type="text"
                              className="form-input form-input-small"
                              value={word.category1 || ''}
                              onChange={(e) => handleWordFieldChange(wordIndex, 'category1', e.target.value)}
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Category 2</label>
                            <input
                              type="text"
                              className="form-input form-input-small"
                              value={word.category2 || ''}
                              onChange={(e) => handleWordFieldChange(wordIndex, 'category2', e.target.value)}
                            />
                          </div>

                          <div className="form-group">
                            <label className="form-label">Category 3</label>
                            <input
                              type="text"
                              className="form-input form-input-small"
                              value={word.category3 || ''}
                              onChange={(e) => handleWordFieldChange(wordIndex, 'category3', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Sample Sentence (English)</label>
                          <textarea
                            className="form-input form-input-small"
                            rows="2"
                            value={word.sampleSentenceEn || ''}
                            onChange={(e) => handleWordFieldChange(wordIndex, 'sampleSentenceEn', e.target.value)}
                          />
                        </div>

                        <div className="form-group">
                          <label className="form-label">Sample Sentence (Turkish)</label>
                          <textarea
                            className="form-input form-input-small"
                            rows="2"
                            value={word.sampleSentenceTr || ''}
                            onChange={(e) => handleWordFieldChange(wordIndex, 'sampleSentenceTr', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="word-image-section">
                        <div className="form-group">
                          <label className="form-label">Word Image</label>
                          <div className="image-controls">
                            <input
                              type="text"
                              className="form-input form-input-small keywords-input"
                              placeholder="Custom keywords (optional)"
                              value={customKeywords[wordIndex] || ''}
                              onChange={(e) => setCustomKeywords({ ...customKeywords, [wordIndex]: e.target.value })}
                            />
                            <button
                              type="button"
                              onClick={() => handleGenerateImage(word._id, wordIndex)}
                              className="btn btn-secondary btn-sm image-generate-btn"
                              disabled={generatingImages[wordIndex]}
                              title="Generate Image"
                            >
                              {generatingImages[wordIndex] ? '⏳' : '🖼️'}
                            </button>
                          </div>
                          {/* Always show search query if it exists */}
                          {searchQueries[wordIndex] && (
                            <div className="search-query-log">
                              <small>Search: <strong>{searchQueries[wordIndex]}</strong></small>
                            </div>
                          )}
                          {/* Show image-specific error under the search log */}
                          {imageErrors[wordIndex] && (
                            <div className="image-error-message">
                              <small>{imageErrors[wordIndex]}</small>
                            </div>
                          )}
                          {word.imageUrl && (
                            <div className="word-image-preview">
                              <img 
                                src={word.imageUrl} 
                                alt={word.englishWord}
                                loading="lazy"
                                onError={(e) => {
                                  // Use fallback image instead of hiding
                                  if (e.target.src !== DEFAULT_IMAGE_URL) {
                                    e.target.src = DEFAULT_IMAGE_URL;
                                  } else {
                                    // If fallback also fails, hide the image gracefully
                                    e.target.style.display = 'none';
                                    e.target.parentElement.style.display = 'none';
                                    // Set error for this specific word
                                    setImageErrors(prev => ({ 
                                      ...prev, 
                                      [wordIndex]: 'Failed to load image (original and fallback both failed)' 
                                    }));
                                  }
                                }}
                                onLoad={(e) => {
                                  // Ensure image is visible when it loads successfully
                                  e.target.style.display = '';
                                  e.target.parentElement.style.display = '';
                                  // Clear any loading errors when image loads successfully
                                  setImageErrors(prev => {
                                    const newErrors = { ...prev };
                                    delete newErrors[wordIndex];
                                    return newErrors;
                                  });
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
    </div>
  );
};

export default EditDeck;

