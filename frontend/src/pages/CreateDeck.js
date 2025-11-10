import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { wordAPI, flashcardAPI } from '../services/api';
import { DECK_LEVELS, DECK_SKILLS, DECK_TASKS } from '../constants/deckConstants';
import './CreateDeck.css';

const CreateDeck = () => {
  const navigate = useNavigate();
  const [words, setWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deckName, setDeckName] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [level, setLevel] = useState('');
  const [skill, setSkill] = useState('');
  const [task, setTask] = useState('');
  const [questionNumber, setQuestionNumber] = useState(20);
  const [creating, setCreating] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    englishLevel: '',
    wordType: '',
    category1: '',
    category2: '',
    category3: '',
    showKnown: true,
    showUnknown: true
  });
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    englishLevel: '',
    wordType: '',
    category1: '',
    category2: '',
    category3: '',
    showKnown: true,
    showUnknown: true
  });
  const [generatingTitle, setGeneratingTitle] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);

  useEffect(() => {
    loadData();
  }, [page, appliedFilters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await wordAPI.getWordsWithStatus({
        page,
        limit: 50,
        ...appliedFilters,
        showKnown: appliedFilters.showKnown ? 'true' : 'false',
        showUnknown: appliedFilters.showUnknown ? 'true' : 'false'
      });
      
      setWords(response.data.words);
      setTotalPages(response.data.pagination.pages);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load words');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
    setPage(1);
  };

  const handleSelectWord = (wordId) => {
    setSelectedWords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(wordId)) {
        newSet.delete(wordId);
      } else {
        newSet.add(wordId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedWords.size === words.length && words.length > 0) {
      // Deselect all words on current page
      words.forEach(word => {
        setSelectedWords(prev => {
          const newSet = new Set(prev);
          newSet.delete(word._id);
          return newSet;
        });
      });
    } else {
      // Select all words on current page
      words.forEach(word => {
        setSelectedWords(prev => new Set([...prev, word._id]));
      });
    }
  };

  const generateTitle = async () => {
    if (!level || !skill || !task) {
      alert('Please select Level, Skill, and Task first');
      return;
    }

    setGeneratingTitle(true);
    try {
      const response = await flashcardAPI.generateDeckTitle(level, skill, task);
      setDeckName(response.data.title);
    } catch (error) {
      console.error('Error generating title:', error);
      alert('Failed to generate title: ' + (error.response?.data?.message || error.message));
    } finally {
      setGeneratingTitle(false);
    }
  };

  const generateDescription = async () => {
    if (!deckName.trim()) {
      alert('Please enter or generate a title first');
      return;
    }

    if (!level || !skill || !task) {
      alert('Please select Level, Skill, and Task first');
      return;
    }

    setGeneratingDescription(true);
    try {
      const response = await flashcardAPI.generateDeckDescription(deckName, level, skill, task);
      setDeckDescription(response.data.description);
    } catch (error) {
      console.error('Error generating description:', error);
      alert('Failed to generate description: ' + (error.response?.data?.message || error.message));
    } finally {
      setGeneratingDescription(false);
    }
  };


  const handleCreateDeck = async () => {
    if (!deckName.trim()) {
      alert('Please enter a deck name');
      return;
    }

    if (selectedWords.size === 0) {
      alert('Please select at least one word');
      return;
    }

    try {
      setCreating(true);
      await flashcardAPI.createDeck(
        deckName.trim(),
        deckDescription.trim(),
        level || null,
        skill || null,
        task || null,
        Array.from(selectedWords)
      );
      alert('Deck created successfully!');
      navigate(-1); // Go back to previous page
    } catch (error) {
      console.error('Error creating deck:', error);
      alert('Failed to create deck: ' + (error.response?.data?.message || error.message));
    } finally {
      setCreating(false);
    }
  };

  const allSelected = words.length > 0 && words.every(word => selectedWords.has(word._id));
  const someSelected = words.some(word => selectedWords.has(word._id)) && !allSelected;

  return (
    <div className="create-deck-container">
      <div className="create-deck-header">
        <h1>Create New Deck</h1>
        <button onClick={() => navigate(-1)} className="btn btn-secondary">
          Cancel
        </button>
      </div>

      {/* Deck Informations Section */}
      <div className="enhanced-ai-section" style={{ marginBottom: '2rem', padding: '1.5rem', border: '2px dashed #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Deck Informations</h2>
        
        <div>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <div className="input-with-icon">
                <input
                  type="text"
                  className="form-input"
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  placeholder="Enter deck title..."
                  required
                />
                <button
                  type="button"
                  onClick={generateTitle}
                  className="icon-button"
                  disabled={generatingTitle || !level || !skill || !task}
                  title="Generate title with AI"
                >
                  {generatingTitle ? '⏳' : '✨'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <div className="textarea-with-icon">
                <textarea
                  className="form-input"
                  rows="3"
                  value={deckDescription}
                  onChange={(e) => setDeckDescription(e.target.value)}
                  placeholder="Enter deck description..."
                />
                <button
                  type="button"
                  onClick={generateDescription}
                  className="icon-button"
                  disabled={generatingDescription || !deckName.trim() || !level || !skill || !task}
                  title="Generate description with AI"
                >
                  {generatingDescription ? '⏳' : '✨'}
                </button>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Level *</label>
                <select
                  className="form-select"
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  required
                >
                  <option value="">Select Level</option>
                  {DECK_LEVELS.map(lvl => (
                    <option key={lvl} value={lvl}>{lvl}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Skill *</label>
                <select
                  className="form-select"
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                  required
                >
                  <option value="">Select Skill</option>
                  {DECK_SKILLS.map(skl => (
                    <option key={skl} value={skl}>{skl}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Task *</label>
                <select
                  className="form-select"
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  required
                >
                  <option value="">Select Task</option>
                  {DECK_TASKS.map(tsk => (
                    <option key={tsk} value={tsk}>{tsk}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Question Number</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="50"
                  value={questionNumber}
                  onChange={(e) => setQuestionNumber(parseInt(e.target.value) || 20)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '1.5rem' }}>
              <button
                onClick={handleCreateDeck}
                disabled={creating || !deckName.trim() || selectedWords.size === 0 || !level || !skill || !task}
                className="btn btn-primary btn-large"
                style={{ width: '100%' }}
              >
                {creating ? 'Creating...' : `Create Deck (${selectedWords.size} words)`}
              </button>
            </div>
          </div>
      </div>

      {/* Word List Section */}
      <div className="manual-creation-section">
        <h2>Word List</h2>
        
        <div className="selected-count">
          {selectedWords.size} word{selectedWords.size !== 1 ? 's' : ''} selected
        </div>

        {/* Filters */}
        <div className="word-filters">
          <input
            type="text"
            placeholder="Search words..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="filter-input"
          />
          <select
            value={filters.englishLevel}
            onChange={(e) => handleFilterChange('englishLevel', e.target.value)}
            className="filter-select"
          >
            <option value="">All Levels</option>
            {DECK_LEVELS.map(lvl => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
          <select
            value={filters.wordType}
            onChange={(e) => handleFilterChange('wordType', e.target.value)}
            className="filter-select"
          >
            <option value="">All Types</option>
            {words
              .map(w => w.wordType)
              .filter((t, i, arr) => t && arr.indexOf(t) === i)
              .sort()
              .map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
          </select>
          <select
            value={filters.category1}
            onChange={(e) => handleFilterChange('category1', e.target.value)}
            className="filter-select"
          >
            <option value="">All Category 1</option>
            {words
              .map(w => w.category1)
              .filter((c, i, arr) => c && arr.indexOf(c) === i)
              .sort()
              .map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
          </select>
          <select
            value={filters.category2}
            onChange={(e) => handleFilterChange('category2', e.target.value)}
            className="filter-select"
          >
            <option value="">All Category 2</option>
            {words
              .map(w => w.category2)
              .filter((c, i, arr) => c && arr.indexOf(c) === i)
              .sort()
              .map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
          </select>
          <select
            value={filters.category3}
            onChange={(e) => handleFilterChange('category3', e.target.value)}
            className="filter-select"
          >
            <option value="">All Category 3</option>
            {words
              .map(w => w.category3)
              .filter((c, i, arr) => c && arr.indexOf(c) === i)
              .sort()
              .map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
          </select>
          <div className="filter-checkbox">
            <input
              type="checkbox"
              id="show-known"
              checked={filters.showKnown}
              onChange={(e) => handleFilterChange('showKnown', e.target.checked)}
            />
            <label htmlFor="show-known">Show Known</label>
          </div>
          <div className="filter-checkbox">
            <input
              type="checkbox"
              id="show-unknown"
              checked={filters.showUnknown}
              onChange={(e) => handleFilterChange('showUnknown', e.target.checked)}
            />
            <label htmlFor="show-unknown">Show Unknown</label>
          </div>
          <button
            onClick={handleApplyFilters}
            className="btn btn-primary"
          >
            Apply Filters
          </button>
        </div>

        {/* Words Table */}
        <div className="words-table-container">
          {loading ? (
            <div className="loading">Loading words...</div>
          ) : words.length === 0 ? (
            <div className="empty-state">
              <p>No words found matching your filters.</p>
            </div>
          ) : (
            <table className="words-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(input) => {
                        if (input) input.indeterminate = someSelected;
                      }}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>English Word</th>
                  <th>Turkish Meaning</th>
                  <th>Word Type</th>
                  <th>English Level</th>
                  <th>Category 1</th>
                  <th>Category 2</th>
                  <th>Category 3</th>
                </tr>
              </thead>
              <tbody>
                {words.map(word => (
                  <tr 
                    key={word._id} 
                    className={`word-row ${selectedWords.has(word._id) ? 'selected' : ''} ${word.isKnown === true ? 'known' : word.isKnown === false ? 'unknown' : ''}`}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedWords.has(word._id)}
                        onChange={() => handleSelectWord(word._id)}
                      />
                    </td>
                    <td className="word-english-cell">
                      <strong>{word.englishWord}</strong>
                    </td>
                    <td className="word-meaning-cell">{word.turkishMeaning || '-'}</td>
                    <td className="word-type-cell">
                      {word.wordType || '-'}
                    </td>
                    <td className="word-level-cell">
                      {word.englishLevel ? (
                        <span className="word-level-badge">{word.englishLevel}</span>
                      ) : '-'}
                    </td>
                    <td className="word-category-cell">
                      {word.category1 || '-'}
                    </td>
                    <td className="word-category-cell">
                      {word.category2 || '-'}
                    </td>
                    <td className="word-category-cell">
                      {word.category3 || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-secondary"
            >
              Previous
            </button>
            <span className="page-info">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn btn-secondary"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateDeck;
