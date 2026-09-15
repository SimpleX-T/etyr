import type { DictionaryResult, Meaning, Definition, PartOfSpeech } from '../shared/types';

export interface OfflineWordEntry {
  word: string;
  phonetic?: string;
  audioUrl?: string;
  meanings: Meaning[];
}

export interface OnlineDictionaryResponse {
  word: string;
  entries?: Array<{
    partOfSpeech?: string;
    pronunciations?: Array<{ type?: string; text?: string; audio?: string }>;
    senses?: Array<{
      definition?: string;
      examples?: string[];
      synonyms?: string[];
      antonyms?: string[];
    }>;
  }>;
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
  const meanings: Meaning[] = (raw.entries || []).map(entry => ({
    partOfSpeech: normalizePartOfSpeech(entry.partOfSpeech || 'unknown'),
    definitions: (entry.senses || []).map(sense => ({
      definition: sense.definition || '',
      example: sense.examples && sense.examples.length > 0 ? sense.examples[0] : undefined,
      synonyms: sense.synonyms,
      antonyms: sense.antonyms,
    })) as Definition[],
  })) as Meaning[];

  let audioUrl: string | undefined;
  let phonetic: string | undefined;

  if (raw.entries) {
    for (const entry of raw.entries) {
      if (entry.pronunciations) {
        for (const p of entry.pronunciations) {
          if (p.audio && !audioUrl) {
            audioUrl = p.audio;
          }
          if (p.text && !phonetic) {
            phonetic = p.text;
          }
        }
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
