import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Log API URL on initialization (only in development)
if (process.env.NODE_ENV === 'development' || !process.env.REACT_APP_API_URL) {
  console.log('API Service initialized with URL:', API_URL);
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  updatePassword: (data) => api.put('/auth/password', data),
  updateProfilePicture: (data) => api.put('/auth/profile-picture', data),
};

// Quiz API
export const quizAPI = {
  getAll: (includeHidden = false) => api.get(`/quizzes${includeHidden ? '?includeHidden=true' : ''}`),
  getMyQuizzes: (includeHidden = false) => api.get(`/quizzes/my${includeHidden ? '?includeHidden=true' : ''}`),
  getQuiz: (id) => api.get(`/quizzes/${id}`),
  createQuiz: (data) => api.post('/quizzes', data),
  updateQuiz: (id, data) => api.put(`/quizzes/${id}`, data),
  deleteQuiz: (id) => api.delete(`/quizzes/${id}`),
  toggleQuizVisibility: (id) => api.patch(`/quizzes/${id}/visibility`),
  generateQuestionImage: (questionText, options) => api.post('/quizzes/generate-image', { questionText, options }),
  generateQuizTitle: (category, difficulty) => api.post('/quizzes/generate-title', { category, difficulty }),
  generateQuizDescription: (title, category, difficulty) => api.post('/quizzes/generate-description', { title, category, difficulty }),
  generateQuizQuestions: (title, description, category, difficulty, questionCount) => api.post('/quizzes/generate-questions', { title, description, category, difficulty, questionCount }),
  generateQuizFromFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/quizzes/generate-from-file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  generateQuizFromYouTube: (videoUrl) => api.post('/quizzes/generate-from-youtube', { videoUrl }),
  generateQuizFromContent: (content, sourceType) => api.post('/quizzes/generate-from-content', { content, sourceType }),
};

// Session API
export const sessionAPI = {
  createSession: (data) => api.post('/sessions', data),
  getSessionByPIN: (pin) => api.get(`/sessions/pin/${pin}`),
  getSession: (id) => api.get(`/sessions/${id}`),
  getMySessions: () => api.get('/sessions/my'),
  saveResult: (data) => api.post('/sessions/results', data),
  getMyResults: () => api.get('/sessions/results/my'),
  getMyPerformance: (filters) => api.get('/sessions/performance', { params: filters }),
  getGameStats: (filters) => api.get('/sessions/game-stats', { params: filters }),
  getTeacherAnalytics: (filters) => api.get('/sessions/analytics', { params: filters }),
  resetGamePerformance: () => api.delete('/sessions/game-stats/reset'),
};

// Word Database API
export const wordAPI = {
  getWords: (params) => api.get('/words', { params }),
  getWord: (id) => api.get(`/words/${id}`),
  updateWord: (id, data) => api.put(`/words/${id}`, data),
  deleteWord: (id) => api.delete(`/words/${id}`),
  getUserWordStats: () => api.get('/words/user/stats'),
  getWordsWithStatus: (params) => api.get('/words/user/words', { params }),
  toggleWordStatus: (wordId, isKnown) => api.post('/words/user/toggle', { wordId, isKnown }),
  toggleSpellingStatus: (wordId, isSpelled) => api.post('/words/user/toggle-spelling', { wordId, isSpelled }),
  bulkMarkWords: (wordIds, isKnown) => api.post('/words/user/bulk-mark', { wordIds, isKnown }),
  exportWords: (format = 'csv') => {
    return api.get('/words/user/export', { 
      params: { format },
      responseType: format === 'csv' ? 'blob' : 'json'
    });
  },
  importWords: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/words/user/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  generateWordImage: (wordId, customKeywords, service = 'google') => api.post(`/words/${wordId}/generate-image`, { customKeywords, service }),
  addWordsFromAI: (words, sourceName, sourceType, fileSize, contentPreview, url, pageTitle, sourceId) => api.post('/words/add-from-ai', { words, sourceName, sourceType, fileSize, contentPreview, url, pageTitle, sourceId }),
  testSourceTitle: (sourceName, sourceType, contentPreview, url, pageTitle) => api.post('/words/test-source-title', { sourceName, sourceType, contentPreview, url, pageTitle }),
  fillWordColumns: (words = null) => api.post('/words/fill-columns', { words }),
  getWordsWithoutTurkish: () => api.get('/words/without-turkish'),
  getSources: () => api.get('/words/sources'),
  updateSource: (sourceId, data) => api.put(`/words/sources/${sourceId}`, data),
  deleteSource: (sourceId) => api.delete(`/words/sources/${sourceId}`),
  getSourceWords: (sourceId) => api.get(`/words/sources/${sourceId}/words`),
  getFilterValues: () => api.get('/words/filter-values')
};

// Flashcard API
export const flashcardAPI = {
  getMyDecks: (includeHidden = false) => api.get(`/flashcards/decks${includeHidden ? '?includeHidden=true' : ''}`),
  getDeck: (id, filterType = null) => {
    const params = filterType ? `?filterType=${filterType}` : '';
    return api.get(`/flashcards/decks/${id}${params}`);
  },
  createDeck: (name, description, level, skill, task, deckType, wordIds) => api.post('/flashcards/decks', { name, description, level, skill, task, deckType, wordIds }),
  updateDeck: (id, updates) => api.put(`/flashcards/decks/${id}`, updates),
  deleteDeck: (id) => api.delete(`/flashcards/decks/${id}`),
  updateLastStudied: (id) => api.patch(`/flashcards/decks/${id}/last-studied`),
  generateDeckTitle: (level, skill, task) => api.post('/flashcards/generate-title', { level, skill, task }),
  generateDeckDescription: (title, level, skill, task) => api.post('/flashcards/generate-description', { title, level, skill, task }),
  enhanceDeckText: (text, type) => api.post('/flashcards/enhance-text', { text, type }),
  processMarkdownWithAI: (markdownContent, fileType, customPrompt = null) => api.post('/flashcards/process-markdown', { markdownContent, fileType, customPrompt }),
  convertPDFToMD: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/flashcards/convert-pdf-to-md', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  convertWebpageToMD: (url) => api.post('/flashcards/convert-webpage-to-md', { url }),
  generateDeckFromFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/flashcards/generate-from-file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  toggleDeckVisibility: (id) => api.patch(`/flashcards/decks/${id}/visibility`)
};

// Study Session API (Time Tracking)
export const studySessionAPI = {
  start: (module) => api.post('/study-sessions/start', { module }),
  update: (sessionId, durationMinutes, durationSeconds) => api.put(`/study-sessions/${sessionId}/update`, { durationMinutes, durationSeconds }),
  end: (sessionId) => api.post(`/study-sessions/${sessionId}/end`),
  getHistory: (params) => api.get('/study-sessions/history', { params }),
  getStatistics: (params) => api.get('/study-sessions/statistics', { params })
};

// Pronunciation API
export const pronunciationAPI = {
  assessPronunciation: (audioBlob, referenceText, type = 'word') => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.wav');
    formData.append('referenceText', referenceText);
    formData.append('type', type);
    return api.post('/pronunciation/assess', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  getPronunciationStats: (filters) => api.get('/pronunciation/stats', { params: filters })
};

// Statistics API
export const statisticsAPI = {
  getOverview: () => api.get('/statistics/overview'),
  getBadges: () => api.get('/statistics/badges')
};

export default api;

