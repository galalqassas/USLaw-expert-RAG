// Application constants - centralized configuration
export const APP_NAME = 'LawRAG';

// Color thresholds for relevance scoring
export const RELEVANCE_THRESHOLDS = {
  HIGH: 95,    // Green
  MEDIUM: 90,  // Yellow/Warning
  LOW: 0,      // Gray
} as const;

// UI Text constants
export const UI_TEXT = {
  SOURCES_TITLE: 'Sources',
  RETRIEVAL_LABEL: 'Retrieval',
  SYNTHESIS_LABEL: 'Synthesis',
  SEND_BUTTON: 'Send',
  INPUT_PLACEHOLDER: 'Ask a follow-up question...',
  EXPAND_BUTTON: 'Expand',
  MATCH_SUFFIX: '% Match',
} as const;

// File type display configuration
export const FILE_TYPE_CONFIG = {
  pdf: {
    label: 'PDF',
    bgLight: 'bg-red-100',
    textLight: 'text-red-700',
    bgDark: 'dark:bg-red-900/30',
    textDark: 'dark:text-red-400',
  },
  docx: {
    label: 'DOCX',
    bgLight: 'bg-blue-100',
    textLight: 'text-blue-700',
    bgDark: 'dark:bg-blue-900/30',
    textDark: 'dark:text-blue-400',
  },
  web: {
    label: 'WEB',
    bgLight: 'bg-green-100',
    textLight: 'text-green-700',
    bgDark: 'dark:bg-green-900/30',
    textDark: 'dark:text-green-400',
  },
} as const;
