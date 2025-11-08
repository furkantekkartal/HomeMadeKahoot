import React, { useState, useEffect } from 'react';
import { wordAPI } from '../services/api';
import './WordDatabase.css';

const WordDatabase = () => {
  const [words, setWords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    category1: '',
    category2: '',
    englishLevel: '',
    wordType: '',
    showKnown: true,
    showUnknown: true
  });

  useEffect(() => {
    loadData();
  }, [page, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [wordsRes, statsRes] = await Promise.all([
        wordAPI.getWordsWithStatus({
          page,
          limit: 20,
          ...filters,
          showKnown: filters.showKnown ? 'true' : 'false',
          showUnknown: filters.showUnknown ? 'true' : 'false'
        }),
        wordAPI.getUserWordStats()
      ]);
      
      setWords(wordsRes.data.words);
      setTotalPages(wordsRes.data.pagination.pages);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
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
      // Reload stats
      const statsRes = await wordAPI.getUserWordStats();
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error toggling word status:', error);
      alert('Failed to update word status');
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
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

  const getUniqueValues = (key) => {
    // This would ideally come from the API, but for now we'll extract from loaded words
    const values = new Set();
    words.forEach(word => {
      if (word[key]) values.add(word[key]);
    });
    return Array.from(values).sort();
  };

  if (loading && !stats) {
    return <div className="loading">Loading...</div>;
  }

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
      <div className="word-database-stats">
        {stats && (
          <div className="word-stats">
            <div className="stat-item">
              <span className="stat-label">Total Words:</span>
              <span className="stat-value">{stats.totalWords}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Known:</span>
              <span className="stat-value known">{stats.knownWords}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Unknown:</span>
              <span className="stat-value unknown">{stats.unknownWords}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Progress:</span>
              <span className="stat-value">
                {stats.totalWords > 0 
                  ? Math.round((stats.knownWords / stats.totalWords) * 100) 
                  : 0}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="word-filters">
        <div className="filter-group">
          <input
            type="text"
            placeholder="Search words..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="filter-input"
          />
        </div>
        <div className="filter-group">
          <select
            value={filters.category1}
            onChange={(e) => handleFilterChange('category1', e.target.value)}
            className="filter-select"
          >
            <option value="">All Categories</option>
            <option value="Grammar">Grammar</option>
            <option value="General">General</option>
            <option value="Home">Home</option>
            <option value="Education">Education</option>
            <option value="Technology">Technology</option>
          </select>
        </div>
        <div className="filter-group">
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
        </div>
        <div className="filter-group">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.showKnown}
              onChange={(e) => handleFilterChange('showKnown', e.target.checked)}
            />
            Show Known
          </label>
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={filters.showUnknown}
              onChange={(e) => handleFilterChange('showUnknown', e.target.checked)}
            />
            Show Unknown
          </label>
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
                <th>English Word</th>
                <th>Turkish Meaning</th>
                <th>Category</th>
                <th>Level</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {words.map(word => (
                <tr 
                  key={word._id} 
                  className={`word-row ${word.isKnown === true ? 'known' : word.isKnown === false ? 'unknown' : ''}`}
                >
                  <td className="word-english-cell">
                    <strong>{word.englishWord}</strong>
                    {word.wordType && (
                      <span className="word-type-badge">{word.wordType}</span>
                    )}
                  </td>
                  <td className="word-meaning-cell">{word.turkishMeaning || '-'}</td>
                  <td className="word-category-cell">
                    {word.category1 && (
                      <span className="category-badge">{word.category1}</span>
                    )}
                  </td>
                  <td className="word-level-cell">
                    {word.englishLevel && (
                      <span className="word-level-badge">{word.englishLevel}</span>
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
                  <td className="word-action-cell">
                    <button
                      onClick={() => handleToggleWord(word._id, word.isKnown)}
                      className={`btn btn-sm ${word.isKnown === true ? 'btn-secondary' : word.isKnown === false ? 'btn-warning' : 'btn-primary'}`}
                    >
                      {word.isKnown === true ? 'Mark Unknown' : word.isKnown === false ? 'Mark Known' : 'Mark Known'}
                    </button>
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
  );
};

export default WordDatabase;

