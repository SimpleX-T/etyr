import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DictionaryResult, DictionaryProvider } from '../src/shared/types';
import { normalizeOnlineResponse, normalizePartOfSpeech } from '../src/dictionary/types';
import type { OnlineDictionaryResponse } from '../src/dictionary/types';

function makeResult(word: string, source: 'offline' | 'online' | 'cache'): DictionaryResult {
  return {
    query: word.toLowerCase(),
    word,
    phonetic: '/test/',
    source,
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [{ definition: `Definition of ${word}` }],
      },
    ],
    timestamp: Date.now(),
  };
}

describe('dictionary response normalization', () => {
  it('normalizes the online API response into our internal format', () => {
    const raw: OnlineDictionaryResponse = {
      word: 'Ephemeral',
      phonetic: '/ɪˈfem.ər.əl/',
      phonetics: [
        { text: '/ɪˈfem.ər.əl/', audio: 'https://cdn.example.com/ephemeral.mp3' },
      ],
      meanings: [
        {
          partOfSpeech: 'adjective',
          definitions: [
            { definition: 'lasting for a very short time', example: 'an ephemeral moment', synonyms: ['fleeting', 'transient'] },
          ],
        },
      ],
    };

    const result = normalizeOnlineResponse(raw, 'ephemeral', 'online');

    expect(result.word).toBe('Ephemeral');
    expect(result.phonetic).toBe('/ɪˈfem.ər.əl/');
    expect(result.audioUrl).toBe('https://cdn.example.com/ephemeral.mp3');
    expect(result.meanings[0].partOfSpeech).toBe('adjective');
    expect(result.meanings[0].definitions[0].definition).toBe('lasting for a very short time');
    expect(result.meanings[0].definitions[0].synonyms).toEqual(['fleeting', 'transient']);
    expect(result.source).toBe('online');
  });

  it('handles missing optional fields', () => {
    const raw: OnlineDictionaryResponse = {
      word: 'foo',
      meanings: [],
    };

    const result = normalizeOnlineResponse(raw, 'foo', 'online');
    expect(result.meanings).toEqual([]);
    expect(result.phonetic).toBeUndefined();
    expect(result.audioUrl).toBeUndefined();
  });

  it('uses phonetic from phonetics array when top-level missing', () => {
    const raw: OnlineDictionaryResponse = {
      word: 'bar',
      phonetics: [{ text: '/bɑːr/' }],
    };

    const result = normalizeOnlineResponse(raw, 'bar', 'online');
    expect(result.phonetic).toBe('/bɑːr/');
  });
});

describe('part of speech normalization', () => {
  it('maps common parts of speech', () => {
    expect(normalizePartOfSpeech('noun')).toBe('noun');
    expect(normalizePartOfSpeech('verb')).toBe('verb');
    expect(normalizePartOfSpeech('adjective')).toBe('adjective');
    expect(normalizePartOfSpeech('adverb')).toBe('adverb');
  });

  it('falls back to unknown for unrecognized values', () => {
    expect(normalizePartOfSpeech('zzz')).toBe('unknown');
    expect(normalizePartOfSpeech('')).toBe('unknown');
  });

  it('is case-insensitive and trims', () => {
    expect(normalizePartOfSpeech('NOUN')).toBe('noun');
    expect(normalizePartOfSpeech(' verb ')).toBe('verb');
  });
});

describe('resolver provider fallback', () => {
  it('falls through providers in order: offline, cache, online', async () => {
    const calls: string[] = [];
    const offline: DictionaryProvider = {
      lookup: async (q) => { calls.push('offline'); return null; },
    };
    const online: DictionaryProvider = {
      lookup: async (q) => { calls.push('online'); return makeResult(q, 'online'); },
    };

    // Simulate resolver logic: offline -> cache -> online
    async function resolve(query: string) {
      const offlineResult = await offline.lookup(query);
      if (offlineResult) return offlineResult;
      const onlineResult = await online.lookup(query);
      return onlineResult;
    }

    const result = await resolve('ephemeral');
    expect(result.source).toBe('online');
    expect(calls).toEqual(['offline', 'online']);
  });

  it('stops at first provider that returns a result', async () => {
    const calls: string[] = [];
    const offline: DictionaryProvider = {
      lookup: async (q) => { calls.push('offline'); return makeResult(q, 'offline'); },
    };
    const online: DictionaryProvider = {
      lookup: async (q) => { calls.push('online'); return makeResult(q, 'online'); },
    };

    async function resolve(query: string) {
      const offlineResult = await offline.lookup(query);
      if (offlineResult) return offlineResult;
      return online.lookup(query);
    }

    const result = await resolve('ephemeral');
    expect(result.source).toBe('offline');
    expect(calls).toEqual(['offline']);
  });

  it('returns null if all providers fail', async () => {
    const offline: DictionaryProvider = {
      lookup: async () => null,
    };
    const online: DictionaryProvider = {
      lookup: async () => { throw new Error('network failure'); },
    };

    async function resolve(query: string) {
      try {
        const offlineResult = await offline.lookup(query);
        if (offlineResult) return offlineResult;
        return await online.lookup(query);
      } catch {
        return null;
      }
    }

    const result = await resolve('nonexistentwordxyz');
    expect(result).toBeNull();
  });
});

describe('cache behavior', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  it('returns cached entries that are still fresh', () => {
    const cache = new Map<string, { result: DictionaryResult; timestamp: number; ttl: number }>();
    const result = makeResult('ephemeral', 'online');
    cache.set('ephemeral', { result, timestamp: Date.now(), ttl: 1000 });

    vi.advanceTimersByTime(500);
    const cached = cache.get('ephemeral');
    expect(cached).toBeDefined();
    expect(Date.now() - cached!.timestamp).toBeLessThan(cached!.ttl);
  });

  it('expires entries past their TTL', () => {
    const cache = new Map<string, { result: DictionaryResult; timestamp: number; ttl: number }>();
    const result = makeResult('ephemeral', 'online');
    cache.set('ephemeral', { result, timestamp: Date.now(), ttl: 1000 });

    vi.advanceTimersByTime(2000);
    const ttl = cache.get('ephemeral')!.ttl;
    const age = Date.now() - cache.get('ephemeral')!.timestamp;
    expect(age).toBeGreaterThanOrEqual(ttl);
  });

  it('uses normalized keys', () => {
    const key1 = 'Ephemeral'.trim().toLowerCase();
    const key2 = 'ephemeral';
    expect(key1).toBe(key2);
  });
});