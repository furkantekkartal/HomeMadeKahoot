import React, { useState, useEffect } from 'react';
import { wordAPI } from '../services/api';
import { FaHourglassHalf } from 'react-icons/fa';
import { useWordList } from '../context/WordListContext';
import WordList from '../components/WordList/WordList';
import './WordDatabase.css';

const WordDatabase = () => {
  const { allFilteredWords, loading, refreshWords } = useWordList();
  const [stats, setStats] = useState(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [showSourceList, setShowSourceList] = useState(false);
  const [sources, setSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    level: '',
    skill: '',
    task: '',
    cardQty: 0
  });
  const [filteredStats, setFilteredStats] = useState({
    totalWords: 0,
    knownWords: 0,
    unknownWords: 0,
    spelledCorrectly: 0,
    spelledIncorrectly: 0,
    notSpelled: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (showSourceList) {
      loadSources();
    }
  }, [showSourceList]);

  useEffect(() => {
    if (allFilteredWords.length > 0) {
      calculateFilteredStats();
    }
  }, [allFilteredWords]);

  const loadData = async () => {
    try {
      const statsRes = await wordAPI.getUserWordStats();
      setStats(statsRes.data);
      await calculateFilteredStats();
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const calculateFilteredStats = async () => {
    try {
      const wordsToCalculate = allFilteredWords;
      
      const totalWords = wordsToCalculate.length;
      const knownWords = wordsToCalculate.filter(w => w.isKnown === true).length;
      const unknownWords = wordsToCalculate.filter(w => w.isKnown === false).length;
      const spelledCorrectly = wordsToCalculate.filter(w => w.isSpelled === true).length;
      const spelledIncorrectly = wordsToCalculate.filter(w => w.isSpelled === false).length;
      const notSpelled = wordsToCalculate.filter(w => w.isSpelled === null || w.isSpelled === undefined).length;

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

  const handleExport = async (format = 'csv') => {
    try {
      setExporting(true);
      const response = await wordAPI.exportWords(format);
      
      if (format === 'csv') {
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
      
      setImportFile(null);
      document.getElementById('import-file-input').value = '';
      await loadData();
      refreshWords();
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

  const loadSources = async () => {
    try {
      setLoadingSources(true);
      const response = await wordAPI.getSources();
      setSources(response.data.sources || []);
    } catch (error) {
      console.error('Error loading sources:', error);
      alert('Failed to load sources: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoadingSources(false);
    }
  };

  const handleEditSource = (source) => {
    setEditingSource(source._id);
    setEditFormData({
      title: source.title || '',
      description: source.description || '',
      level: source.level || '',
      skill: source.skill || '',
      task: source.task || 'Vocabulary',
      cardQty: source.cardQty || 0
    });
  };

  const handleCancelEdit = () => {
    setEditingSource(null);
    setEditFormData({
      title: '',
      description: '',
      level: '',
      skill: '',
      task: '',
      cardQty: 0
    });
  };

  const handleSaveEdit = async (sourceId) => {
    try {
      const response = await wordAPI.updateSource(sourceId, editFormData);
      setSources(sources.map(s => 
        s._id === sourceId ? { ...s, ...response.data.source } : s
      ));
      setEditingSource(null);
      alert('Source updated successfully!');
    } catch (error) {
      console.error('Error updating source:', error);
      alert('Failed to update source: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteSource = async (sourceId, sourceName) => {
    if (!window.confirm(`Are you sure you want to delete source "${sourceName}"? This will also delete all word associations with this source. This action cannot be undone.`)) {
      return;
    }

    try {
      await wordAPI.deleteSource(sourceId);
      setSources(sources.filter(s => s._id !== sourceId));
      alert('Source deleted successfully!');
      // Refresh words to reflect the deletion
      refreshWords();
    } catch (error) {
      console.error('Error deleting source:', error);
      alert('Failed to delete source: ' + (error.response?.data?.message || error.message));
    }
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
            <button
              onClick={() => setShowSourceList(!showSourceList)}
              className="btn btn-secondary"
              style={{ backgroundColor: showSourceList ? '#667eea' : '', color: showSourceList ? 'white' : '' }}
            >
              {showSourceList ? '📋 Hide Sources' : '📋 Show Sources'}
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

      {/* Source List Section */}
      {showSourceList && (
        <div className="manual-creation-section" style={{ marginBottom: '2rem' }}>
          <h2>Source List</h2>
          {loadingSources ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
              <FaHourglassHalf style={{ fontSize: '2rem', opacity: 0.6 }} />
            </div>
          ) : sources.length === 0 ? (
            <div className="empty-state">
              <p>No sources found.</p>
            </div>
          ) : (
            <div className="words-table-container">
              <table className="words-table">
                <thead>
                  <tr>
                    <th>Source Name</th>
                    <th>Type</th>
                    <th>Title</th>
                    <th>Description</th>
                    <th>Level</th>
                    <th>Skill</th>
                    <th>Task</th>
                    <th>Qty</th>
                    <th>Total Words</th>
                    <th>New Words</th>
                    <th>Duplicate Words</th>
                    <th>File Size</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map(source => (
                    <tr key={source._id}>
                      <td style={{ fontWeight: '600' }}>{source.sourceName}</td>
                      <td>
                        <span className="word-type-badge" style={{ textTransform: 'uppercase' }}>
                          {source.sourceType || 'other'}
                        </span>
                      </td>
                      {editingSource === source._id ? (
                        <>
                          <td>
                            <input
                              type="text"
                              value={editFormData.title}
                              onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                              style={{ width: '100%', padding: '0.25rem', fontSize: '0.9rem' }}
                              placeholder="Title"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={editFormData.description}
                              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                              style={{ width: '100%', padding: '0.25rem', fontSize: '0.9rem' }}
                              placeholder="Description"
                            />
                          </td>
                          <td>
                            <select
                              value={editFormData.level}
                              onChange={(e) => setEditFormData({ ...editFormData, level: e.target.value })}
                              style={{ width: '100%', padding: '0.25rem', fontSize: '0.9rem' }}
                            >
                              <option value="">-</option>
                              <option value="A1">A1</option>
                              <option value="A2">A2</option>
                              <option value="B1">B1</option>
                              <option value="B2">B2</option>
                              <option value="C1">C1</option>
                              <option value="C2">C2</option>
                            </select>
                          </td>
                          <td>
                            <select
                              value={editFormData.skill}
                              onChange={(e) => setEditFormData({ ...editFormData, skill: e.target.value })}
                              style={{ width: '100%', padding: '0.25rem', fontSize: '0.9rem' }}
                            >
                              <option value="">-</option>
                              <option value="Reading">Reading</option>
                              <option value="Listening">Listening</option>
                              <option value="Speaking">Speaking</option>
                              <option value="Writing">Writing</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="text"
                              value={editFormData.task}
                              onChange={(e) => setEditFormData({ ...editFormData, task: e.target.value })}
                              style={{ width: '100%', padding: '0.25rem', fontSize: '0.9rem' }}
                              placeholder="Task"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={editFormData.cardQty}
                              onChange={(e) => setEditFormData({ ...editFormData, cardQty: parseInt(e.target.value) || 0 })}
                              style={{ width: '100%', padding: '0.25rem', fontSize: '0.9rem' }}
                              min="0"
                            />
                          </td>
                          <td colSpan="5"></td>
                          <td className="word-action-cell">
                            <button
                              onClick={() => handleSaveEdit(source._id)}
                              className="btn-icon"
                              title="Save"
                              style={{ 
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1.2rem',
                                padding: '0.25rem',
                                marginRight: '0.5rem',
                                color: '#28a745'
                              }}
                            >
                              ✓
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="btn-icon"
                              title="Cancel"
                              style={{ 
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1.2rem',
                                padding: '0.25rem',
                                color: '#dc3545'
                              }}
                            >
                              ✕
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{source.title || '-'}</td>
                          <td>{source.description || '-'}</td>
                          <td>
                            {source.level ? (
                              <span className="word-type-badge" style={{ textTransform: 'uppercase' }}>
                                {source.level}
                              </span>
                            ) : '-'}
                          </td>
                          <td>{source.skill || '-'}</td>
                          <td>{source.task || '-'}</td>
                          <td>{source.cardQty || 0}</td>
                          <td>{source.totalWords || 0}</td>
                          <td>{source.newWords || 0}</td>
                          <td>{source.duplicateWords || 0}</td>
                          <td>
                            {source.fileSize 
                              ? `${(source.fileSize / 1024).toFixed(2)} KB`
                              : '-'}
                          </td>
                          <td>
                            {source.createdAt 
                              ? new Date(source.createdAt).toLocaleDateString()
                              : '-'}
                          </td>
                          <td className="word-action-cell">
                            <button
                              onClick={() => handleEditSource(source)}
                              className="btn-icon"
                              title="Edit source"
                              style={{ 
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1.2rem',
                                padding: '0.25rem',
                                marginRight: '0.5rem',
                                color: '#667eea'
                              }}
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteSource(source._id, source.sourceName)}
                              className="btn-icon"
                              title="Delete source"
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
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Word List Section */}
        <WordList showFilters={true} showDeleteButton={true} />
      </div>
    </div>
  );
};

export default WordDatabase;
