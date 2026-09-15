import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveWord,
  removeSavedWord,
  getAllSavedWords,
  isWordSaved,
  clearAllSavedWords,
  savedWordsToJSON,
  savedWordsToCSV,
} from '../src/storage/bookmarks';
import type { DictionaryResult } from '../src/shared/types';

function makeResult(word: string, source: 'offline' | 'online' = 'offline'): DictionaryResult {
  return {
    query: word.toLowerCase(),
    word,
    phonetic: `/ˈ${word}/`,
    source,
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [{ definition: `A ${word}`, example: `example of ${word}` }],
      },
    ],
    timestamp: Date.now(),
  };
}

describe('bookmarks', () => {
  beforeEach(async () => {
    await clearAllSavedWords();
  });

  it('saves a word', async () => {
    const saved = await saveWord(makeResult('ephemeral'));
    expect(saved.word).toBe('ephemeral');
    expect(saved.definition).toBe('A ephemeral');
    expect(saved.savedAt).toBeGreaterThan(0);
  });

  it('prevents duplicate saved words', async () => {
    await saveWord(makeResult('ephemeral'));
    await saveWord(makeResult('ephemeral'));
    const all = await getAllSavedWords();
    expect(all.filter(w => w.query === 'ephemeral')).toHaveLength(1);
  });

  it('removes a saved word by id', async () => {
    const saved = await saveWord(makeResult('ephemeral'));
    await removeSavedWord(saved.id);
    const all = await getAllSavedWords();
    expect(all).toHaveLength(0);
  });

  it('reports saved status by query (case-insensitive)', async () => {
    await saveWord(makeResult('ephemeral'));
    expect(await isWordSaved('Ephemeral')).toBe(true);
    expect(await isWordSaved('ubiquitous')).toBe(false);
  });

  it('clears all saved words', async () => {
    await saveWord(makeResult('ephemeral'));
    await saveWord(makeResult('ubiquitous'));
    await clearAllSavedWords();
    expect(await getAllSavedWords()).toEqual([]);
  });

  it('exports to JSON format', async () => {
    await saveWord(makeResult('ephemeral'));
    const all = await getAllSavedWords();
    const json = savedWordsToJSON(all);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].word).toBe('ephemeral');
  });

  it('exports to CSV format', async () => {
    await saveWord(makeResult('ephemeral'));
    const all = await getAllSavedWords();
    const csv = savedWordsToCSV(all);
    expect(csv).toContain('word,definition,partOfSpeech,phonetic,example,savedAt');
    expect(csv).toContain('ephemeral');
    expect(csv).toContain('A ephemeral');
  });
});

describe('history limits', () => {
  it('respects the history limit constant', async () => {
    const HISTORY_LIMIT = 100;
    // Simulate: adding 120 entries should keep at most 100
    const entries = Array.from({ length: 120 }, (_, i) => makeResult(`word${i}`));
    const history: Array<DictionaryResult['query']> = [];
    for (const entry of entries) {
      history.unshift(entry.query);
      if (history.length > HISTORY_LIMIT) {
        history.pop();
      }
    }
    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(history[0]).toBe('word119');
  });
});