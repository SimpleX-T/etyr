export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'pronoun'
  | 'preposition'
  | 'conjunction'
  | 'interjection'
  | 'phrase'
  | 'unknown';

export interface LinkedWord {
  query: string;
  label: string;
}

export interface SenseQuote {
  text: string;
  reference?: string;
}

export interface SenseForm {
  word: string;
  tags?: string[];
}

export interface Definition {
  definition: string;
  example?: string;
  examples?: string[];
  synonyms?: string[];
  antonyms?: string[];
  tags?: string[];
  quotes?: SenseQuote[];
  linkedWords?: LinkedWord[];
  subsenses?: Definition[];
}

export interface Meaning {
  partOfSpeech: PartOfSpeech;
  definitions: Definition[];
  forms?: SenseForm[];
  synonyms?: string[];
  antonyms?: string[];
}

export type DictionarySource = 'offline' | 'online' | 'wiktionary' | 'cache' | 'ai';

export interface DictionaryResult {
  query: string;
  word: string;
  phonetic?: string;
  audioUrl?: string;
  source: DictionarySource;
  meanings: Meaning[];
  timestamp: number;
}

export interface SavedWord {
  id: string;
  word: string;
  query: string;
  definition: string;
  phonetic?: string;
  audioUrl?: string;
  partOfSpeech?: PartOfSpeech;
  example?: string;
  source: DictionarySource;
  savedAt: number;
  lastViewedAt?: number;
  tags?: string[];
  context?: string;
  nextReviewDate?: number;
  reviewLevel?: number; // 0 to 5 for SRS
}

export interface HistoryEntry {
  id: string;
  query: string;
  word: string;
  definition?: string;
  partOfSpeech?: PartOfSpeech;
  phonetic?: string;
  timestamp: number;
  source: DictionarySource;
}

export interface Stats {
  streakDays: number;
  lastReviewDate: number;
  wordsReviewedToday: number;
}

export interface Settings {
  autoLookup: boolean;
  triggerKey: 'none' | 'alt' | 'ctrl' | 'shift' | 'meta';
  doubleClickLookup: boolean;
  doubleClickInstantly: boolean;
  lookupDelayMs: number;
  enablePronunciation: boolean;
  enableHistory: boolean;
  theme: 'system' | 'dark' | 'light';
  aiProvider: 'none' | 'gemini' | 'huggingface';
  aiApiKey: string;
  aiModel: string;
  autoPlayPronunciation: boolean;
  enableNewTab: boolean;
}

export interface ExclusionEntry {
  id: string;
  domain: string;
  createdAt: number;
}

export type DictionaryProvider = {
  lookup(query: string, signal?: AbortSignal): Promise<DictionaryResult>;
};

export type MessageAction =
  | 'DICTIONARY_RESOLVE'
  | 'BOOKMARK_SAVE'
  | 'BOOKMARK_IS_SAVED'
  | 'BOOKMARK_REMOVE'
  | 'BOOKMARK_GET_ALL'
  | 'HISTORY_ADD'
  | 'HISTORY_GET_RECENT'
  | 'HISTORY_CLEAR'
  | 'SETTINGS_GET'
  | 'SETTINGS_SET'
  | 'EXCLUSION_CHECK'
  | 'EXCLUSION_ADD'
  | 'EXCLUSION_REMOVE'
  | 'EXCLUSION_GET_ALL'
  | 'EXPORT_SAVED'
  | 'IMPORT_SAVED'
  | 'SAVED_CLEAR'
  | 'CONTENT_INIT'
  | 'PRONUNCIATION_SPEAK'
  | 'STATS_GET'
  | 'STATS_RECORD_REVIEW'
  | 'SIDEPANEL_OPEN'
  | 'SIDEPANEL_LOAD';

export interface MessageRequest {
  action: MessageAction;
  payload?: unknown;
  requestId?: string;
}

export interface MessageResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface SelectionSnapshot {
  text: string;
  rect: DOMRect;
  range: Range;
  timestamp: number;
  requestId: string;
  context?: string;
}

export type TooltipState =
  | 'idle'
  | 'waiting'
  | 'resolving'
  | 'showing'
  | 'loading'
  | 'error'
  | 'not-found'
  | 'paused'
  | 'dismissed';
