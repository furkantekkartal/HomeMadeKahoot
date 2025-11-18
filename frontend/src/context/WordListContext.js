import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { wordAPI } from '../services/api';

const WordListContext = createContext();

export const useWordList = () => {
  const context = useContext(WordListContext);
  if (!context) {
    throw new Error('useWordList must be used within a WordListProvider');
  }
  return context;
};

export const WordListProvider = ({ children }) => {
  // Ref to track manual filter updates to prevent unnecessary reloads
  const isManualUpdateRef = useRef(false);
  // Core state
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [selectedWords, setSelectedWords] = useState(new Set());
  const [selectingAllFiltered, setSelectingAllFiltered] = useState(false);
  const [allFilteredWordIds, setAllFilteredWordIds] = useState(new Set());
  
  // Filters
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
  
  // Supporting data
  const [sources, setSources] = useState([]);
  const [filterValues, setFilterValues] = useState({
    levels: [],
    types: [],
    categories1: [],
    categories2: [],
    categories3: []
  });
  
  // Column filters and visibility
  const [columnFilters, setColumnFilters] = useState({
    englishWord: new Set(),
    turkishMeaning: new Set(),
    wordType: new Set(),
    englishLevel: new Set(),
    category1: new Set(),
    category2: new Set(),
    category3: new Set(),
    sampleSentenceEn: new Set(),
    sampleSentenceTr: new Set(),
    source: new Set(),
    isKnown: new Set(),
    isSpelled: new Set()
  });
  const [columnVisibility, setColumnVisibility] = useState({
    category1: true,
    category2: true,
    category3: false,
    sampleSentenceEn: false,
    sampleSentenceTr: false
  });
  
  // Filtering and pagination
  const [allWordsForFiltering, setAllWordsForFiltering] = useState([]);
  const [allFilteredWords, setAllFilteredWords] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [editingField, setEditingField] = useState(null);
  const [openFilterDropdown, setOpenFilterDropdown] = useState(null);
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, column: null });

  // Load sources
  const loadSources = useCallback(async () => {
    try {
      const response = await wordAPI.getSources();
      setSources(response.data.sources || []);
    } catch (error) {
      console.error('Error loading sources:', error);
    }
  }, []);

  // Load filter values
  const loadFilterValues = useCallback(async () => {
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
  }, []);

  // Load all words for filtering
  const loadAllWordsForFiltering = useCallback(async () => {
    try {
      const allWords = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await wordAPI.getWordsWithStatus({
          page: currentPage,
          limit: 1000,
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

      setAllWordsForFiltering(allWords);
    } catch (error) {
      console.error('Error loading words for filtering:', error);
    }
  }, [appliedFilters]);

  // Apply column filters
  const applyColumnFilters = useCallback((wordsToFilter) => {
    return wordsToFilter.filter(word => {
      for (const [columnKey, selectedValues] of Object.entries(columnFilters)) {
        if (selectedValues.size === 0) continue;
        
        let value;
        switch (columnKey) {
          case 'englishWord':
            value = word.englishWord;
            break;
          case 'turkishMeaning':
            value = word.turkishMeaning;
            break;
          case 'wordType':
            value = word.wordType;
            break;
          case 'englishLevel':
            value = word.englishLevel;
            break;
          case 'category1':
            value = word.category1;
            break;
          case 'category2':
            value = word.category2;
            break;
          case 'category3':
            value = word.category3;
            break;
          case 'sampleSentenceEn':
            value = word.sampleSentenceEn;
            break;
          case 'sampleSentenceTr':
            value = word.sampleSentenceTr;
            break;
          case 'source':
            value = word.sources && word.sources.length > 0 ? word.sources[0] : null;
            break;
          case 'isKnown':
            value = word.isKnown === true ? 'Known' : word.isKnown === false ? 'Unknown' : 'Not Set';
            break;
          case 'isSpelled':
            value = word.isSpelled === true ? 'Yes' : word.isSpelled === false ? 'No' : 'Not Set';
            break;
          default:
            value = word[columnKey];
        }
        
        const valueStr = value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0) 
          ? '(Blanks)' 
          : String(value);
        
        if (!selectedValues.has(valueStr)) {
          return false;
        }
      }
      return true;
    });
  }, [columnFilters]);

  // Get unique values for column filtering
  const getUniqueValues = useCallback((columnKey) => {
    const values = new Set();
    const emptyCount = { count: 0 };
    
    allWordsForFiltering.forEach(word => {
      let value;
      
      switch (columnKey) {
        case 'englishWord':
          value = word.englishWord;
          break;
        case 'turkishMeaning':
          value = word.turkishMeaning;
          break;
        case 'wordType':
          value = word.wordType;
          break;
        case 'englishLevel':
          value = word.englishLevel;
          break;
        case 'category1':
          value = word.category1;
          break;
        case 'category2':
          value = word.category2;
          break;
        case 'category3':
          value = word.category3;
          break;
        case 'sampleSentenceEn':
          value = word.sampleSentenceEn;
          break;
        case 'sampleSentenceTr':
          value = word.sampleSentenceTr;
          break;
        case 'source':
          value = word.sources && word.sources.length > 0 ? word.sources[0] : null;
          break;
        case 'isKnown':
          value = word.isKnown === true ? 'Known' : word.isKnown === false ? 'Unknown' : 'Not Set';
          break;
        case 'isSpelled':
          value = word.isSpelled === true ? 'Yes' : word.isSpelled === false ? 'No' : 'Not Set';
          break;
        default:
          value = word[columnKey];
      }
      
      if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
        emptyCount.count++;
      } else {
        values.add(String(value));
      }
    });
    
    const sortedValues = Array.from(values).sort((a, b) => {
      if (a === '' || a === null) return 1;
      if (b === '' || b === null) return -1;
      return a.localeCompare(b);
    });
    
    return { values: sortedValues, emptyCount: emptyCount.count };
  }, [allWordsForFiltering]);

  // Apply column filters when they change
  useEffect(() => {
    if (allWordsForFiltering.length > 0) {
      const filtered = applyColumnFilters(allWordsForFiltering);
      setAllFilteredWords(filtered);
      setPage(1);
      setPageInput('1');
    }
  }, [columnFilters, allWordsForFiltering, applyColumnFilters]);

  // Load paginated data from filtered words
  useEffect(() => {
    if (allFilteredWords.length > 0) {
      setLoading(true);
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedWords = allFilteredWords.slice(startIndex, endIndex);
      setWords(paginatedWords);
      setTotalPages(Math.ceil(allFilteredWords.length / itemsPerPage));
      setLoading(false);
    } else if (allFilteredWords.length === 0 && allWordsForFiltering.length > 0) {
      setWords([]);
      setTotalPages(1);
      setLoading(false);
    }
  }, [page, allFilteredWords, itemsPerPage]);

  // Load data when filters change
  useEffect(() => {
    // Skip if this is a manual update (we handle it ourselves)
    if (isManualUpdateRef.current) {
      isManualUpdateRef.current = false;
      return;
    }
    loadSources();
    loadFilterValues();
    loadAllWordsForFiltering();
  }, [appliedFilters, loadSources, loadFilterValues, loadAllWordsForFiltering]);

  // Update page input when page changes
  useEffect(() => {
    setPageInput(page.toString());
  }, [page]);

  // Reset to page 1 when items per page changes
  useEffect(() => {
    setPage(1);
    setPageInput('1');
  }, [itemsPerPage]);

  // Word operations
  const handleToggleWord = useCallback(async (wordId, currentStatus) => {
    try {
      const newStatus = currentStatus === true ? false : true;
      await wordAPI.toggleWordStatus(wordId, newStatus);
      setWords(words.map(word => 
        word._id === wordId 
          ? { ...word, isKnown: newStatus }
          : word
      ));
      setAllWordsForFiltering(prev => prev.map(word => 
        word._id === wordId 
          ? { ...word, isKnown: newStatus }
          : word
      ));
      setAllFilteredWords(prev => prev.map(word => 
        word._id === wordId 
          ? { ...word, isKnown: newStatus }
          : word
      ));
    } catch (error) {
      console.error('Error toggling word status:', error);
      alert('Failed to update word status');
    }
  }, [words]);

  const handleToggleSpelling = useCallback(async (wordId, currentStatus) => {
    try {
      const newStatus = currentStatus === true ? false : true;
      await wordAPI.toggleSpellingStatus(wordId, newStatus);
      setWords(words.map(word => 
        word._id === wordId 
          ? { ...word, isSpelled: newStatus }
          : word
      ));
      setAllWordsForFiltering(prev => prev.map(word => 
        word._id === wordId 
          ? { ...word, isSpelled: newStatus }
          : word
      ));
      setAllFilteredWords(prev => prev.map(word => 
        word._id === wordId 
          ? { ...word, isSpelled: newStatus }
          : word
      ));
    } catch (error) {
      console.error('Error toggling spelling status:', error);
      alert('Failed to update spelling status');
    }
  }, [words]);

  const handleDeleteWord = useCallback(async (wordId, englishWord) => {
    if (!window.confirm(`Are you sure you want to delete "${englishWord}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await wordAPI.deleteWord(wordId);
      setWords(words.filter(word => word._id !== wordId));
      setSelectedWords(prev => {
        const newSet = new Set(prev);
        newSet.delete(wordId);
        return newSet;
      });
      setAllWordsForFiltering(prev => prev.filter(word => word._id !== wordId));
      setAllFilteredWords(prev => prev.filter(word => word._id !== wordId));
      
      if (words.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        loadAllWordsForFiltering();
      }
    } catch (error) {
      console.error('Error deleting word:', error);
      alert('Failed to delete word: ' + (error.response?.data?.message || error.message));
    }
  }, [words, page, loadAllWordsForFiltering]);

  const handleDeleteSelected = useCallback(async () => {
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
      
      setWords(words.filter(word => !selectedWords.has(word._id)));
      setSelectedWords(new Set());
      setAllWordsForFiltering(prev => prev.filter(word => !selectedWords.has(word._id)));
      setAllFilteredWords(prev => prev.filter(word => !selectedWords.has(word._id)));
      
      loadAllWordsForFiltering();
    } catch (error) {
      console.error('Error deleting words:', error);
      alert('Failed to delete words: ' + (error.response?.data?.message || error.message));
    }
  }, [selectedWords, words, loadAllWordsForFiltering]);

  const handleFieldChange = useCallback(async (wordId, field, value) => {
    try {
      await wordAPI.updateWord(wordId, { [field]: value });
      setWords(words.map(word => 
        word._id === wordId 
          ? { ...word, [field]: value }
          : word
      ));
      setAllWordsForFiltering(prev => prev.map(word => 
        word._id === wordId 
          ? { ...word, [field]: value }
          : word
      ));
      setAllFilteredWords(prev => prev.map(word => 
        word._id === wordId 
          ? { ...word, [field]: value }
          : word
      ));
      setEditingField(null);
    } catch (error) {
      console.error('Error updating word:', error);
      alert('Failed to update word: ' + (error.response?.data?.message || error.message));
    }
  }, [words]);

  // Selection handlers
  const handleSelectWord = useCallback((wordId) => {
    setSelectedWords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(wordId)) {
        newSet.delete(wordId);
      } else {
        newSet.add(wordId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedWords.size === words.length && words.length > 0) {
      setSelectedWords(new Set());
    } else {
      setSelectedWords(new Set(words.map(w => w._id)));
    }
  }, [selectedWords, words]);

  const handleSelectAllFiltered = useCallback(async () => {
    const allFilteredSelected = allFilteredWordIds.size > 0 && 
      Array.from(allFilteredWordIds).every(id => selectedWords.has(id));

    if (allFilteredSelected) {
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
      
      const allWords = [];
      let currentPage = 1;
      let hasMore = true;

      while (hasMore) {
        const response = await wordAPI.getWordsWithStatus({
          page: currentPage,
          limit: 1000,
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

      const allWordIds = allWords.map(word => word._id);
      const allWordIdsSet = new Set(allWordIds);
      setAllFilteredWordIds(allWordIdsSet);
      setSelectedWords(prev => new Set([...prev, ...allWordIds]));
    } catch (error) {
      console.error('Error selecting all filtered words:', error);
      alert('Failed to select all filtered words: ' + (error.response?.data?.message || error.message));
    } finally {
      setSelectingAllFiltered(false);
    }
  }, [allFilteredWordIds, selectedWords, appliedFilters]);

  const handleSelectActiveSource = useCallback(async (sourceId) => {
    if (!sourceId) {
      alert('No active source available');
      return;
    }

    // Check if already filtered by this source and words are selected
    const isCurrentlyActive = appliedFilters.sourceId === sourceId && selectedWords.size > 0;
    
    if (isCurrentlyActive) {
      // Uncheck: Clear filter and deselect words
      const newFilters = { ...filters, sourceId: '' };
      setFilters(newFilters);
      setSelectedWords(new Set());
      setAllFilteredWordIds(new Set());
      setPage(1);
      setPageInput('1');
      // Mark as manual update to prevent useEffect from triggering
      isManualUpdateRef.current = true;
      setAppliedFilters(newFilters);
      // Only refresh word list data, not the whole page
      await loadAllWordsForFiltering();
      return;
    }

    try {
      setSelectingAllFiltered(true);
      
      // Get all words from this source first (before updating filters)
      const allWords = [];
      let currentPage = 1;
      let hasMore = true;
      
      const tempFilters = { ...filters, sourceId };

      while (hasMore) {
        const response = await wordAPI.getWordsWithStatus({
          page: currentPage,
          limit: 1000,
          ...tempFilters,
          sourceId: sourceId,
          showKnown: tempFilters.showKnown ? 'true' : 'false',
          showUnknown: tempFilters.showUnknown ? 'true' : 'false'
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

      const allWordIds = allWords.map(word => word._id);
      const allWordIdsSet = new Set(allWordIds);
      setAllFilteredWordIds(allWordIdsSet);
      setSelectedWords(new Set(allWordIds));
      
      // Update word list state directly without triggering full refresh
      setAllWordsForFiltering(allWords);
      // Apply column filters to the fetched words
      const filtered = applyColumnFilters(allWords);
      setAllFilteredWords(filtered);
      
      // Update filters after words are loaded to prevent useEffect from reloading
      setFilters(tempFilters);
      // Mark as manual update to prevent useEffect from triggering
      isManualUpdateRef.current = true;
      setAppliedFilters(tempFilters);
      
      // Refresh words to show filtered results
      setPage(1);
      setPageInput('1');
    } catch (error) {
      console.error('Error selecting active source words:', error);
      alert('Failed to select active source words: ' + (error.response?.data?.message || error.message));
    } finally {
      setSelectingAllFiltered(false);
    }
  }, [filters, appliedFilters, selectedWords, applyColumnFilters, loadAllWordsForFiltering]);

  // Filter handlers
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters({ ...filters });
    setPage(1);
    setAllFilteredWordIds(new Set());
  }, [filters]);

  const handleColumnFilterChange = useCallback((columnKey, value, checked) => {
    setColumnFilters(prev => {
      const newFilters = { ...prev };
      const newSet = new Set(prev[columnKey]);
      
      if (checked) {
        newSet.add(value);
      } else {
        newSet.delete(value);
      }
      
      newFilters[columnKey] = newSet;
      return newFilters;
    });
  }, []);

  const handleSelectAllColumnFilter = useCallback((columnKey) => {
    const { values, emptyCount } = getUniqueValues(columnKey);
    const allValues = [...values];
    if (emptyCount > 0) {
      allValues.push('(Blanks)');
    }
    
    setColumnFilters(prev => {
      const newFilters = { ...prev };
      newFilters[columnKey] = new Set(allValues);
      return newFilters;
    });
  }, [getUniqueValues]);

  const handleDeselectAllColumnFilter = useCallback((columnKey) => {
    setColumnFilters(prev => {
      const newFilters = { ...prev };
      newFilters[columnKey] = new Set();
      return newFilters;
    });
  }, []);

  const isColumnFilterActive = useCallback((columnKey) => {
    const selectedValues = columnFilters[columnKey];
    if (!selectedValues || selectedValues.size === 0) {
      return false;
    }
    
    const { values, emptyCount } = getUniqueValues(columnKey);
    const allValues = [...values];
    if (emptyCount > 0) {
      allValues.push('(Blanks)');
    }
    
    return selectedValues.size < allValues.length;
  }, [columnFilters, getUniqueValues]);

  const handleToggleColumn = useCallback((column) => {
    setColumnVisibility(prev => ({
      ...prev,
      [column]: !prev[column]
    }));
    setContextMenu({ show: false, x: 0, y: 0, column: null });
  }, []);

  const handleContextMenu = useCallback((e, column) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      column
    });
  }, []);

  const value = {
    // State
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
    allWordsForFiltering,
    allFilteredWords,
    itemsPerPage,
    editingField,
    openFilterDropdown,
    contextMenu,
    
    // Setters
    setPage,
    setPageInput,
    setSelectedWords,
    setFilters,
    setEditingField,
    setOpenFilterDropdown,
    setItemsPerPage,
    setContextMenu,
    
    // Handlers
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
    
    // Actions
    refreshWords: loadAllWordsForFiltering
  };

  return (
    <WordListContext.Provider value={value}>
      {children}
    </WordListContext.Provider>
  );
};

