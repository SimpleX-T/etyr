import type { DictionaryResult, Meaning, Definition, PartOfSpeech } from '../shared/types';
import type { DictionaryProvider, OnlineDictionaryResponse } from './types';
import { normalizeOnlineResponse } from './types';
import { stripHtmlToText } from '../shared/utils';
import { DICTIONARY_TIMEOUT_MS, DICTIONARY_API_BASE } from '../shared/constants';

export class OnlineDictionaryError extends Error {
  code: string;
  status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = 'OnlineDictionaryError';
    this.code = code;
    this.status = status;
  }
}

/* ------------------------------------------------------------------ */
/*  Fetch helper with timeout + abort propagation                      */
/* ------------------------------------------------------------------ */

async function fetchWithTimeout(
  url: string,
  signal?: AbortSignal,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DICTIONARY_TIMEOUT_MS);

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      if (controller.signal.aborted && !signal?.aborted) {
        throw new OnlineDictionaryError('TIMEOUT', 'Dictionary request timed out');
      }
      throw new OnlineDictionaryError('ABORTED', 'Request was cancelled');
    }
    if (err instanceof TypeError) {
      throw new OnlineDictionaryError('NETWORK_ERROR', 'Network request failed');
    }
    throw new OnlineDictionaryError('UNKNOWN_ERROR', (err as Error).message || 'Unknown error');
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizePartOfSpeech(pos: string): PartOfSpeech {
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
    numeral: 'phrase',
  };
  return validPos[normalized] || 'unknown';
}

function cleanDefinition(text: string): string {
  return stripHtmlToText(text);
}

function cleanExample(text: string): string {
  return stripHtmlToText(text);
}

/* ------------------------------------------------------------------ */
/*  Wiktionary REST provider (primary)                                 */
/* ------------------------------------------------------------------ */

interface WiktionaryDefinition {
  definition: string;
  parsedExamples?: Array<{ example?: string }>;
}

interface WiktionaryEntry {
  partOfSpeech?: string;
  language?: string;
  definitions?: WiktionaryDefinition[];
}

type WiktionaryResponse = Record<string, WiktionaryEntry[]>;

const WIKTIONARY_API = 'https://en.wiktionary.org/api/rest_v1/page/definition';

function mapWiktionary(
  data: WiktionaryResponse,
  query: string,
): DictionaryResult {
  const meanings: Meaning[] = [];

  const groups = data.en ?? data['en-us'];
  if (!Array.isArray(groups)) {
    throw new OnlineDictionaryError('MALFORMED_RESPONSE', 'Malformed Wiktionary response');
  }

  for (const entry of groups) {
    if (!entry || typeof entry !== 'object') continue;
    const pos = entry.partOfSpeech || 'unknown';
    const defs = Array.isArray(entry.definitions) ? entry.definitions : [];
    if (defs.length === 0) continue;

    const definitions: Definition[] = defs.map((drop) => ({
      definition: cleanDefinition(drop.definition),
      example: (Array.isArray(drop.parsedExamples) && drop.parsedExamples[0]?.example)
        ? cleanExample(drop.parsedExamples[0].example)
        : undefined,
      synonyms: undefined,
      antonyms: undefined,
    }));

    meanings.push({
      partOfSpeech: normalizePartOfSpeech(pos),
      definitions,
    });
  }

  if (meanings.length === 0) {
    throw new OnlineDictionaryError('NOT_FOUND', `No results for "${query}"`, 404);
  }

  return {
    query,
    word: query,
    phonetic: undefined,
    audioUrl: undefined,
    source: 'wiktionary',
    meanings,
    timestamp: Date.now(),
  };
}

/* ------------------------------------------------------------------ */
/*  Free Dictionary API provider (fallback)                            */
/* ------------------------------------------------------------------ */

async function lookupFreeDictionary(
  query: string,
  signal?: AbortSignal,
): Promise<DictionaryResult> {
  const url = `${DICTIONARY_API_BASE}/${encodeURIComponent(query)}`;
  const response = await fetchWithTimeout(url, signal, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new OnlineDictionaryError('NOT_FOUND', `No results for "${query}"`, 404);
    }
    throw new OnlineDictionaryError(
      'API_ERROR',
      `Dictionary API returned ${response.status}`,
      response.status,
    );
  }

  const data: OnlineDictionaryResponse[] = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new OnlineDictionaryError('EMPTY_RESPONSE', 'Empty response from dictionary API');
  }

  const first = data[0];
  if (!first || typeof first !== 'object') {
    throw new OnlineDictionaryError('MALFORMED_RESPONSE', 'Malformed response from dictionary API');
  }

  return normalizeOnlineResponse(first, query, 'online');
}

/* ------------------------------------------------------------------ */
/*  Composite provider: Wiktionary primary, Free Dictionary fallback   */
/* ------------------------------------------------------------------ */

export class OnlineDictionaryProvider implements DictionaryProvider {
  async lookup(query: string, signal?: AbortSignal): Promise<DictionaryResult> {
    const normalized = query.toLowerCase().trim();
    if (!normalized) {
      throw new OnlineDictionaryError('EMPTY_QUERY', 'Empty query');
    }

    const url = `${WIKTIONARY_API}/${encodeURIComponent(normalized)}`;

    try {
      const response = await fetchWithTimeout(url, signal, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        if (response.status === 404) throw new OnlineDictionaryError('NOT_FOUND', `No results for "${normalized}"`, 404);
        throw new OnlineDictionaryError('API_ERROR', `Wiktionary returned ${response.status}`, response.status);
      }

      const data: WiktionaryResponse = await response.json();
      if (!data || typeof data !== 'object') {
        throw new OnlineDictionaryError('MALFORMED_RESPONSE', 'Malformed Wiktionary response');
      }

      return mapWiktionary(data, normalized);
    } catch (err) {
      // A definitive "not found" from Wiktionary means the word genuinely
      // isn't in the dictionary — 404 status is authoritative.
      if (err instanceof OnlineDictionaryError && err.code === 'NOT_FOUND') {
        // Try the fallback provider for words Wiktionary doesn't cover.
        try {
          return await lookupFreeDictionary(normalized, signal);
        } catch (fallbackErr) {
          if (fallbackErr instanceof OnlineDictionaryError && fallbackErr.code === 'NOT_FOUND') {
            throw new OnlineDictionaryError('NOT_FOUND', `No results for "${normalized}"`, 404);
          }
          throw err;
        }
      }
      throw err;
    }
  }
}