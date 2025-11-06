import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

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

// Handle 401 errors (unauthorized) - token expired or invalid
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired
      const token = localStorage.getItem('token');
      if (token) {
        // Only clear token if it exists (user was logged in)
        localStorage.removeItem('token');
        // Redirect to login page if we're not already there
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
          // Use setTimeout to avoid navigation during render
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
        }
      }
    }
    return Promise.reject(error);
  }
);

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
  getAll: () => api.get('/quizzes'),
  getMyQuizzes: () => api.get('/quizzes/my'),
  getQuiz: (id) => api.get(`/quizzes/${id}`),
  createQuiz: (data) => api.post('/quizzes', data),
  updateQuiz: (id, data) => api.put(`/quizzes/${id}`, data),
  deleteQuiz: (id) => api.delete(`/quizzes/${id}`),
  generateQuestionImage: (questionText, options) => api.post('/quizzes/generate-image', { questionText, options }),
  generateQuizTitle: (category, difficulty) => api.post('/quizzes/generate-title', { category, difficulty }),
  generateQuizDescription: (title, category, difficulty) => api.post('/quizzes/generate-description', { title, category, difficulty }),
  generateQuizQuestions: (title, description, category, difficulty, questionCount) => api.post('/quizzes/generate-questions', { title, description, category, difficulty, questionCount }),
};

// Session API
export const sessionAPI = {
  createSession: (data) => api.post('/sessions', data),
  getSessionByPIN: (pin) => api.get(`/sessions/pin/${pin}`),
  getSession: (id) => api.get(`/sessions/${id}`),
  getMySessions: () => api.get('/sessions/my'),
  saveResult: (data) => api.post('/sessions/results', data),
  getMyResults: () => api.get('/sessions/results/my'),
  getTeacherAnalytics: (filters) => api.get('/sessions/analytics', { params: filters }),
};

export default api;

