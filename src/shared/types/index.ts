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

export interface Definition {
  definition: string;
  example?: string;
  synonyms?: string[];
  antonyms?: string[];
}

export interface Meaning {
  partOfSpeech: PartOfSpeech;
  definitions: Definition[];
}

export type DictionarySource = 'offline' | 'online' | 'wiktionary' | 'cache';

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

export interface Settings {
  autoLookup: boolean;
  triggerKey: 'none' | 'alt' | 'ctrl' | 'shift' | 'meta';
  doubleClickLookup: boolean;
  lookupDelayMs: number;
  enablePronunciation: boolean;
  enableHistory: boolean;
  theme: 'system' | 'dark' | 'light';
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
  | 'PRONUNCIATION_SPEAK';

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
