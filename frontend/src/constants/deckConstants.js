// Shared constants for deck levels, skills, and tasks
// These lists are used across the app and should be updated in one place

export const DECK_LEVELS = [
  'A1',
  'A2',
  'B1',
  'B2',
  'C1',
  'C2'
];

export const DECK_SKILLS = [
  'Speaking',
  'Reading',
  'Writing',
  'Listening'
];

export const DECK_TASKS = [
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

