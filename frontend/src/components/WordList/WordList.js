import React, { useState, useEffect, useRef } from 'react';
import { useWordList } from '../../context/WordListContext';
import { FaHourglassHalf } from 'react-icons/fa';
import '../../pages/WordDatabase.css';

// ColumnFilterDropdown Component
const ColumnFilterDropdown = ({ columnKey, columnLabel, uniqueValues, selectedValues, onFilterChange, onSelectAll, onDeselectAll, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { values, emptyCount } = uniqueValues;
  const allValues = [...values];
  if (emptyCount > 0) {
    allValues.push('(Blanks)');
  }
  
  const filteredValues = allValues.filter(val => 
    val.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const allSelected = filteredValues.length > 0 && filteredValues.every(val => selectedValues.has(val));
  const someSelected = !allSelected && filteredValues.some(val => selectedValues.has(val));

  return (
    <div className="column-filter-dropdown" onClick={(e) => e.stopPropagation()}>
      <div className="filter-dropdown-header">
        <span className="filter-dropdown-title">{columnLabel}</span>
        <button className="filter-close-btn" onClick={onClose}>×</button>
      </div>
      <div className="filter-dropdown-search">
        <input
          type="text"
          placeholder="Search values..."
          className="filter-search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="filter-dropdown-actions">
        <button 
          className="filter-action-btn"
          onClick={() => {
            filteredValues.forEach(val => {
              if (!selectedValues.has(val)) {
                onFilterChange(columnKey, val, true);
              }
            });
          }}
        >
          Select All
        </button>
        <button 
          className="filter-action-btn"
          onClick={() => {
            filteredValues.forEach(val => {
              if (selectedValues.has(val)) {
                onFilterChange(columnKey, val, false);
              }
            });
          }}
        >
          Deselect All
        </button>
      </div>
      <div className="filter-dropdown-list">
        <div className="filter-checkbox-item">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(input) => {
              if (input) input.indeterminate = someSelected;
            }}
            onChange={(e) => {
              if (e.target.checked) {
                filteredValues.forEach(val => {
                  if (!selectedValues.has(val)) {
                    onFilterChange(columnKey, val, true);
                  }
                });
              } else {
                filteredValues.forEach(val => {
                  if (selectedValues.has(val)) {
                    onFilterChange(columnKey, val, false);
                  }
                });
              }
            }}
          />
          <label>(Select All)</label>
        </div>
        {filteredValues.map((value, index) => {
          const isChecked = selectedValues.has(value);
          return (
            <div key={index} className="filter-checkbox-item">
              <input
                type="checkbox"
                checked={isChecked}
                onChange={(e) => onFilterChange(columnKey, value, e.target.checked)}
              />
              <label title={value}>{value}</label>
            </div>
          );
        })}
        {filteredValues.length === 0 && (
          <div className="filter-empty-message">
            {searchTerm ? 'No values match your search' : 'No values available'}
          </div>
        )}
      </div>
    </div>
  );
};

const WordList = ({ showFilters = true, showDeleteButton = true, onWordSelect, activeSourceId, initialColumnVisibility = null }) => {
  const {
    words,
    loading,
    page,
    totalPages,
    pageInput,
    selectedWords,
    selectingAllFiltered,
    allFilteredWordIds,
    filters,
    appliedFilters,
    sources,
    filterValues,
    columnFilters,
    columnVisibility,
    itemsPerPage,
    editingField,
    openFilterDropdown,
    contextMenu,
    imageHistory,
    generatingImages,
    generatingAllImages,
    imageService,
    setPage,
    setPageInput,
    setSelectedWords,
    setFilters,
    setEditingField,
    setOpenFilterDropdown,
    setItemsPerPage,
    setContextMenu,
    handleToggleWord,
    handleToggleSpelling,
    handleDeleteWord,
    handleDeleteSelected,
    handleFieldChange,
    handleSelectWord,
    handleSelectAll,
    handleSelectAllFiltered,
    handleSelectActiveSource,
    handleFilterChange,
    handleApplyFilters,
    handleColumnFilterChange,
    handleSelectAllColumnFilter,
    handleDeselectAllColumnFilter,
    isColumnFilterActive,
    handleToggleColumn,
    handleContextMenu,
    getUniqueValues,
    setColumnVisibility: setColumnVisibilityContext,
    handleGenerateImage,
    navigateImage,
    handleDeleteImage,
    handleGenerateAllImages,
    handleImageServiceChange
  } = useWordList();

  // Image size state
  const [imageSize, setImageSize] = useState(() => {
    const saved = localStorage.getItem('wordImageSize');
    return saved ? parseInt(saved) : 100; // Default 100px
  });

  // Custom query state for each word
  const [customQueries, setCustomQueries] = useState({});

  // Set initial column visibility if provided (only once on mount, and only if no saved preferences exist)
  const hasSetInitialVisibility = useRef(false);
  useEffect(() => {
    if (initialColumnVisibility && !hasSetInitialVisibility.current) {
      // Check if there are saved preferences in localStorage
      const saved = localStorage.getItem('wordListColumnVisibility');
      // Only apply initialColumnVisibility if there are no saved preferences
      if (!saved) {
        setColumnVisibilityContext(initialColumnVisibility);
      }
      hasSetInitialVisibility.current = true;
    }
  }, [initialColumnVisibility, setColumnVisibilityContext]);

  // Save image size to localStorage
  useEffect(() => {
    localStorage.setItem('wordImageSize', imageSize.toString());
  }, [imageSize]);

  const handleImageSizeChange = (delta) => {
    setImageSize(prev => Math.max(40, Math.min(300, prev + delta))); // Min 40px, Max 300px
  };

  const handleFieldBlur = (wordId, field, value, originalValue) => {
    if (value !== originalValue) {
      handleFieldChange(wordId, field, value);
    } else {
      setEditingField(null);
    }
  };

  const handlePageInputChange = (e) => {
    const value = e.target.value;
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

  const getFilteredWords = () => {
    return words;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openFilterDropdown && !event.target.closest('.filterable-header')) {
        setOpenFilterDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openFilterDropdown, setOpenFilterDropdown]);

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu({ show: false, x: 0, y: 0, column: null });
    };
    if (contextMenu.show) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu.show, setContextMenu]);

  // Handle word selection callback
  const handleWordSelectInternal = (wordId) => {
    handleSelectWord(wordId);
    if (onWordSelect) {
      const word = words.find(w => w._id === wordId);
      if (word) {
        onWordSelect(word, selectedWords.has(wordId));
      }
    }
  };

  return (
    <div className="manual-creation-section">
      <h2>Word List</h2>

      {/* Controls Container - Two sections: Left and Right */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        {/* Left Container - Selection and Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
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
            {columnVisibility.image && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <button
                    type="button"
                    onClick={() => handleImageSizeChange(-10)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '1rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      background: 'white',
                      cursor: 'pointer',
                      minWidth: '32px'
                    }}
                    title="Decrease image size"
                  >
                    ➖
                  </button>
                  <span style={{ fontSize: '0.85rem', color: '#666', minWidth: '40px', textAlign: 'center' }}>
                    {imageSize}px
                  </span>
                  <button
                    type="button"
                    onClick={() => handleImageSizeChange(10)}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '1rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '4px',
                      background: 'white',
                      cursor: 'pointer',
                      minWidth: '32px'
                    }}
                    title="Increase image size"
                  >
                    ➕
                  </button>
                </div>
                <div className="image-service-selector" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label className="image-service-label" style={{ fontSize: '0.8rem', color: '#4a5568', margin: 0 }}>
                    Image Service:
                  </label>
                  <div className="radio-group" style={{ display: 'flex', gap: '0.5rem' }}>
                    <label className="radio-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="imageService"
                        value="google"
                        checked={imageService === 'google'}
                        onChange={(e) => handleImageServiceChange(e.target.value)}
                      />
                      <span style={{ fontSize: '0.8rem' }}>Google</span>
                    </label>
                    <label className="radio-label" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="imageService"
                        value="unsplash"
                        checked={imageService === 'unsplash'}
                        onChange={(e) => handleImageServiceChange(e.target.value)}
                      />
                      <span style={{ fontSize: '0.8rem' }}>Unsplash</span>
                    </label>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateAllImages}
                  className="btn btn-primary btn-sm"
                  disabled={generatingAllImages}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.8rem'
                  }}
                >
                  {generatingAllImages ? 'Generating All...' : '🖼️ Generate All Images'}
                </button>
              </div>
            )}
          </div>
          {activeSourceId && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="select-active-source"
                checked={appliedFilters.sourceId === activeSourceId && selectedWords.size > 0}
                onChange={() => handleSelectActiveSource(activeSourceId)}
                disabled={selectingAllFiltered}
                style={{ cursor: 'pointer' }}
              />
              <label 
                htmlFor="select-active-source" 
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}
              >
                <span>Select Active Source</span>
                {selectingAllFiltered && (
                  <span style={{ fontSize: '0.85rem', color: '#667eea' }}>Loading...</span>
                )}
              </label>
            </div>
          )}
          {showFilters && (
            <>
              <div className="filter-checkbox">
                <input
                  type="checkbox"
                  id="show-known"
                  checked={filters.showKnown}
                  onChange={(e) => {
                    handleFilterChange('showKnown', e.target.checked);
                    handleApplyFilters();
                  }}
                />
                <label htmlFor="show-known">Known</label>
              </div>
              <div className="filter-checkbox">
                <input
                  type="checkbox"
                  id="show-unknown"
                  checked={filters.showUnknown}
                  onChange={(e) => {
                    handleFilterChange('showUnknown', e.target.checked);
                    handleApplyFilters();
                  }}
                />
                <label htmlFor="show-unknown">Unknown</label>
              </div>
            </>
          )}
          {showDeleteButton && selectedWords.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="btn btn-danger"
              style={{ backgroundColor: '#dc3545', color: 'white', border: 'none' }}
            >
              Delete Selected ({selectedWords.size})
            </button>
          )}
        </div>

        {/* Right Container - Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <label htmlFor="items-per-page" style={{ fontSize: '0.8rem', color: '#4a5568', margin: 0 }}>
              Rows:
            </label>
            <select
              id="items-per-page"
              value={itemsPerPage}
              onChange={(e) => {
                const value = e.target.value;
                setItemsPerPage(value === '-1' ? -1 : parseInt(value));
              }}
              style={{
                padding: '0.25rem 0.5rem',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                fontSize: '0.8rem',
                backgroundColor: 'white',
                cursor: 'pointer',
                minWidth: '60px'
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
              <option value={2500}>2500</option>
              <option value={5000}>5000</option>
              <option value={10000}>10000</option>
              <option value={-1}>All</option>
            </select>
          </div>
          {totalPages > 1 && (
            <>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', minWidth: '32px' }}
                title="Previous page"
              >
                ◀
              </button>
              <span className="page-info">
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={pageInput}
                  onChange={handlePageInputChange}
                  onKeyPress={handlePageInputKeyPress}
                  onBlur={handlePageInputBlur}
                  className="page-input"
                />
                <span style={{ fontSize: '0.8rem', marginLeft: '0.25rem' }}>/ {totalPages}</span>
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', minWidth: '32px' }}
                title="Next page"
              >
                ▶
              </button>
            </>
          )}
        </div>
      </div>

      {/* Words Table */}
      <div className="words-table-container">
        {loading ? (
          <div className="loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', minHeight: '200px' }}>
            <FaHourglassHalf style={{ fontSize: '3rem', opacity: 0.6 }} />
          </div>
        ) : (
          <table className="words-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedWords.size === getFilteredWords().length && getFilteredWords().length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                {columnVisibility.englishWord && (
                  <th 
                    className="filterable-header"
                    onContextMenu={(e) => handleContextMenu(e, 'englishWord')}
                  >
                    <div className="header-content">
                      <span>English Word</span>
                    <button
                      className={`filter-icon ${isColumnFilterActive('englishWord') ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenFilterDropdown(openFilterDropdown === 'englishWord' ? null : 'englishWord');
                      }}
                      title="Filter column"
                    >
                      ▼
                    </button>
                  </div>
                  {openFilterDropdown === 'englishWord' && (
                    <ColumnFilterDropdown
                      columnKey="englishWord"
                      columnLabel="English Word"
                      uniqueValues={getUniqueValues('englishWord')}
                      selectedValues={columnFilters.englishWord}
                      onFilterChange={handleColumnFilterChange}
                      onSelectAll={() => handleSelectAllColumnFilter('englishWord')}
                      onDeselectAll={() => handleDeselectAllColumnFilter('englishWord')}
                      onClose={() => setOpenFilterDropdown(null)}
                    />
                  )}
                  </th>
                )}
                {columnVisibility.turkishMeaning && (
                  <th 
                    className="filterable-header"
                    onContextMenu={(e) => handleContextMenu(e, 'turkishMeaning')}
                  >
                    <div className="header-content">
                      <span>Turkish Meaning</span>
                    <button
                      className={`filter-icon ${isColumnFilterActive('turkishMeaning') ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenFilterDropdown(openFilterDropdown === 'turkishMeaning' ? null : 'turkishMeaning');
                      }}
                      title="Filter column"
                    >
                      ▼
                    </button>
                  </div>
                  {openFilterDropdown === 'turkishMeaning' && (
                    <ColumnFilterDropdown
                      columnKey="turkishMeaning"
                      columnLabel="Turkish Meaning"
                      uniqueValues={getUniqueValues('turkishMeaning')}
                      selectedValues={columnFilters.turkishMeaning}
                      onFilterChange={handleColumnFilterChange}
                      onSelectAll={() => handleSelectAllColumnFilter('turkishMeaning')}
                      onDeselectAll={() => handleDeselectAllColumnFilter('turkishMeaning')}
                      onClose={() => setOpenFilterDropdown(null)}
                    />
                  )}
                  </th>
                )}
                {columnVisibility.wordType && (
                  <th 
                    className="filterable-header"
                    onContextMenu={(e) => handleContextMenu(e, 'wordType')}
                  >
                    <div className="header-content">
                      <span>Word Type</span>
                    <button
                      className={`filter-icon ${isColumnFilterActive('wordType') ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenFilterDropdown(openFilterDropdown === 'wordType' ? null : 'wordType');
                      }}
                      title="Filter column"
                    >
                      ▼
                    </button>
                  </div>
                  {openFilterDropdown === 'wordType' && (
                    <ColumnFilterDropdown
                      columnKey="wordType"
                      columnLabel="Word Type"
                      uniqueValues={getUniqueValues('wordType')}
                      selectedValues={columnFilters.wordType}
                      onFilterChange={handleColumnFilterChange}
                      onSelectAll={() => handleSelectAllColumnFilter('wordType')}
                      onDeselectAll={() => handleDeselectAllColumnFilter('wordType')}
                      onClose={() => setOpenFilterDropdown(null)}
                    />
                  )}
                </th>
                )}
                {columnVisibility.englishLevel && (
                  <th 
                    className="filterable-header"
                    onContextMenu={(e) => handleContextMenu(e, 'englishLevel')}
                  >
                    <div className="header-content">
                      <span>English Level</span>
                      <button
                        className={`filter-icon ${isColumnFilterActive('englishLevel') ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenFilterDropdown(openFilterDropdown === 'englishLevel' ? null : 'englishLevel');
                        }}
                        title="Filter column"
                      >
                        ▼
                      </button>
                    </div>
                    {openFilterDropdown === 'englishLevel' && (
                      <ColumnFilterDropdown
                        columnKey="englishLevel"
                        columnLabel="English Level"
                        uniqueValues={getUniqueValues('englishLevel')}
                        selectedValues={columnFilters.englishLevel}
                        onFilterChange={handleColumnFilterChange}
                        onSelectAll={() => handleSelectAllColumnFilter('englishLevel')}
                        onDeselectAll={() => handleDeselectAllColumnFilter('englishLevel')}
                        onClose={() => setOpenFilterDropdown(null)}
                      />
                    )}
                  </th>
                )}
                {columnVisibility.category1 && (
                  <th 
                    className="filterable-header"
                    onContextMenu={(e) => handleContextMenu(e, 'category1')}
                  >
                    <div className="header-content">
                      <span>Category 1</span>
                      <button
                        className={`filter-icon ${isColumnFilterActive('category1') ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenFilterDropdown(openFilterDropdown === 'category1' ? null : 'category1');
                        }}
                        title="Filter column"
                      >
                        ▼
                      </button>
                    </div>
                    {openFilterDropdown === 'category1' && (
                      <ColumnFilterDropdown
                        columnKey="category1"
                        columnLabel="Category 1"
                        uniqueValues={getUniqueValues('category1')}
                        selectedValues={columnFilters.category1}
                        onFilterChange={handleColumnFilterChange}
                        onSelectAll={() => handleSelectAllColumnFilter('category1')}
                        onDeselectAll={() => handleDeselectAllColumnFilter('category1')}
                        onClose={() => setOpenFilterDropdown(null)}
                      />
                    )}
                  </th>
                )}
                {columnVisibility.category2 && (
                  <th 
                    className="filterable-header"
                    onContextMenu={(e) => handleContextMenu(e, 'category2')}
                  >
                    <div className="header-content">
                      <span>Category 2</span>
                      <button
                        className={`filter-icon ${isColumnFilterActive('category2') ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenFilterDropdown(openFilterDropdown === 'category2' ? null : 'category2');
                        }}
                        title="Filter column"
                      >
                        ▼
                      </button>
                    </div>
                    {openFilterDropdown === 'category2' && (
                      <ColumnFilterDropdown
                        columnKey="category2"
                        columnLabel="Category 2"
                        uniqueValues={getUniqueValues('category2')}
                        selectedValues={columnFilters.category2}
                        onFilterChange={handleColumnFilterChange}
                        onSelectAll={() => handleSelectAllColumnFilter('category2')}
                        onDeselectAll={() => handleDeselectAllColumnFilter('category2')}
                        onClose={() => setOpenFilterDropdown(null)}
                      />
                    )}
                  </th>
                )}
                {columnVisibility.category3 && (
                  <th 
                    className="filterable-header"
                    onContextMenu={(e) => handleContextMenu(e, 'category3')}
                  >
                    <div className="header-content">
                      <span>Category 3</span>
                      <button
                        className={`filter-icon ${isColumnFilterActive('category3') ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenFilterDropdown(openFilterDropdown === 'category3' ? null : 'category3');
                        }}
                        title="Filter column"
                      >
                        ▼
                      </button>
                    </div>
                    {openFilterDropdown === 'category3' && (
                      <ColumnFilterDropdown
                        columnKey="category3"
                        columnLabel="Category 3"
                        uniqueValues={getUniqueValues('category3')}
                        selectedValues={columnFilters.category3}
                        onFilterChange={handleColumnFilterChange}
                        onSelectAll={() => handleSelectAllColumnFilter('category3')}
                        onDeselectAll={() => handleDeselectAllColumnFilter('category3')}
                        onClose={() => setOpenFilterDropdown(null)}
                      />
                    )}
                  </th>
                )}
                {columnVisibility.sampleSentenceEn && (
                  <th 
                    className="filterable-header"
                    onContextMenu={(e) => handleContextMenu(e, 'sampleSentenceEn')}
                  >
                    <div className="header-content">
                      <span>Sample Sentence (EN)</span>
                      <button
                        className={`filter-icon ${isColumnFilterActive('sampleSentenceEn') ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenFilterDropdown(openFilterDropdown === 'sampleSentenceEn' ? null : 'sampleSentenceEn');
                        }}
                        title="Filter column"
                      >
                        ▼
                      </button>
                    </div>
                    {openFilterDropdown === 'sampleSentenceEn' && (
                      <ColumnFilterDropdown
                        columnKey="sampleSentenceEn"
                        columnLabel="Sample Sentence (EN)"
                        uniqueValues={getUniqueValues('sampleSentenceEn')}
                        selectedValues={columnFilters.sampleSentenceEn}
                        onFilterChange={handleColumnFilterChange}
                        onSelectAll={() => handleSelectAllColumnFilter('sampleSentenceEn')}
                        onDeselectAll={() => handleDeselectAllColumnFilter('sampleSentenceEn')}
                        onClose={() => setOpenFilterDropdown(null)}
                      />
                    )}
                  </th>
                )}
                {columnVisibility.sampleSentenceTr && (
                  <th 
                    className="filterable-header"
                    onContextMenu={(e) => handleContextMenu(e, 'sampleSentenceTr')}
                  >
                    <div className="header-content">
                      <span>Sample Sentence (TR)</span>
                      <button
                        className={`filter-icon ${isColumnFilterActive('sampleSentenceTr') ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenFilterDropdown(openFilterDropdown === 'sampleSentenceTr' ? null : 'sampleSentenceTr');
                        }}
                        title="Filter column"
                      >
                        ▼
                      </button>
                    </div>
                    {openFilterDropdown === 'sampleSentenceTr' && (
                      <ColumnFilterDropdown
                        columnKey="sampleSentenceTr"
                        columnLabel="Sample Sentence (TR)"
                        uniqueValues={getUniqueValues('sampleSentenceTr')}
                        selectedValues={columnFilters.sampleSentenceTr}
                        onFilterChange={handleColumnFilterChange}
                        onSelectAll={() => handleSelectAllColumnFilter('sampleSentenceTr')}
                        onDeselectAll={() => handleDeselectAllColumnFilter('sampleSentenceTr')}
                        onClose={() => setOpenFilterDropdown(null)}
                      />
                    )}
                  </th>
                )}
                {columnVisibility.source && (
                  <th 
                    className="filterable-header"
                    onContextMenu={(e) => handleContextMenu(e, 'source')}
                  >
                    <div className="header-content">
                      <span>Source</span>
                      <button
                        className={`filter-icon ${isColumnFilterActive('source') ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenFilterDropdown(openFilterDropdown === 'source' ? null : 'source');
                        }}
                        title="Filter column"
                      >
                        ▼
                      </button>
                    </div>
                    {openFilterDropdown === 'source' && (
                      <ColumnFilterDropdown
                        columnKey="source"
                        columnLabel="Source"
                        uniqueValues={getUniqueValues('source')}
                        selectedValues={columnFilters.source}
                        onFilterChange={handleColumnFilterChange}
                        onSelectAll={() => handleSelectAllColumnFilter('source')}
                        onDeselectAll={() => handleDeselectAllColumnFilter('source')}
                        onClose={() => setOpenFilterDropdown(null)}
                      />
                    )}
                  </th>
                )}
                {columnVisibility.isKnown && (
                  <th 
                    className="filterable-header"
                    onContextMenu={(e) => handleContextMenu(e, 'isKnown')}
                  >
                    <div className="header-content">
                      <span>IsKnown?</span>
                      <button
                        className={`filter-icon ${isColumnFilterActive('isKnown') ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenFilterDropdown(openFilterDropdown === 'isKnown' ? null : 'isKnown');
                        }}
                        title="Filter column"
                      >
                        ▼
                      </button>
                    </div>
                    {openFilterDropdown === 'isKnown' && (
                      <ColumnFilterDropdown
                        columnKey="isKnown"
                        columnLabel="IsKnown?"
                        uniqueValues={getUniqueValues('isKnown')}
                        selectedValues={columnFilters.isKnown}
                        onFilterChange={handleColumnFilterChange}
                        onSelectAll={() => handleSelectAllColumnFilter('isKnown')}
                        onDeselectAll={() => handleDeselectAllColumnFilter('isKnown')}
                        onClose={() => setOpenFilterDropdown(null)}
                      />
                    )}
                  </th>
                )}
                {columnVisibility.isSpelled && (
                  <th 
                    className="filterable-header"
                    onContextMenu={(e) => handleContextMenu(e, 'isSpelled')}
                  >
                    <div className="header-content">
                      <span>IsSpelled</span>
                      <button
                        className={`filter-icon ${isColumnFilterActive('isSpelled') ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenFilterDropdown(openFilterDropdown === 'isSpelled' ? null : 'isSpelled');
                        }}
                        title="Filter column"
                      >
                        ▼
                      </button>
                    </div>
                    {openFilterDropdown === 'isSpelled' && (
                      <ColumnFilterDropdown
                        columnKey="isSpelled"
                        columnLabel="IsSpelled"
                        uniqueValues={getUniqueValues('isSpelled')}
                        selectedValues={columnFilters.isSpelled}
                        onFilterChange={handleColumnFilterChange}
                        onSelectAll={() => handleSelectAllColumnFilter('isSpelled')}
                        onDeselectAll={() => handleDeselectAllColumnFilter('isSpelled')}
                        onClose={() => setOpenFilterDropdown(null)}
                      />
                    )}
                  </th>
                )}
                {columnVisibility.image && (
                  <th 
                    className="filterable-header"
                    onContextMenu={(e) => handleContextMenu(e, 'image')}
                  >
                    <div className="header-content">
                      <span>Image</span>
                    </div>
                  </th>
                )}
                {showDeleteButton && (
                  <th 
                    onContextMenu={(e) => handleContextMenu(e, null)}
                    style={{ cursor: 'context-menu' }}
                  >
                    Delete
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="words-table-body">
              {getFilteredWords().length === 0 ? (
                <tr>
                  <td 
                    colSpan={20} 
                    className="empty-table-cell"
                  >
                    <div style={{ 
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '100%'
                    }}>
                      <p>No words found matching your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                getFilteredWords().map(word => (
                <tr 
                  key={word._id} 
                  className={`word-row ${word.isKnown === true ? 'known' : word.isKnown === false ? 'unknown' : ''} ${selectedWords.has(word._id) ? 'selected' : ''}`}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedWords.has(word._id)}
                      onChange={() => handleWordSelectInternal(word._id)}
                    />
                  </td>
                  {columnVisibility.englishWord && (
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
                  )}
                  {columnVisibility.turkishMeaning && (
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
                  )}
                  {columnVisibility.wordType && (
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
                  )}
                  {columnVisibility.englishLevel && (
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
                  )}
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
                  {columnVisibility.source && (
                    <td className="word-category-cell">
                      {word.sources && word.sources.length > 0 ? (
                        <span className="source-badge" title={word.sources.join(', ')}>
                          {word.sources.length === 1 
                            ? word.sources[0] 
                            : `${word.sources[0]} (+${word.sources.length - 1})`}
                        </span>
                      ) : '-'}
                    </td>
                  )}
                  {columnVisibility.isKnown && (
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
                  )}
                  {columnVisibility.isSpelled && (
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
                  )}
                  {columnVisibility.image && (
                    <td className="word-image-cell" style={{ padding: '0.5rem' }}>
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        {word.imageUrl ? (
                          <>
                            <img 
                              src={word.imageUrl} 
                              alt={word.englishWord}
                              style={{ 
                                width: `${imageSize}px`, 
                                height: `${imageSize}px`, 
                                objectFit: 'cover',
                                borderRadius: '4px',
                                border: '1px solid #e2e8f0',
                                cursor: 'pointer',
                                display: 'block'
                              }}
                              onClick={() => window.open(word.imageUrl, '_blank')}
                              onError={(e) => {
                                e.target.src = 'https://img.freepik.com/free-vector/illustration-gallery-icon_53876-27002.jpg?semt=ais_hybrid&w=740&q=80';
                              }}
                            />
                            {/* Bottom controls container */}
                            <div style={{
                              position: 'absolute',
                              bottom: '4px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              zIndex: 10,
                              background: 'rgba(255, 255, 255, 0.95)',
                              padding: '0.25rem',
                              borderRadius: '4px',
                              border: '1px solid #e2e8f0'
                            }}>
                              {imageHistory[word._id] && (() => {
                                const history = imageHistory[word._id];
                                const canGoBack = history.currentIndex > 0;
                                const canGoForward = history.currentIndex < history.history.length - 1;
                                return (
                                  <>
                                    {/* ⬅️ Left/Bottom - Previous */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigateImage(word._id, 'prev');
                                      }}
                                      disabled={!canGoBack}
                                      style={{
                                        background: canGoBack ? 'rgba(255, 255, 255, 0.9)' : 'rgba(240, 240, 240, 0.9)',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '4px',
                                        padding: '0.25rem',
                                        fontSize: '1rem',
                                        cursor: canGoBack ? 'pointer' : 'not-allowed',
                                        opacity: canGoBack ? 1 : 0.5,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '28px',
                                        height: '28px'
                                      }}
                                      title="Previous image"
                                    >
                                      ⬅️
                                    </button>
                                  </>
                                );
                              })()}
                              {/* Search query input */}
                              {(
                                <>
                                  <input
                                    type="text"
                                    placeholder="Search query or image URL..."
                                    value={customQueries[word._id] || ''}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      setCustomQueries({
                                        ...customQueries,
                                        [word._id]: e.target.value
                                      });
                                    }}
                                    onPaste={(e) => {
                                      e.stopPropagation();
                                      // Allow paste to complete, then check if it's a URL
                                      setTimeout(() => {
                                        const pastedValue = e.clipboardData.getData('text');
                                        const trimmed = pastedValue.trim();
                                        if (trimmed && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
                                          setCustomQueries({
                                            ...customQueries,
                                            [word._id]: trimmed
                                          });
                                          handleGenerateImage(word._id, trimmed);
                                        }
                                      }, 50);
                                    }}
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        e.stopPropagation();
                                        const query = customQueries[word._id]?.trim() || null;
                                        handleGenerateImage(word._id, query);
                                      }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      padding: '0.25rem 0.5rem',
                                      fontSize: '0.75rem',
                                      border: '1px solid #e2e8f0',
                                      borderRadius: '4px',
                                      width: '80px',
                                      minWidth: '60px',
                                      background: 'white'
                                    }}
                                    title="Enter custom search query or paste image URL"
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const query = customQueries[word._id]?.trim() || null;
                                      handleGenerateImage(word._id, query);
                                    }}
                                    disabled={generatingImages[word._id]}
                                    style={{
                                      background: generatingImages[word._id] ? 'rgba(240, 240, 240, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                                      border: '1px solid #e2e8f0',
                                      borderRadius: '4px',
                                      padding: '0.25rem',
                                      fontSize: '1rem',
                                      cursor: generatingImages[word._id] ? 'not-allowed' : 'pointer',
                                      opacity: generatingImages[word._id] ? 0.5 : 1,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: '28px',
                                      height: '28px'
                                    }}
                                    title={generatingImages[word._id] ? 'Generating...' : 'Generate image'}
                                  >
                                    {generatingImages[word._id] ? '⏳' : '🔄'}
                                  </button>
                                  {/* 🗑️ Delete image - shown even when no image exists */}
                                  {word.imageUrl && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm('Are you sure you want to delete this image?')) {
                                          handleDeleteImage(word._id);
                                        }
                                      }}
                                      style={{
                                        background: 'rgba(255, 255, 255, 0.9)',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '4px',
                                        padding: '0.25rem',
                                        fontSize: '1rem',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '28px',
                                        height: '28px'
                                      }}
                                      title="Delete image"
                                    >
                                      🗑️
                                    </button>
                                  )}
                              {imageHistory[word._id] && (() => {
                                const history = imageHistory[word._id];
                                const canGoForward = history.currentIndex < history.history.length - 1;
                                return (
                                  <>
                                    {/* ➡️ Right/Bottom - Next */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigateImage(word._id, 'next');
                                      }}
                                      disabled={!canGoForward}
                                      style={{
                                        background: canGoForward ? 'rgba(255, 255, 255, 0.9)' : 'rgba(240, 240, 240, 0.9)',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '4px',
                                        padding: '0.25rem',
                                        fontSize: '1rem',
                                        cursor: canGoForward ? 'pointer' : 'not-allowed',
                                        opacity: canGoForward ? 1 : 0.5,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '28px',
                                        height: '28px'
                                      }}
                                      title="Next image"
                                    >
                                      ➡️
                                    </button>
                                  </>
                                );
                              })()}
                                </>
                              )}
                              </div>
                            </>
                          ) : (
                          <div style={{ position: 'relative', width: `${imageSize}px`, height: `${imageSize}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f7fafc' }}>
                            <span style={{ color: '#999', fontSize: '0.85rem' }}>-</span>
                            <div style={{
                              position: 'absolute',
                              bottom: '4px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              zIndex: 10,
                              background: 'rgba(255, 255, 255, 0.95)',
                              padding: '0.25rem',
                              borderRadius: '4px',
                              border: '1px solid #e2e8f0'
                            }}>
                              <input
                                type="text"
                                placeholder="Search query or image URL..."
                                value={customQueries[word._id] || ''}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  setCustomQueries({
                                    ...customQueries,
                                    [word._id]: e.target.value
                                  });
                                }}
                                onPaste={(e) => {
                                  e.stopPropagation();
                                  // Allow paste to complete, then check if it's a URL
                                  setTimeout(() => {
                                    const pastedValue = e.clipboardData.getData('text');
                                    const trimmed = pastedValue.trim();
                                    if (trimmed && (trimmed.startsWith('http://') || trimmed.startsWith('https://'))) {
                                      setCustomQueries({
                                        ...customQueries,
                                        [word._id]: trimmed
                                      });
                                      handleGenerateImage(word._id, trimmed);
                                    }
                                  }, 50);
                                }}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    e.stopPropagation();
                                    const query = customQueries[word._id]?.trim() || null;
                                    handleGenerateImage(word._id, query);
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  padding: '0.25rem 0.5rem',
                                  fontSize: '0.75rem',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '4px',
                                  width: '80px',
                                  minWidth: '60px',
                                  background: 'white'
                                }}
                                title="Enter custom search query or paste image URL"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const query = customQueries[word._id]?.trim() || null;
                                  handleGenerateImage(word._id, query);
                                }}
                                disabled={generatingImages[word._id]}
                                style={{
                                  background: generatingImages[word._id] ? 'rgba(240, 240, 240, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '4px',
                                  padding: '0.25rem',
                                  fontSize: '1rem',
                                  cursor: generatingImages[word._id] ? 'not-allowed' : 'pointer',
                                  opacity: generatingImages[word._id] ? 0.5 : 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '28px',
                                  height: '28px'
                                }}
                                title={generatingImages[word._id] ? 'Generating...' : 'Generate image'}
                              >
                                {generatingImages[word._id] ? '⏳' : '🔄'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  )}
                  {showDeleteButton && (
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
                  )}
                </tr>
                ))
              )}
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
            onClick={() => handleToggleColumn('englishWord')}
            style={{
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              backgroundColor: columnVisibility.englishWord ? '#e6f3ff' : 'transparent'
            }}
          >
            {columnVisibility.englishWord ? '✓' : ''} English Word
          </div>
          <div
            className="context-menu-item"
            onClick={() => handleToggleColumn('turkishMeaning')}
            style={{
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              backgroundColor: columnVisibility.turkishMeaning ? '#e6f3ff' : 'transparent'
            }}
          >
            {columnVisibility.turkishMeaning ? '✓' : ''} Turkish Meaning
          </div>
          <div
            className="context-menu-item"
            onClick={() => handleToggleColumn('wordType')}
            style={{
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              backgroundColor: columnVisibility.wordType ? '#e6f3ff' : 'transparent'
            }}
          >
            {columnVisibility.wordType ? '✓' : ''} Word Type
          </div>
          <div
            className="context-menu-item"
            onClick={() => handleToggleColumn('englishLevel')}
            style={{
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              backgroundColor: columnVisibility.englishLevel ? '#e6f3ff' : 'transparent'
            }}
          >
            {columnVisibility.englishLevel ? '✓' : ''} English Level
          </div>
          <div
            className="context-menu-item"
            onClick={() => handleToggleColumn('image')}
            style={{
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              backgroundColor: columnVisibility.image ? '#e6f3ff' : 'transparent'
            }}
          >
            {columnVisibility.image ? '✓' : ''} Image
          </div>
          <div style={{ borderTop: '1px solid #e2e8f0', margin: '0.25rem 0' }}></div>
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
          <div style={{ borderTop: '1px solid #e2e8f0', margin: '0.25rem 0' }}></div>
          <div
            className="context-menu-item"
            onClick={() => handleToggleColumn('source')}
            style={{
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              backgroundColor: columnVisibility.source ? '#e6f3ff' : 'transparent'
            }}
          >
            {columnVisibility.source ? '✓' : ''} Source
          </div>
          <div
            className="context-menu-item"
            onClick={() => handleToggleColumn('isKnown')}
            style={{
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              backgroundColor: columnVisibility.isKnown ? '#e6f3ff' : 'transparent'
            }}
          >
            {columnVisibility.isKnown ? '✓' : ''} Is Known
          </div>
          <div
            className="context-menu-item"
            onClick={() => handleToggleColumn('isSpelled')}
            style={{
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              backgroundColor: columnVisibility.isSpelled ? '#e6f3ff' : 'transparent'
            }}
          >
            {columnVisibility.isSpelled ? '✓' : ''} Is Spelled
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="pagination">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <label htmlFor="items-per-page-bottom" style={{ fontSize: '0.8rem', color: '#4a5568', margin: 0 }}>
              Rows:
            </label>
            <select
              id="items-per-page-bottom"
              value={itemsPerPage}
              onChange={(e) => {
                const value = e.target.value;
                setItemsPerPage(value === '-1' ? -1 : parseInt(value));
              }}
              style={{
                padding: '0.25rem 0.5rem',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                fontSize: '0.8rem',
                backgroundColor: 'white',
                cursor: 'pointer',
                minWidth: '60px'
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
              <option value={1000}>1000</option>
              <option value={2500}>2500</option>
              <option value={5000}>5000</option>
              <option value={10000}>10000</option>
              <option value={-1}>All</option>
            </select>
          </div>
          {totalPages > 1 && (
            <>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
              >
                Prev
              </button>
              <span className="page-info">
                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={pageInput}
                  onChange={handlePageInputChange}
                  onKeyPress={handlePageInputKeyPress}
                  onBlur={handlePageInputBlur}
                  className="page-input"
                />
                <span style={{ fontSize: '0.8rem', marginLeft: '0.25rem' }}>/ {totalPages}</span>
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn btn-secondary"
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
              >
                Next
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default WordList;

