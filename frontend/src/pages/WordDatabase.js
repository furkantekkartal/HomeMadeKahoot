import React, { useState, useEffect } from 'react';
import { wordAPI } from '../services/api';
import { FaHourglassHalf } from 'react-icons/fa';
import './WordDatabase.css';

const WordDatabase = () => {
  const [words, setWords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    category1: '',
    category2: '',
    englishLevel: '',
    wordType: '',
    sourceId: '',
    showKnown: true,
    showUnknown: true
  });
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    category1: '',
    category2: '',
    englishLevel: '',
    wordType: '',
    sourceId: '',
    showKnown: true,
    showUnknown: true
  });
  const [sources, setSources] = useState([]);
  const [filterValues, setFilterValues] = useState({
    levels: [],
    types: [],
    categories1: [],
    categories2: [],
    categories3: []
  });
  const [selectedWords, setSelectedWords] = useState(new Set());
  const [selectingAllFiltered, setSelectingAllFiltered] = useState(false);
  const [allFilteredWordIds, setAllFilteredWordIds] = useState(new Set());
  const [filteredStats, setFilteredStats] = useState({
    totalWords: 0,
    knownWords: 0,
    unknownWords: 0,
    spelledCorrectly: 0,
    spelledIncorrectly: 0,
    notSpelled: 0
  });
  const [editingField, setEditingField] = useState(null);
  const [columnVisibility, setColumnVisibility] = useState({
    category1: true,
    category2: true,
    category3: false,
    sampleSentenceEn: false,
    sampleSentenceTr: false
  });
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, column: null });

  useEffect(() => {
    loadData();
    loadSources();
    loadFilterValues();
  }, [page, appliedFilters]);

  const loadSources = async () => {
    try {
      const response = await wordAPI.getSources();
      setSources(response.data.sources || []);
    } catch (error) {
      console.error('Error loading sources:', error);
    }
  };

  const loadFilterValues = async () => {
    try {
      const response = await wordAPI.getFilterValues();
      setFilterValues(response.data || {
        levels: [],
        types: [],
        categories1: [],
        categories2: [],
        categories3: []
      });
    } catch (error) {
      console.error('Error loading filter values:', error);
    }
  };

  const handleContextMenu = (e, column) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      column
    });
  };

  const handleToggleColumn = (column) => {
    setColumnVisibility(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
    setContextMenu({ show: false, x: 0, y: 0, column: null });
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu({ show: false, x: 0, y: 0, column: null });
    };
    if (contextMenu.show) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu.show]);

  // Update page input when page changes
  useEffect(() => {
    setPageInput(page.toString());
  }, [page]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [wordsRes, statsRes] = await Promise.all([
        wordAPI.getWordsWithStatus({
          page,
          limit: 50,
          ...appliedFilters,
          sourceId: appliedFilters.sourceId || undefined,
          showKnown: appliedFilters.showKnown ? 'true' : 'false',
          showUnknown: appliedFilters.showUnknown ? 'true' : 'false'
        }),
        wordAPI.getUserWordStats()
      ]);
      
      setWords(wordsRes.data.words);
      setTotalPages(wordsRes.data.pagination.pages);
      setStats(statsRes.data);
      
      // Calculate filtered stats by fetching all filtered words
      await calculateFilteredStats();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFilteredStats = async () => {
    try {
      // Fetch all words matching the current filters (without pagination)
      const allFilteredWords = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await wordAPI.getWordsWithStatus({
          page: currentPage,
          limit: 1000, // Large limit to reduce API calls
          ...appliedFilters,
          sourceId: appliedFilters.sourceId || undefined,
          showKnown: appliedFilters.showKnown ? 'true' : 'false',
          showUnknown: appliedFilters.showUnknown ? 'true' : 'false'
        });

        const pageWords = response.data.words || [];
        allFilteredWords.push(...pageWords);

        const totalPages = response.data.pagination?.pages || 1;
        if (currentPage >= totalPages || pageWords.length === 0) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }

      // Calculate stats from filtered words
      const totalWords = allFilteredWords.length;
      const knownWords = allFilteredWords.filter(w => w.isKnown === true).length;
      const unknownWords = allFilteredWords.filter(w => w.isKnown === false).length;
      const spelledCorrectly = allFilteredWords.filter(w => w.isSpelled === true).length;
      const spelledIncorrectly = allFilteredWords.filter(w => w.isSpelled === false).length;
      const notSpelled = allFilteredWords.filter(w => w.isSpelled === null || w.isSpelled === undefined).length;

      setFilteredStats({
        totalWords,
        knownWords,
        unknownWords,
        spelledCorrectly,
        spelledIncorrectly,
        notSpelled
      });
    } catch (error) {
      console.error('Error calculating filtered stats:', error);
    }
  };

  const handleToggleWord = async (wordId, currentStatus) => {
    try {
      const newStatus = currentStatus === true ? false : true;
      await wordAPI.toggleWordStatus(wordId, newStatus);
      // Update local state
      setWords(words.map(word => 
        word._id === wordId 
          ? { ...word, isKnown: newStatus }
          : word
      ));
      // Reload stats and filtered stats
      const statsRes = await wordAPI.getUserWordStats();
      setStats(statsRes.data);
      await calculateFilteredStats();
    } catch (error) {
      console.error('Error toggling word status:', error);
      alert('Failed to update word status');
    }
  };

  const handleToggleSpelling = async (wordId, currentStatus) => {
    try {
      const newStatus = currentStatus === true ? false : true;
      await wordAPI.toggleSpellingStatus(wordId, newStatus);
      // Update local state
      setWords(words.map(word => 
        word._id === wordId 
          ? { ...word, isSpelled: newStatus }
          : word
      ));
      // Reload filtered stats
      await calculateFilteredStats();
    } catch (error) {
      console.error('Error toggling spelling status:', error);
      alert('Failed to update spelling status');
    }
  };

  const handleDeleteWord = async (wordId, englishWord) => {
    if (!window.confirm(`Are you sure you want to delete "${englishWord}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await wordAPI.deleteWord(wordId);
      // Remove word from local state
      setWords(words.filter(word => word._id !== wordId));
      setSelectedWords(prev => {
        const newSet = new Set(prev);
        newSet.delete(wordId);
        return newSet;
      });
      // Reload stats
      const statsRes = await wordAPI.getUserWordStats();
      setStats(statsRes.data);
      // If current page becomes empty and not on page 1, go to previous page
      if (words.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        // Reload data to refresh the list
        await loadData();
      }
    } catch (error) {
      console.error('Error deleting word:', error);
      alert('Failed to delete word: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedWords.size === 0) {
      alert('Please select words to delete');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedWords.size} word(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      const wordIds = Array.from(selectedWords);
      await Promise.all(wordIds.map(id => wordAPI.deleteWord(id)));
      
      // Remove words from local state
      setWords(words.filter(word => !selectedWords.has(word._id)));
      setSelectedWords(new Set());
      
      // Reload stats
      const statsRes = await wordAPI.getUserWordStats();
      setStats(statsRes.data);
      
      // Reload data
      await loadData();
    } catch (error) {
      console.error('Error deleting words:', error);
      alert('Failed to delete words: ' + (error.response?.data?.message || error.message));
    }
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
      setSelectedWords(new Set());
    } else {
      setSelectedWords(new Set(words.map(w => w._id)));
    }
  };

  const handleSelectAllFiltered = async () => {
    // Check if all filtered words are already selected
    const allFilteredSelected = allFilteredWordIds.size > 0 && 
      Array.from(allFilteredWordIds).every(id => selectedWords.has(id));

    if (allFilteredSelected) {
      // Deselect all filtered words
      setSelectedWords(prev => {
        const newSet = new Set(prev);
        allFilteredWordIds.forEach(id => newSet.delete(id));
        return newSet;
      });
      setAllFilteredWordIds(new Set());
      return;
    }

    try {
      setSelectingAllFiltered(true);
      
      // Fetch all words matching the current filters (without pagination)
      const allWords = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await wordAPI.getWordsWithStatus({
          page: currentPage,
          limit: 1000, // Large limit to reduce API calls
          ...appliedFilters,
          sourceId: appliedFilters.sourceId || undefined,
          showKnown: appliedFilters.showKnown ? 'true' : 'false',
          showUnknown: appliedFilters.showUnknown ? 'true' : 'false'
        });

        const pageWords = response.data.words || [];
        allWords.push(...pageWords);

        const totalPages = response.data.pagination?.pages || 1;
        if (currentPage >= totalPages || pageWords.length === 0) {
          hasMore = false;
        } else {
          currentPage++;
        }
      }

      // Extract all word IDs
      const allWordIds = allWords.map(word => word._id);
      const allWordIdsSet = new Set(allWordIds);
      setAllFilteredWordIds(allWordIdsSet);

      // Select all filtered words
      setSelectedWords(prev => new Set([...prev, ...allWordIds]));
    } catch (error) {
      console.error('Error selecting all filtered words:', error);
      alert('Failed to select all filtered words: ' + (error.response?.data?.message || error.message));
    } finally {
      setSelectingAllFiltered(false);
    }
  };

  const handleFieldChange = async (wordId, field, value) => {
    try {
      await wordAPI.updateWord(wordId, { [field]: value });
      setWords(words.map(word => 
        word._id === wordId 
          ? { ...word, [field]: value }
          : word
      ));
      setEditingField(null);
    } catch (error) {
      console.error('Error updating word:', error);
      alert('Failed to update word: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleFieldBlur = (wordId, field, value, originalValue) => {
    if (value !== originalValue) {
      handleFieldChange(wordId, field, value);
    } else {
      setEditingField(null);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
    setPage(1);
    // Clear all filtered words selection when filters change
    setAllFilteredWordIds(new Set());
  };

  const handleExport = async (format = 'csv') => {
    try {
      setExporting(true);
      const response = await wordAPI.exportWords(format);
      
      if (format === 'csv') {
        // Handle CSV blob with UTF-8 encoding
        // The backend already includes UTF-8 BOM for Excel compatibility
        const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `words-export-${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        // Handle JSON
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `words-export-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
      
      alert('Words exported successfully!');
    } catch (error) {
      console.error('Error exporting words:', error);
      alert('Failed to export words: ' + (error.response?.data?.message || error.message));
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      alert('Please select a file to import');
      return;
    }

    try {
      setImporting(true);
      const response = await wordAPI.importWords(importFile);
      
      alert(
        `Import completed!\n` +
        `Imported: ${response.data.imported}\n` +
        `Updated: ${response.data.updated}\n` +
        `Total: ${response.data.total}` +
        (response.data.errors && response.data.errors.length > 0 
          ? `\n\nErrors: ${response.data.errors.length}` 
          : '')
      );
      
      // Reload data
      setImportFile(null);
      document.getElementById('import-file-input').value = '';
      await loadData();
    } catch (error) {
      console.error('Error importing words:', error);
      alert('Failed to import words: ' + (error.response?.data?.message || error.message));
    } finally {
      setImporting(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const ext = file.name.toLowerCase().split('.').pop();
      if (ext === 'csv' || ext === 'json') {
        setImportFile(file);
      } else {
        alert('Please select a CSV or JSON file');
        e.target.value = '';
      }
    }
  };

  const handlePageInputChange = (e) => {
    const value = e.target.value;
    // Allow empty input, numbers only
    if (value === '' || /^\d+$/.test(value)) {
      setPageInput(value);
    }
  };

  const handlePageInputBlur = () => {
    const pageNum = parseInt(pageInput);
    if (isNaN(pageNum) || pageNum < 1) {
      setPageInput('1');
      setPage(1);
    } else if (pageNum > totalPages) {
      setPageInput(totalPages.toString());
      setPage(totalPages);
    } else {
      setPage(pageNum);
    }
  };

  const handlePageInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      handlePageInputBlur();
    }
  };

  const getUniqueValues = (key) => {
    // This would ideally come from the API, but for now we'll extract from loaded words
    const values = new Set();
    words.forEach(word => {
      if (word[key]) values.add(word[key]);
    });
    return Array.from(values).sort();
  };

  return (
    <div className="word-database">
      <div className="word-database-header">
        <h1>Word Database</h1>
        <div className="header-actions">
          <div className="import-export-buttons">
            <input
              type="file"
              id="import-file-input"
              accept=".csv,.json"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => document.getElementById('import-file-input').click()}
              className="btn btn-secondary"
              disabled={importing}
            >
              {importFile ? `📄 ${importFile.name}` : '📥 Import'}
            </button>
            {importFile && (
              <button
                onClick={handleImport}
                className="btn btn-primary"
                disabled={importing}
              >
                {importing ? 'Importing...' : '✓ Import Now'}
              </button>
            )}
            <button
              onClick={() => handleExport('csv')}
              className="btn btn-success"
              disabled={exporting}
            >
              {exporting ? 'Exporting...' : '📤 Export CSV'}
            </button>
            <button
              onClick={() => handleExport('json')}
              className="btn btn-success"
              disabled={exporting}
            >
              {exporting ? 'Exporting...' : '📤 Export JSON'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="word-database-content">
      <div className="word-database-stats">
        <div className="word-stats">
          <div className="stat-item">
            <span className="stat-label">Total Words:</span>
            <span className="stat-value">
              {loading && !filteredStats.totalWords ? <FaHourglassHalf style={{ fontSize: '1.2rem', opacity: 0.7 }} /> : (filteredStats.totalWords || 0)}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Known:</span>
            <span className="stat-value known">
              {loading && !filteredStats.totalWords ? <FaHourglassHalf style={{ fontSize: '1.2rem', opacity: 0.7 }} /> : (filteredStats.knownWords || 0)}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Unknown:</span>
            <span className="stat-value unknown">
              {loading && !filteredStats.totalWords ? <FaHourglassHalf style={{ fontSize: '1.2rem', opacity: 0.7 }} /> : (filteredStats.unknownWords || 0)}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Progress:</span>
            <span className="stat-value">
              {loading && !filteredStats.totalWords ? (
                <FaHourglassHalf style={{ fontSize: '1.2rem', opacity: 0.7 }} />
              ) : (
                filteredStats.totalWords > 0 
                  ? `${Math.round((filteredStats.knownWords / filteredStats.totalWords) * 100)}%`
                  : '0%'
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Word List Section */}
      <div className="manual-creation-section">
        <h2>Word List</h2>

        {/* Word Selection UI */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ 
            padding: '0.5rem 1rem', 
            backgroundColor: '#e6f3ff', 
            borderRadius: '8px',
            fontSize: '0.9rem',
            fontWeight: '600',
            color: '#2563eb'
          }}>
            {selectedWords.size} word{selectedWords.size !== 1 ? 's' : ''} selected
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="select-all-filtered"
              checked={allFilteredWordIds.size > 0 && Array.from(allFilteredWordIds).every(id => selectedWords.has(id))}
              onChange={handleSelectAllFiltered}
              disabled={selectingAllFiltered}
              style={{ cursor: 'pointer' }}
            />
            <label 
              htmlFor="select-all-filtered" 
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
            >
              <span>Select All Filtered Words</span>
              {allFilteredWordIds.size > 0 && (
                <span style={{ fontSize: '0.85rem', color: '#666', fontWeight: 'normal' }}>
                  ({allFilteredWordIds.size} words)
                </span>
              )}
              {selectingAllFiltered && (
                <span style={{ fontSize: '0.85rem', color: '#667eea' }}>Loading...</span>
              )}
            </label>
          </div>
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
            {filterValues.levels.filter(level => level && level.trim() !== '').map(level => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
          <select
            value={filters.wordType}
            onChange={(e) => handleFilterChange('wordType', e.target.value)}
            className="filter-select"
          >
            <option value="">All Types</option>
            {filterValues.types.filter(type => type && type.trim() !== '').map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={filters.category1}
            onChange={(e) => handleFilterChange('category1', e.target.value)}
            className="filter-select"
          >
            <option value="">All Category 1</option>
            {filterValues.categories1.filter(cat => cat && cat.trim() !== '').map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={filters.category2}
            onChange={(e) => handleFilterChange('category2', e.target.value)}
            className="filter-select"
          >
            <option value="">All Category 2</option>
            {filterValues.categories2.filter(cat => cat && cat.trim() !== '').map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={filters.sourceId}
            onChange={(e) => handleFilterChange('sourceId', e.target.value)}
            className="filter-select"
          >
            <option value="">All Sources</option>
            {sources.map(source => (
              <option key={source._id} value={source._id}>
                {source.sourceName} ({source.totalWords} words)
              </option>
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
          {selectedWords.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="btn btn-danger"
              style={{ backgroundColor: '#dc3545', color: 'white', border: 'none' }}
            >
              Delete Selected ({selectedWords.size})
            </button>
          )}
        </div>

        {/* Words Table */}
        <div className="words-table-container">
          {loading ? (
            <div className="loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', minHeight: '200px' }}>
              <FaHourglassHalf style={{ fontSize: '3rem', opacity: 0.6 }} />
            </div>
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
                      checked={selectedWords.size === words.length && words.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th 
                    onContextMenu={(e) => handleContextMenu(e, null)}
                    style={{ cursor: 'context-menu' }}
                  >
                    English Word
                  </th>
                  <th 
                    onContextMenu={(e) => handleContextMenu(e, null)}
                    style={{ cursor: 'context-menu' }}
                  >
                    Turkish Meaning
                  </th>
                  <th 
                    onContextMenu={(e) => handleContextMenu(e, null)}
                    style={{ cursor: 'context-menu' }}
                  >
                    Word Type
                  </th>
                  <th 
                    onContextMenu={(e) => handleContextMenu(e, null)}
                    style={{ cursor: 'context-menu' }}
                  >
                    English Level
                  </th>
                  {columnVisibility.category1 && (
                    <th 
                      onContextMenu={(e) => handleContextMenu(e, 'category1')}
                      style={{ cursor: 'context-menu' }}
                    >
                      Category 1
                    </th>
                  )}
                  {columnVisibility.category2 && (
                    <th 
                      onContextMenu={(e) => handleContextMenu(e, 'category2')}
                      style={{ cursor: 'context-menu' }}
                    >
                      Category 2
                    </th>
                  )}
                  {columnVisibility.category3 && (
                    <th 
                      onContextMenu={(e) => handleContextMenu(e, 'category3')}
                      style={{ cursor: 'context-menu' }}
                    >
                      Category 3
                    </th>
                  )}
                  {columnVisibility.sampleSentenceEn && (
                    <th 
                      onContextMenu={(e) => handleContextMenu(e, 'sampleSentenceEn')}
                      style={{ cursor: 'context-menu' }}
                    >
                      Sample Sentence (EN)
                    </th>
                  )}
                  {columnVisibility.sampleSentenceTr && (
                    <th 
                      onContextMenu={(e) => handleContextMenu(e, 'sampleSentenceTr')}
                      style={{ cursor: 'context-menu' }}
                    >
                      Sample Sentence (TR)
                    </th>
                  )}
                  <th 
                    onContextMenu={(e) => handleContextMenu(e, null)}
                    style={{ cursor: 'context-menu' }}
                  >
                    Source
                  </th>
                  <th 
                    onContextMenu={(e) => handleContextMenu(e, null)}
                    style={{ cursor: 'context-menu' }}
                  >
                    IsKnown?
                  </th>
                  <th 
                    onContextMenu={(e) => handleContextMenu(e, null)}
                    style={{ cursor: 'context-menu' }}
                  >
                    IsSpelled
                  </th>
                  <th 
                    onContextMenu={(e) => handleContextMenu(e, null)}
                    style={{ cursor: 'context-menu' }}
                  >
                    Delete
                  </th>
                </tr>
              </thead>
              <tbody>
                {words.map(word => (
                  <tr 
                    key={word._id} 
                    className={`word-row ${word.isKnown === true ? 'known' : word.isKnown === false ? 'unknown' : ''} ${selectedWords.has(word._id) ? 'selected' : ''}`}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedWords.has(word._id)}
                        onChange={() => handleSelectWord(word._id)}
                      />
                    </td>
                    <td className="word-english-cell">
                      {editingField === `${word._id}-englishWord` ? (
                        <input
                          type="text"
                          defaultValue={word.englishWord}
                          onBlur={(e) => handleFieldBlur(word._id, 'englishWord', e.target.value, word.englishWord)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleFieldBlur(word._id, 'englishWord', e.target.value, word.englishWord);
                            }
                          }}
                          autoFocus
                          className="editable-input"
                        />
                      ) : (
                        <strong
                          onClick={() => setEditingField(`${word._id}-englishWord`)}
                          className="editable-field"
                        >
                          {word.englishWord}
                        </strong>
                      )}
                    </td>
                    <td className="word-meaning-cell">
                      {editingField === `${word._id}-turkishMeaning` ? (
                        <input
                          type="text"
                          defaultValue={word.turkishMeaning || ''}
                          onBlur={(e) => handleFieldBlur(word._id, 'turkishMeaning', e.target.value, word.turkishMeaning)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleFieldBlur(word._id, 'turkishMeaning', e.target.value, word.turkishMeaning);
                            }
                          }}
                          autoFocus
                          className="editable-input"
                        />
                      ) : (
                        <span
                          onClick={() => setEditingField(`${word._id}-turkishMeaning`)}
                          className="editable-field"
                        >
                          {word.turkishMeaning || '-'}
                        </span>
                      )}
                    </td>
                    <td className="word-type-cell">
                      {editingField === `${word._id}-wordType` ? (
                        <input
                          type="text"
                          defaultValue={word.wordType || ''}
                          onBlur={(e) => handleFieldBlur(word._id, 'wordType', e.target.value, word.wordType)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleFieldBlur(word._id, 'wordType', e.target.value, word.wordType);
                            }
                          }}
                          autoFocus
                          className="editable-input"
                        />
                      ) : (
                        <span
                          onClick={() => setEditingField(`${word._id}-wordType`)}
                          className="editable-field"
                        >
                          {word.wordType || '-'}
                        </span>
                      )}
                    </td>
                    <td className="word-level-cell">
                      {editingField === `${word._id}-englishLevel` ? (
                        <select
                          defaultValue={word.englishLevel || ''}
                          onBlur={(e) => handleFieldBlur(word._id, 'englishLevel', e.target.value, word.englishLevel)}
                          onChange={(e) => handleFieldChange(word._id, 'englishLevel', e.target.value)}
                          autoFocus
                          className="editable-select"
                        >
                          <option value="">-</option>
                          <option value="A1">A1</option>
                          <option value="A2">A2</option>
                          <option value="B1">B1</option>
                          <option value="B2">B2</option>
                          <option value="C1">C1</option>
                          <option value="C2">C2</option>
                        </select>
                      ) : (
                        <span
                          onClick={() => setEditingField(`${word._id}-englishLevel`)}
                          className="editable-field"
                        >
                          {word.englishLevel ? (
                            <span className="word-level-badge">{word.englishLevel}</span>
                          ) : '-'}
                        </span>
                      )}
                    </td>
                    {columnVisibility.category1 && (
                      <td className="word-category-cell">
                        {editingField === `${word._id}-category1` ? (
                          <input
                            type="text"
                            defaultValue={word.category1 || ''}
                            onBlur={(e) => handleFieldBlur(word._id, 'category1', e.target.value, word.category1)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleFieldBlur(word._id, 'category1', e.target.value, word.category1);
                              }
                            }}
                            autoFocus
                            className="editable-input"
                          />
                        ) : (
                          <span
                            onClick={() => setEditingField(`${word._id}-category1`)}
                            className="editable-field"
                          >
                            {word.category1 || '-'}
                          </span>
                        )}
                      </td>
                    )}
                    {columnVisibility.category2 && (
                      <td className="word-category-cell">
                        {editingField === `${word._id}-category2` ? (
                          <input
                            type="text"
                            defaultValue={word.category2 || ''}
                            onBlur={(e) => handleFieldBlur(word._id, 'category2', e.target.value, word.category2)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleFieldBlur(word._id, 'category2', e.target.value, word.category2);
                              }
                            }}
                            autoFocus
                            className="editable-input"
                          />
                        ) : (
                          <span
                            onClick={() => setEditingField(`${word._id}-category2`)}
                            className="editable-field"
                          >
                            {word.category2 || '-'}
                          </span>
                        )}
                      </td>
                    )}
                    {columnVisibility.category3 && (
                      <td className="word-category-cell">
                        {editingField === `${word._id}-category3` ? (
                          <input
                            type="text"
                            defaultValue={word.category3 || ''}
                            onBlur={(e) => handleFieldBlur(word._id, 'category3', e.target.value, word.category3)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleFieldBlur(word._id, 'category3', e.target.value, word.category3);
                              }
                            }}
                            autoFocus
                            className="editable-input"
                          />
                        ) : (
                          <span
                            onClick={() => setEditingField(`${word._id}-category3`)}
                            className="editable-field"
                          >
                            {word.category3 || '-'}
                          </span>
                        )}
                      </td>
                    )}
                    {columnVisibility.sampleSentenceEn && (
                      <td className="word-sample-cell">
                        {editingField === `${word._id}-sampleSentenceEn` ? (
                          <input
                            type="text"
                            defaultValue={word.sampleSentenceEn || ''}
                            onBlur={(e) => handleFieldBlur(word._id, 'sampleSentenceEn', e.target.value, word.sampleSentenceEn)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleFieldBlur(word._id, 'sampleSentenceEn', e.target.value, word.sampleSentenceEn);
                              }
                            }}
                            autoFocus
                            className="editable-input"
                          />
                        ) : (
                          <span
                            onClick={() => setEditingField(`${word._id}-sampleSentenceEn`)}
                            className="editable-field"
                          >
                            {word.sampleSentenceEn || '-'}
                          </span>
                        )}
                      </td>
                    )}
                    {columnVisibility.sampleSentenceTr && (
                      <td className="word-sample-cell">
                        {editingField === `${word._id}-sampleSentenceTr` ? (
                          <input
                            type="text"
                            defaultValue={word.sampleSentenceTr || ''}
                            onBlur={(e) => handleFieldBlur(word._id, 'sampleSentenceTr', e.target.value, word.sampleSentenceTr)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleFieldBlur(word._id, 'sampleSentenceTr', e.target.value, word.sampleSentenceTr);
                              }
                            }}
                            autoFocus
                            className="editable-input"
                          />
                        ) : (
                          <span
                            onClick={() => setEditingField(`${word._id}-sampleSentenceTr`)}
                            className="editable-field"
                          >
                            {word.sampleSentenceTr || '-'}
                          </span>
                        )}
                      </td>
                    )}
                    <td className="word-category-cell">
                      {word.sources && word.sources.length > 0 ? (
                        <span className="source-badge" title={word.sources.join(', ')}>
                          {word.sources.length === 1 
                            ? word.sources[0] 
                            : `${word.sources[0]} (+${word.sources.length - 1})`}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="word-status-cell">
                      <button
                        onClick={() => handleToggleWord(word._id, word.isKnown)}
                        className={`btn btn-sm ${word.isKnown === true ? 'btn-success' : word.isKnown === false ? 'btn-warning' : 'btn-secondary'}`}
                        style={{ 
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.8rem',
                          minWidth: '80px'
                        }}
                      >
                        {word.isKnown === true ? '✓ Known' : word.isKnown === false ? '✗ Unknown' : 'Not Set'}
                      </button>
                    </td>
                    <td className="word-status-cell">
                      <button
                        onClick={() => handleToggleSpelling(word._id, word.isSpelled)}
                        className={`btn btn-sm ${word.isSpelled === true ? 'btn-success' : word.isSpelled === false ? 'btn-warning' : 'btn-secondary'}`}
                        style={{ 
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.8rem',
                          minWidth: '80px'
                        }}
                      >
                        {word.isSpelled === true ? '✓ Yes' : word.isSpelled === false ? '✗ No' : 'Not Set'}
                      </button>
                    </td>
                    <td className="word-action-cell">
                      <button
                        onClick={() => handleDeleteWord(word._id, word.englishWord)}
                        className="btn-icon"
                        title="Delete"
                        style={{ 
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '1.2rem',
                          padding: '0.25rem'
                        }}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Context Menu */}
        {contextMenu.show && (
          <div
            className="context-menu"
            style={{
              position: 'fixed',
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
              zIndex: 1000,
              background: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              padding: '0.5rem 0',
              minWidth: '200px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="context-menu-item"
              onClick={() => handleToggleColumn('category1')}
              style={{
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                backgroundColor: columnVisibility.category1 ? '#e6f3ff' : 'transparent'
              }}
            >
              {columnVisibility.category1 ? '✓' : ''} Category 1
            </div>
            <div
              className="context-menu-item"
              onClick={() => handleToggleColumn('category2')}
              style={{
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                backgroundColor: columnVisibility.category2 ? '#e6f3ff' : 'transparent'
              }}
            >
              {columnVisibility.category2 ? '✓' : ''} Category 2
            </div>
            <div
              className="context-menu-item"
              onClick={() => handleToggleColumn('category3')}
              style={{
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                backgroundColor: columnVisibility.category3 ? '#e6f3ff' : 'transparent'
              }}
            >
              {columnVisibility.category3 ? '✓' : ''} Category 3
            </div>
            <div style={{ borderTop: '1px solid #e2e8f0', margin: '0.25rem 0' }}></div>
            <div
              className="context-menu-item"
              onClick={() => handleToggleColumn('sampleSentenceEn')}
              style={{
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                backgroundColor: columnVisibility.sampleSentenceEn ? '#e6f3ff' : 'transparent'
              }}
            >
              {columnVisibility.sampleSentenceEn ? '✓' : ''} Sample Sentence (EN)
            </div>
            <div
              className="context-menu-item"
              onClick={() => handleToggleColumn('sampleSentenceTr')}
              style={{
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                backgroundColor: columnVisibility.sampleSentenceTr ? '#e6f3ff' : 'transparent'
              }}
            >
              {columnVisibility.sampleSentenceTr ? '✓' : ''} Sample Sentence (TR)
            </div>
          </div>
        )}

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
              Page{' '}
              <input
                type="number"
                min="1"
                max={totalPages}
                value={pageInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setPageInput(value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const pageNum = parseInt(pageInput);
                    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                      setPage(pageNum);
                    } else {
                      setPageInput(page.toString());
                    }
                  }
                }}
                onBlur={() => {
                  const pageNum = parseInt(pageInput);
                  if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                    setPage(pageNum);
                  } else {
                    setPageInput(page.toString());
                  }
                }}
                className="page-input"
              />
              {' '}of {totalPages}
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
    </div>
  );
};

export default WordDatabase;

