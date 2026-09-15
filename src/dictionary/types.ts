import type { DictionaryResult, Meaning, Definition, PartOfSpeech } from '../shared/types';

export interface OfflineWordEntry {
  word: string;
  phonetic?: string;
  audioUrl?: string;
  meanings: Meaning[];
}

export interface OnlineDictionaryResponse {
  word: string;
  phonetic?: string;
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings?: Array<{
    partOfSpeech?: string;
    definitions?: Array<{
      definition?: string;
      example?: string;
      synonyms?: string[];
      antonyms?: string[];
    }>;
    synonyms?: string[];
    antonyms?: string[];
  }>;
  sourceUrls?: string[];
  license?: { name: string; url: string };
}

export interface CacheEntry {
  result: DictionaryResult;
  timestamp: number;
  ttl: number;
}

export interface DictionaryProvider {
  lookup(query: string, signal?: AbortSignal): Promise<DictionaryResult | null>;
}

export function normalizePartOfSpeech(pos: string): PartOfSpeech {
  const normalized = pos.toLowerCase().trim();
  const validPos: Record<string, PartOfSpeech> = {
    noun: 'noun',
    verb: 'verb',
    adjective: 'adjective',
    adverb: 'adverb',
    pronoun: 'pronoun',
    preposition: 'preposition',
    conjunction: 'conjunction',
    interjection: 'interjection',
    phrase: 'phrase',
  };
  return validPos[normalized] || 'unknown';
}

export function normalizeOnlineResponse(
  raw: OnlineDictionaryResponse,
  query: string,
  source: 'online' | 'cache'
): DictionaryResult {
  const meanings: Meaning[] = (raw.meanings || []).map(m => ({
    partOfSpeech: normalizePartOfSpeech(m.partOfSpeech || 'unknown'),
    definitions: (m.definitions || []).map(d => ({
      definition: d.definition || '',
      example: d.example,
      synonyms: d.synonyms,
      antonyms: d.antonyms,
    })) as Definition[],
  })) as Meaning[];

  let audioUrl: string | undefined;
  let phonetic = raw.phonetic;

  if (raw.phonetics) {
    for (const p of raw.phonetics) {
      if (p.audio) {
        audioUrl = p.audio;
        break;
      }
      if (p.text && !phonetic) {
        phonetic = p.text;
      }
    }
  }

  return {
    query,
    word: raw.word || query,
    phonetic,
    audioUrl,
    source,
    meanings,
    timestamp: Date.now(),
  };
}
