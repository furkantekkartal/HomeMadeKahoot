// Shared constants for quiz categories and difficulties
export const QUIZ_CATEGORIES = [
  'vocabulary',
  'grammar',
  'reading',
  'listening'
];

export const QUIZ_DIFFICULTIES = [
  'beginner',
  'intermediate',
  'advanced'
];

// Helper functions for display
export const formatCategory = (category) => {
  return category ? category.charAt(0).toUpperCase() + category.slice(1) : '';
};

export const formatDifficulty = (difficulty) => {
  return difficulty ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1) : '';
};


