import { describe, it, expect } from 'vitest';
import { formatQuote, formatDefinition, formatMeaningGroup, formatResultForCopy } from '../src/shared/utils/format';
import type { DictionaryResult, Meaning } from '../src/shared/types';

const quote = { text: 'All that glitters is not gold.', reference: 'The Merchant of Venice' };

describe('formatQuote', () => {
  it('includes the citation when present', () => {
    expect(formatQuote(quote)).toBe('"All that glitters is not gold." — The Merchant of Venice');
  });

  it('omits the citation when absent', () => {
    expect(formatQuote({ text: 'Hello.' })).toBe('"Hello."');
  });
});

describe('formatDefinition', () => {
  const def = {
    definition: 'Plural form of decade.',
    tags: ['plural', 'form of'],
    examples: ['The 1890s were two decades long.'],
    quotes: [quote],
    subsenses: [{ definition: 'A tenth of a century.' }],
  };

  it('renders definition, tags, examples, quote with citation, and subsenses', () => {
    const out = formatDefinition(def);
    expect(out).toContain('• Plural form of decade.');
    expect(out).toContain('Tags: plural, form of');
    expect(out).toContain('Examples: "The 1890s were two decades long."');
    expect(out).toContain('Quote: "All that glitters is not gold." — The Merchant of Venice');
    expect(out).toContain('· A tenth of a century.');
  });

  it('honors explicit numbering and depth', () => {
    const out = formatDefinition({ definition: 'One.' }, '2.', 1);
    expect(out).toBe('  2. One.');
  });
});

describe('formatMeaningGroup', () => {
  const meaning: Meaning = {
    partOfSpeech: 'noun',
    forms: [{ word: 'decades', tags: ['plural'] }],
    synonyms: ['ticks'],
    antonyms: ['shorts'],
    definitions: [
      { definition: 'A period of ten years.', synonyms: ['decennium'], examples: ['A decade passed.'] },
    ],
  };

  it('includes POS, forms, numbered senses, and aggregated synonyms/antonyms', () => {
    const out = formatMeaningGroup(meaning);
    expect(out).toContain('noun — (plural) decades');
    expect(out).toContain('1. A period of ten years.');
    expect(out).toContain('Examples: "A decade passed."');
    expect(out).toContain('Synonyms: ticks, decennium');
    expect(out).toContain('Antonyms: shorts');
  });
});

describe('formatResultForCopy', () => {
  const result: DictionaryResult = {
    word: 'decade',
    phonetic: '/ˈdɛkeɪd/',
    source: 'online',
    meanings: [
      {
        partOfSpeech: 'noun',
        definitions: [{ definition: 'A period of ten years.' }],
      },
    ],
  };

  it('renders word, phonetic, source, and meaning', () => {
    const out = formatResultForCopy(result);
    expect(out).toContain('decade  /ˈdɛkeɪd/');
    expect(out).toContain('online');
    expect(out).toContain('noun');
    expect(out).toContain('1. A period of ten years.');
  });

  it('maps cache/offline sources to their human label', () => {
    const cached = formatResultForCopy({ ...result, source: 'cache' });
    expect(cached).toContain('local');
  });
});