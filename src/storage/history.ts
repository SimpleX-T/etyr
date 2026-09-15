import type { HistoryEntry, DictionaryResult, PartOfSpeech } from '../shared/types';
import { getStorageItem, setStorageItem } from './database';
import { createId } from '../shared/utils';
import { STORAGE_KEYS, HISTORY_LIMIT } from '../shared/constants';

export async function getRecentHistory(limit: number = HISTORY_LIMIT): Promise<HistoryEntry[]> {
  const all = (await getStorageItem(STORAGE_KEYS.LOOKUP_HISTORY)) || [];
  return all.slice(0, limit);
}

export async function addHistoryEntry(
  result: DictionaryResult
): Promise<void> {
  const all = (await getStorageItem(STORAGE_KEYS.LOOKUP_HISTORY)) || [];

  const primaryMeaning = result.meanings[0];
  const entry: HistoryEntry = {
    id: createId(),
    query: result.query,
    word: result.word,
    definition: primaryMeaning?.definitions[0]?.definition,
    partOfSpeech: primaryMeaning?.partOfSpeech as PartOfSpeech | undefined,
    phonetic: result.phonetic,
    timestamp: Date.now(),
    source: result.source,
  };

  const filtered = all.filter(
    h => h.query.toLowerCase() !== result.query.toLowerCase()
  );

  filtered.unshift(entry);

  const trimmed = filtered.slice(0, HISTORY_LIMIT);
  await setStorageItem(STORAGE_KEYS.LOOKUP_HISTORY, trimmed);
}

export async function clearHistory(): Promise<void> {
  await setStorageItem(STORAGE_KEYS.LOOKUP_HISTORY, []);
}
