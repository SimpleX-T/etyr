import type { DictionaryResult, Meaning, Definition, PartOfSpeech, LinkedWord, SenseForm, SenseQuote } from '../shared/types';

export interface OfflineWordEntry {
  word: string;
  phonetic?: string;
  audioUrl?: string;
  meanings: Meaning[];
}

export interface OnlineSense {
  definition?: string;
  examples?: string[];
  synonyms?: string[];
  antonyms?: string[];
  tags?: string[];
  quotes?: Array<{ text?: string; reference?: string }>;
  subsenses?: OnlineSense[];
}

export interface OnlineDictionaryResponse {
  word: string;
  entries?: Array<{
    partOfSpeech?: string;
    pronunciations?: Array<{ type?: string; text?: string; audio?: string }>;
    forms?: Array<{ word?: string; tags?: string[] }>;
    synonyms?: string[];
    antonyms?: string[];
    senses?: OnlineSense[];
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

/* ------------------------------------------------------------------ */
/*  Interactive words: extract cross-reference targets ("form of X")    */
/* ------------------------------------------------------------------ */

const FORM_OF_LEADS = [
  'plural',
  'singular',
  'present',
  'past',
  'gerund',
  'participle',
  'comparative',
  'superlative',
  'diminutive',
  'augmentative',
  'feminine',
  'masculine',
  'neuter',
  'variant',
  'alternative',
  'anagram',
  'related',
  'derived',
  'inflection',
  'declension',
  'verbal',
];

const FORM_OF_IDIOM = /^.*?\bof\s+([A-Za-z][A-Za-z'’-]*(?:\s+[A-Za-z][A-Za-z'’-]*){0,3})[.!?,;:)\]]*$/i;

/**
 * Identify "form of" senses (e.g. "plural of decade.", "present participle
 * and gerund of go") and return the base word that should become an
 * interactive cross-reference. Returns null when the sense is not a
 * form-of definition or the target looks unreliable.
 */
export function extractFormOfTarget(definition: string, tags: string[] = []): string | null {
  const trimmed = definition.trim();
  if (!trimmed) return null;

  const hasFormOfTag = tags.some(tag => tag.trim().toLowerCase() === 'form of');
  if (!hasFormOfTag) {
    const firstWord = trimmed.toLowerCase().split(/\s+/, 1)[0];
    if (!firstWord || !FORM_OF_LEADS.includes(firstWord)) return null;
  }

  const match = FORM_OF_IDIOM.exec(trimmed);
  if (!match) return null;

  const target = match[1].trim();
  if (!target || target.length > 28) return null;

  const lc = target.toLowerCase();
  const words = trimmed.toLowerCase().split(/\s+/);
  if (words.length > 0 && lc === words[0]) return null;

  return target;
}

function mapLinkedWords(definition: string, tags: string[] | undefined, query: string): LinkedWord[] | undefined {
  const target = extractFormOfTarget(definition, tags);
  if (!target) return undefined;
  if (target.toLowerCase() === query) return undefined;

  const linked: LinkedWord[] = [{ query: target.toLowerCase(), label: target }];
  return linked;
}

function mapQuotes(quotes: OnlineSense['quotes']): SenseQuote[] | undefined {
  if (!quotes || quotes.length === 0) return undefined;
  const mapped = quotes
    .filter(q => typeof q.text === 'string' && q.text.trim().length > 0)
    .map(q => ({ text: q.text as string, reference: q.reference }));
  return mapped.length > 0 ? mapped : undefined;
}

function mapNonEmpty(value: string[] | undefined): string[] | undefined {
  return value && value.length > 0 ? value : undefined;
}

function mapForms(
  forms: Array<{ word?: string; tags?: string[] }> | undefined,
): SenseForm[] | undefined {
  if (!forms) return undefined;
  const mapped = forms
    .filter(f => typeof f.word === 'string' && f.word.trim().length > 0)
    .map(f => ({ word: f.word as string, tags: mapNonEmpty(f.tags) }));
  return mapped.length > 0 ? mapped : undefined;
}

function mapSense(sense: OnlineSense, query: string, depth: number): Definition {
  const def: Definition = {
    definition: sense.definition || '',
    example: sense.examples && sense.examples.length > 0 ? sense.examples[0] : undefined,
    examples: mapNonEmpty(sense.examples),
    synonyms: mapNonEmpty(sense.synonyms),
    antonyms: mapNonEmpty(sense.antonyms),
    tags: sense.tags && sense.tags.length > 0 ? sense.tags : undefined,
    quotes: mapQuotes(sense.quotes),
    linkedWords: mapLinkedWords(sense.definition || '', sense.tags, query),
  };

  if (depth < 2 && sense.subsenses && sense.subsenses.length > 0) {
    def.subsenses = sense.subsenses.map(sub => mapSense(sub, query, depth + 1));
  } else if (sense.subsenses && sense.subsenses.length > 0) {
    // Very deep nesting: keep the subsense text but stop recursion.
    def.subsenses = sense.subsenses
      .filter(s => typeof s.definition === 'string')
      .map(s => ({ definition: s.definition as string }));
  }

  return def;
}

export function normalizeOnlineResponse(
  raw: OnlineDictionaryResponse,
  query: string,
  source: 'online' | 'cache'
): DictionaryResult {
  const meanings: Meaning[] = (raw.entries || []).map(entry => ({
    partOfSpeech: normalizePartOfSpeech(entry.partOfSpeech || 'unknown'),
    forms: mapForms(entry.forms),
    synonyms: mapNonEmpty(entry.synonyms),
    antonyms: mapNonEmpty(entry.antonyms),
    definitions: (entry.senses || []).map(sense => mapSense(sense, query, 0)) as Definition[],
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
