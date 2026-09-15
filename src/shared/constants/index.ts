import type { Settings } from '../types';

export const APP_NAME = 'Etyr';
export const APP_TAGLINE = 'Understand the web as you read it.';

export const LOOKUP_DELAY_MS = 1500;
export const MAX_SELECTION_LENGTH = 200;
export const MIN_SELECTION_LENGTH = 1;
export const HISTORY_LIMIT = 100;
export const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const DICTIONARY_TIMEOUT_MS = 5000;

export const DEFAULT_SETTINGS: Settings = {
  autoLookup: true,
  lookupDelayMs: LOOKUP_DELAY_MS,
  enablePronunciation: true,
  enableHistory: true,
  theme: 'system',
};

export const DICTIONARY_API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';

export const MESSAGE_ACTIONS = {
  DICTIONARY_RESOLVE: 'DICTIONARY_RESOLVE' as const,
  BOOKMARK_SAVE: 'BOOKMARK_SAVE' as const,
  BOOKMARK_IS_SAVED: 'BOOKMARK_IS_SAVED' as const,
  BOOKMARK_REMOVE: 'BOOKMARK_REMOVE' as const,
  BOOKMARK_GET_ALL: 'BOOKMARK_GET_ALL' as const,
  HISTORY_ADD: 'HISTORY_ADD' as const,
  HISTORY_GET_RECENT: 'HISTORY_GET_RECENT' as const,
  HISTORY_CLEAR: 'HISTORY_CLEAR' as const,
  SETTINGS_GET: 'SETTINGS_GET' as const,
  SETTINGS_SET: 'SETTINGS_SET' as const,
  EXCLUSION_CHECK: 'EXCLUSION_CHECK' as const,
  EXCLUSION_ADD: 'EXCLUSION_ADD' as const,
  EXCLUSION_REMOVE: 'EXCLUSION_REMOVE' as const,
  EXCLUSION_GET_ALL: 'EXCLUSION_GET_ALL' as const,
  EXPORT_SAVED: 'EXPORT_SAVED' as const,
  IMPORT_SAVED: 'IMPORT_SAVED' as const,
  SAVED_CLEAR: 'SAVED_CLEAR' as const,
  CONTENT_INIT: 'CONTENT_INIT' as const,
  PRONUNCIATION_SPEAK: 'PRONUNCIATION_SPEAK' as const,
} as const;

export const STORAGE_KEYS = {
  SETTINGS: 'etyr_settings',
  EXCLUDED_SITES: 'etyr_excluded_sites',
  SAVED_WORDS: 'etyr_saved_words',
  LOOKUP_HISTORY: 'etyr_lookup_history',
  DICTIONARY_CACHE: 'etyr_dictionary_cache',
} as const;

export const PUNCTUATION_REGEX = /^[^\w]+$/;
export const URL_REGEX = /^(https?:\/\/|www\.)/i;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const CODE_BLOCK_INDICATORS = /[{}`;=<>]/;
