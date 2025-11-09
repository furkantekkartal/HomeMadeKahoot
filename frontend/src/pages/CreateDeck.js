import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { wordAPI, flashcardAPI } from '../services/api';
import './CreateDeck.css';

const CreateDeck = () => {
  const navigate = useNavigate();
  const [words, setWords] = useState([]);
  const [selectedWords, setSelectedWords] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deckName, setDeckName] = useState('');
  const [creating, setCreating] = useState(false);
  const [categories1, setCategories1] = useState([]);
  const [categories2, setCategories2] = useState([]);
  const [categories3, setCategories3] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    category1: '',
    category2: '',
    category3: '',
    englishLevel: '',
    wordType: '',
    showKnown: true,
    showUnknown: true
  });

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadData();
  }, [page, filters]);

  const loadCategories = async () => {
    try {
      const response = await wordAPI.getWordsWithStatus({ limit: 1000 });
      const allWords = response.data.words || [];
      
      const cat1 = [...new Set(allWords.map(w => w.category1).filter(c => c))].sort();
      const cat2 = [...new Set(allWords.map(w => w.category2).filter(c => c))].sort();
      const cat3 = [...new Set(allWords.map(w => w.category3).filter(c => c))].sort();
      
      setCategories1(cat1);
      setCategories2(cat2);
      setCategories3(cat3);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await wordAPI.getWordsWithStatus({
        page,
        limit: 20,
        ...filters,
        showKnown: filters.showKnown ? 'true' : 'false',
        showUnknown: filters.showUnknown ? 'true' : 'false'
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
    if (selectedWords.size === words.length) {
      setSelectedWords(new Set());
    } else {
      setSelectedWords(new Set(words.map(w => w._id)));
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
      await flashcardAPI.createDeck(deckName.trim(), Array.from(selectedWords));
      alert('Deck created successfully!');
      navigate(-1); // Go back to previous page
    } catch (error) {
      console.error('Error creating deck:', error);
      alert('Failed to create deck: ' + (error.response?.data?.message || error.message));
    } finally {
      setCreating(false);
    }
  };

  const allSelected = words.length > 0 && selectedWords.size === words.length;
  const someSelected = selectedWords.size > 0 && selectedWords.size < words.length;

  return (
    <div className="create-deck-container">
      <div className="create-deck-header">
        <h1>Create New Deck</h1>
        <button onClick={() => navigate(-1)} className="btn btn-secondary">
          Cancel
        </button>
      </div>

      <div className="create-deck-form">
        <div className="deck-name-input">
          <label htmlFor="deck-name">Deck Name</label>
          <input
            id="deck-name"
            type="text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="Enter deck name..."
            className="form-input"
          />
        </div>
        <div className="selected-count">
          {selectedWords.size} word{selectedWords.size !== 1 ? 's' : ''} selected
        </div>
      </div>

      {/* Category Filters Section */}
      <div className="category-filters-section">
        <h2>Category Filters</h2>
        <div className="category-filters-grid">
          <div className="category-filter-group">
            <label htmlFor="category1">Category 1</label>
            <select
              id="category1"
              value={filters.category1}
              onChange={(e) => handleFilterChange('category1', e.target.value)}
              className="category-select"
            >
              <option value="">All (verb, noun, etc.)</option>
              {categories1.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div className="category-filter-group">
            <label htmlFor="category2">Category 2</label>
            <select
              id="category2"
              value={filters.category2}
              onChange={(e) => handleFilterChange('category2', e.target.value)}
              className="category-select"
            >
              <option value="">All (Function Words, etc.)</option>
              {categories2.length > 0 ? (
                categories2.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))
              ) : (
                <option value="" disabled>Empty now</option>
              )}
            </select>
          </div>
          
          <div className="category-filter-group">
            <label htmlFor="category3">Category 3</label>
            <select
              id="category3"
              value={filters.category3}
              onChange={(e) => handleFilterChange('category3', e.target.value)}
              className="category-select"
            >
              <option value="">All</option>
              {categories3.length > 0 ? (
                categories3.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))
              ) : (
                <option value="" disabled>Empty now</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Other Filters */}
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
          <option value="A1">A1</option>
          <option value="A2">A2</option>
          <option value="B1">B1</option>
          <option value="B2">B2</option>
          <option value="C1">C1</option>
          <option value="C2">C2</option>
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
                <th>Categories</th>
                <th>Level</th>
                <th>Type</th>
                <th>Status</th>
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
                  <td className="word-category-cell">
                    <div className="category-badges">
                      {word.category1 && (
                        <span className="category-badge" title="Category 1">{word.category1}</span>
                      )}
                      {word.category2 && (
                        <span className="category-badge category-2" title="Category 2">{word.category2}</span>
                      )}
                      {word.category3 && (
                        <span className="category-badge category-3" title="Category 3">{word.category3}</span>
                      )}
                    </div>
                  </td>
                  <td className="word-level-cell">
                    {word.englishLevel && (
                      <span className="word-level-badge">{word.englishLevel}</span>
                    )}
                  </td>
                  <td className="word-type-cell">
                    {word.wordType && (
                      <span className="word-type-badge">{word.wordType}</span>
                    )}
                  </td>
                  <td className="word-status-cell">
                    {word.isKnown === true ? (
                      <span className="status-badge status-known">✓ Known</span>
                    ) : word.isKnown === false ? (
                      <span className="status-badge status-unknown">✗ Unknown</span>
                    ) : (
                      <span className="status-badge status-untracked">Not Tracked</span>
                    )}
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

      {/* Create Button */}
      <div className="create-deck-actions">
        <button
          onClick={handleCreateDeck}
          disabled={creating || !deckName.trim() || selectedWords.size === 0}
          className="btn btn-primary btn-large"
        >
          {creating ? 'Creating...' : `Create Deck (${selectedWords.size} words)`}
        </button>
      </div>
    </div>
  );
};

export default CreateDeck;

