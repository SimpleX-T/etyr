import type { DictionaryResult } from '../shared/types';
import type { CacheEntry } from './types';
import { getStorageItem, setStorageItem } from '../storage/database';
import { CACHE_TTL_MS, STORAGE_KEYS } from '../shared/constants';

function normalizeKey(key: string): string {
  return key.toLowerCase().trim();
}

export class DictionaryCache {
  private memory = new Map<string, CacheEntry>();
  private loaded = false;

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    const stored = (await getStorageItem(STORAGE_KEYS.DICTIONARY_CACHE)) as
      | Record<string, CacheEntry>
      | undefined;
    if (stored) {
      for (const [key, entry] of Object.entries(stored)) {
        if (
          entry &&
          typeof entry === 'object' &&
          typeof entry.timestamp === 'number' &&
          typeof entry.ttl === 'number' &&
          entry.result &&
          typeof entry.result === 'object'
        ) {
          this.memory.set(key, entry);
        }
      }
    }
    this.loaded = true;
  }

  async get(key: string): Promise<DictionaryResult | null> {
    await this.ensureLoaded();

    const normalized = normalizeKey(key);
    const entry = this.memory.get(normalized);

    if (!entry) return null;

    const elapsed = Date.now() - entry.timestamp;
    if (elapsed > entry.ttl) {
      this.memory.delete(normalized);
      return null;
    }

    return entry.result;
  }

  async set(key: string, result: DictionaryResult, ttl: number = CACHE_TTL_MS): Promise<void> {
    await this.ensureLoaded();

    const normalized = normalizeKey(key);
    const entry: CacheEntry = {
      result,
      timestamp: Date.now(),
      ttl,
    };

    this.memory.set(normalized, entry);
    await this.persist();
  }

  async delete(key: string): Promise<void> {
    await this.ensureLoaded();

    const normalized = normalizeKey(key);
    this.memory.delete(normalized);
    await this.persist();
  }

  async clear(): Promise<void> {
    this.memory.clear();
    await setStorageItem(STORAGE_KEYS.DICTIONARY_CACHE, {});
  }

  private async persist(): Promise<void> {
    const serialized: Record<string, CacheEntry> = {};
    for (const [key, entry] of this.memory) {
      serialized[key] = entry;
    }
    await setStorageItem(STORAGE_KEYS.DICTIONARY_CACHE, serialized);
  }
}