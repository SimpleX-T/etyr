import type { SavedWord, DictionaryResult, PartOfSpeech } from '../shared/types';
import { getStorageItem, setStorageItem } from './database';
import { createId } from '../shared/utils';
import { STORAGE_KEYS } from '../shared/constants';

export async function getAllSavedWords(): Promise<SavedWord[]> {
  return (await getStorageItem(STORAGE_KEYS.SAVED_WORDS)) || [];
}

export async function isWordSaved(query: string): Promise<boolean> {
  const words = await getAllSavedWords();
  return words.some(w => w.query.toLowerCase() === query.toLowerCase());
}

export async function getSavedWordId(query: string): Promise<string | undefined> {
  const words = await getAllSavedWords();
  const found = words.find(w => w.query.toLowerCase() === query.toLowerCase());
  return found?.id;
}

export async function saveWord(result: DictionaryResult, context?: string): Promise<SavedWord> {
  const words = await getAllSavedWords();
  const existingIndex = words.findIndex(
    w => w.query.toLowerCase() === result.query.toLowerCase()
  );

  const primaryMeaning = result.meanings[0];
  const primaryDefinition = primaryMeaning?.definitions[0]?.definition || '';
  const partOfSpeech = primaryMeaning?.partOfSpeech as PartOfSpeech | undefined;
  const example = primaryMeaning?.definitions[0]?.example;

  const savedWord: SavedWord = {
    id: existingIndex >= 0 ? words[existingIndex].id : createId(),
    word: result.word,
    query: result.query,
    definition: primaryDefinition,
    phonetic: result.phonetic,
    audioUrl: result.audioUrl,
    partOfSpeech,
    example,
    source: result.source,
    savedAt: existingIndex >= 0 ? words[existingIndex].savedAt : Date.now(),
    lastViewedAt: Date.now(),
    context: context || (existingIndex >= 0 ? words[existingIndex].context : undefined),
    nextReviewDate: existingIndex >= 0 ? words[existingIndex].nextReviewDate : Date.now(),
    reviewLevel: existingIndex >= 0 ? words[existingIndex].reviewLevel : 0,
  };

  if (existingIndex >= 0) {
    words[existingIndex] = savedWord;
  } else {
    words.unshift(savedWord);
  }

  await setStorageItem(STORAGE_KEYS.SAVED_WORDS, words);
  return savedWord;
}

export async function removeSavedWord(id: string): Promise<void> {
  const words = await getAllSavedWords();
  const filtered = words.filter(w => w.id !== id);
  await setStorageItem(STORAGE_KEYS.SAVED_WORDS, filtered);
}

export async function clearAllSavedWords(): Promise<void> {
  await setStorageItem(STORAGE_KEYS.SAVED_WORDS, []);
}

export async function updateLastViewed(id: string): Promise<void> {
  const words = await getAllSavedWords();
  const word = words.find(w => w.id === id);
  if (word) {
    word.lastViewedAt = Date.now();
    await setStorageItem(STORAGE_KEYS.SAVED_WORDS, words);
  }
}

export async function getDueWords(): Promise<SavedWord[]> {
  const words = await getAllSavedWords();
  const now = Date.now();
  return words.filter(w => (w.nextReviewDate || 0) <= now).sort((a, b) => (a.nextReviewDate || 0) - (b.nextReviewDate || 0));
}

export async function updateWordSrs(id: string, reviewLevel: number, nextReviewDate: number): Promise<void> {
  const words = await getAllSavedWords();
  const word = words.find(w => w.id === id);
  if (word) {
    word.reviewLevel = reviewLevel;
    word.nextReviewDate = nextReviewDate;
    await setStorageItem(STORAGE_KEYS.SAVED_WORDS, words);
  }
}

export function savedWordsToJSON(words: SavedWord[]): string {
  return JSON.stringify(words, null, 2);
}

export function savedWordsToCSV(words: SavedWord[]): string {
  const headers = ['word', 'definition', 'partOfSpeech', 'phonetic', 'example', 'savedAt'];
  const rows = words.map(w => [
    w.word,
    `"${w.definition.replace(/"/g, '""')}"`,
    w.partOfSpeech || '',
    w.phonetic || '',
    w.example ? `"${w.example.replace(/"/g, '""')}"` : '',
    new Date(w.savedAt).toISOString(),
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function parseImportedWords(data: unknown): SavedWord[] {
  if (!Array.isArray(data)) {
    throw new Error('Invalid import format: expected array');
  }

  return data.map((item: Record<string, unknown>) => ({
    id: typeof item.id === 'string' ? item.id : createId(),
    word: typeof item.word === 'string' ? item.word : '',
    query: typeof item.query === 'string' ? item.query : typeof item.word === 'string' ? item.word : '',
    definition: typeof item.definition === 'string' ? item.definition : '',
    phonetic: typeof item.phonetic === 'string' ? item.phonetic : undefined,
    audioUrl: typeof item.audioUrl === 'string' ? item.audioUrl : undefined,
    partOfSpeech: typeof item.partOfSpeech === 'string' ? item.partOfSpeech : undefined,
    example: typeof item.example === 'string' ? item.example : undefined,
    source: (item.source as 'offline' | 'online') || 'offline',
    savedAt: typeof item.savedAt === 'number' ? item.savedAt : Date.now(),
    lastViewedAt: typeof item.lastViewedAt === 'number' ? item.lastViewedAt : undefined,
  })) as SavedWord[];
}
