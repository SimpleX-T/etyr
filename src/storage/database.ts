import { getBrowserAPI, type BrowserStorageArea } from '../browser/types';

const storage: BrowserStorageArea = getBrowserAPI().storage.local;

export interface StorageSchema {
  etyr_settings: import('../shared/types').Settings;
  etyr_excluded_sites: string[];
  etyr_saved_words: import('../shared/types').SavedWord[];
  etyr_lookup_history: import('../shared/types').HistoryEntry[];
  etyr_dictionary_cache: Record<string, import('../dictionary/types').CacheEntry>;
  etyr_stats: import('../shared/types').Stats;
}

export async function getStorageItem<K extends keyof StorageSchema>(
  key: K
): Promise<StorageSchema[K] | undefined> {
  const result = await storage.get(key);
  return result[key] as StorageSchema[K] | undefined;
}

export async function setStorageItem<K extends keyof StorageSchema>(
  key: K,
  value: StorageSchema[K]
): Promise<void> {
  await storage.set({ [key]: value });
}

export async function removeStorageItem<K extends keyof StorageSchema>(
  key: K
): Promise<void> {
  await storage.remove(key);
}

export async function getAllStorage(): Promise<Partial<StorageSchema>> {
  return storage.get([
    'etyr_settings',
    'etyr_excluded_sites',
    'etyr_saved_words',
    'etyr_lookup_history',
    'etyr_dictionary_cache',
    'etyr_stats',
  ]) as Promise<Partial<StorageSchema>>;
}
