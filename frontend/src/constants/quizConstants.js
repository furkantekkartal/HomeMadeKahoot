// Shared constants for quiz levels, skills, and tasks
// Using same terminology as decks for consistency
export const QUIZ_LEVELS = [
  'A1',
  'A2',
  'B1',
  'B2',
  'C1',
  'C2'
];

export const QUIZ_SKILLS = [
  'Speaking',
  'Reading',
  'Writing',
  'Listening'
];

export const QUIZ_TASKS = [
  'Vocabulary',
  'Grammar',
  'Spelling',
  'Essay',
  'Repeat',
  'Read Aloud'
];

// Helper functions for display
export const formatLevel = (level) => {
  return level || '';
};

export const formatSkill = (skill) => {
  return skill || '';
};

export const formatTask = (task) => {
  return task || '';
};

// Legacy support - map old values to new ones
export const QUIZ_CATEGORIES = QUIZ_TASKS.map(t => t.toLowerCase());
export const QUIZ_DIFFICULTIES = QUIZ_LEVELS;
export const formatCategory = formatTask;
export const formatDifficulty = formatLevel;


