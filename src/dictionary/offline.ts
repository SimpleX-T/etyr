import type { DictionaryResult, Meaning } from '../shared/types';
import type { OfflineWordEntry, DictionaryProvider } from './types';
import { normalizeQuery } from '../shared/utils';
import { offlineWords } from './data/offline-words';

const wordMap = new Map<string, OfflineWordEntry>();

for (const entry of offlineWords) {
  wordMap.set(entry.word.toLowerCase(), entry);
}

export class OfflineDictionaryProvider implements DictionaryProvider {
  async lookup(query: string): Promise<DictionaryResult | null> {
    const normalized = normalizeQuery(query);
    if (!normalized) return null;

    const entry = wordMap.get(normalized);
    if (entry) {
      return this.buildResult(normalized, entry);
    }

    return null;
  }

  private buildResult(query: string, entry: OfflineWordEntry): DictionaryResult {
    const meanings: Meaning[] = entry.meanings.map(m => ({
      partOfSpeech: m.partOfSpeech,
      definitions: m.definitions.map(d => ({
        definition: d.definition,
        example: d.example,
        synonyms: d.synonyms,
        antonyms: d.antonyms,
      })),
    }));

    return {
      query,
      word: entry.word,
      phonetic: entry.phonetic,
      audioUrl: entry.audioUrl,
      source: 'offline',
      meanings,
      timestamp: Date.now(),
    };
  }
}
