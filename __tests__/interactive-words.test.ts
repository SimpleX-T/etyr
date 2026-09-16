import { describe, it, expect } from 'vitest';
import { extractFormOfTarget, normalizeOnlineResponse } from '../src/dictionary/types';
import type { OnlineDictionaryResponse } from '../src/dictionary/types';

describe('extractFormOfTarget', () => {
  it('extracts the base word from "plural of X."', () => {
    expect(extractFormOfTarget('plural of decade.', ['form of', 'plural'])).toBe('decade');
  });

  it('extracts the base word from "present participle and gerund of go"', () => {
    expect(extractFormOfTarget('present participle and gerund of go', ['form of'])).toBe('go');
  });

  it('works via idiom even without the tag', () => {
    expect(extractFormOfTarget('past of run.')).toBe('run');
  });

  it('rejects definitions that are not form-of', () => {
    expect(extractFormOfTarget('Of a person or an animal:')).toBeNull();
    expect(extractFormOfTarget('Lasting for a short period of time.')).toBeNull();
    expect(extractFormOfTarget('A group, set, or series of ten, particularly:')).toBeNull();
  });

  it('rejects oversized or self-referential targets', () => {
    expect(extractFormOfTarget('plural of ' + 'x'.repeat(40) + '.', ['form of'])).toBeNull();
  });
});

describe('interactive words, tags, and quotes in normalization', () => {
  it('maps a "form of" sense to a linked word plus tags and quotes', () => {
    const raw: OnlineDictionaryResponse = {
      word: 'decades',
      entries: [
        {
          partOfSpeech: 'noun',
          pronunciations: [{ type: 'ipa', text: '/ˈdɛkeɪdz/' }],
          senses: [
            {
              definition: 'plural of decade.',
              tags: ['form of', 'plural'],
              quotes: [{ text: 'For decades it rained.', reference: '2013, The Economist' }],
            },
          ],
        },
      ],
    };

    const result = normalizeOnlineResponse(raw, 'decades', 'online');

    const def = result.meanings[0].definitions[0];
    expect(def.definition).toBe('plural of decade.');
    expect(def.tags).toEqual(['form of', 'plural']);
    expect(def.quotes).toEqual([{ text: 'For decades it rained.', reference: '2013, The Economist' }]);
    expect(def.linkedWords).toEqual([{ query: 'decade', label: 'decade' }]);
  });

  it('never links a word to itself', () => {
    const raw: OnlineDictionaryResponse = {
      word: 'decade',
      entries: [
        {
          partOfSpeech: 'noun',
          senses: [{ definition: 'plural of decade.', tags: ['form of', 'plural'] }],
        },
      ],
    };

    const result = normalizeOnlineResponse(raw, 'decade', 'online');
    expect(result.meanings[0].definitions[0].linkedWords).toBeUndefined();
  });

  it('leaves plain definitions without linked words or tags', () => {
    const raw: OnlineDictionaryResponse = {
      word: 'ephemeral',
      entries: [
        {
          partOfSpeech: 'adjective',
          senses: [{ definition: 'Lasting for a short period of time.' }],
        },
      ],
    };

    const result = normalizeOnlineResponse(raw, 'ephemeral', 'online');
    const def = result.meanings[0].definitions[0];
    expect(def.linkedWords).toBeUndefined();
    expect(def.tags).toBeUndefined();
    expect(def.quotes).toBeUndefined();
  });

  it('maps forms, entry-level synonyms/antonyms, all examples, and subsenses', () => {
    const raw: OnlineDictionaryResponse = {
      word: 'fast',
      entries: [
        {
          partOfSpeech: 'adjective',
          forms: [
            { word: 'faster', tags: ['comparative'] },
            { word: 'fastest', tags: ['superlative'] },
          ],
          synonyms: ['quick', 'rapid', 'speedy'],
          antonyms: ['slow'],
          senses: [
            {
              definition: 'Moving quickly.',
              examples: ['He ran fast.', 'Fast cars.' ],
              synonyms: ['quick', 'speedy'],
              antonyms: ['slow', 'sluggish'],
              subsenses: [
                {
                  definition: '(nuclear physics) Having a high kinetic energy.',
                  examples: ['Fast neutrons.'],
                  synonyms: ['speedy'],
                },
              ],
            },
          ],
        },
      ],
    };

    const result = normalizeOnlineResponse(raw, 'fast', 'online');
    const meaning = result.meanings[0];
    const def = meaning.definitions[0];

    expect(meaning.partOfSpeech).toBe('adjective');
    expect(meaning.forms).toEqual([
      { word: 'faster', tags: ['comparative'] },
      { word: 'fastest', tags: ['superlative'] },
    ]);
    expect(meaning.synonyms).toEqual(['quick', 'rapid', 'speedy']);
    expect(meaning.antonyms).toEqual(['slow']);

    expect(def.examples).toEqual(['He ran fast.', 'Fast cars.']);
    expect(def.example).toBe('He ran fast.');
    expect(def.synonyms).toEqual(['quick', 'speedy']);
    expect(def.antonyms).toEqual(['slow', 'sluggish']);
    expect(def.subsenses).toHaveLength(1);
    expect(def.subsenses?.[0].definition).toBe('(nuclear physics) Having a high kinetic energy.');
    expect(def.subsenses?.[0].examples).toEqual(['Fast neutrons.']);
  });

  it('caps subsense recursion at depth 2', () => {
    const raw: OnlineDictionaryResponse = {
      word: 'deep',
      entries: [
        {
          partOfSpeech: 'adjective',
          senses: [
            {
              definition: 'Level A.',
              subsenses: [
                {
                  definition: 'Level B.',
                  subsenses: [
                    { definition: 'Level C.' },
                    { definition: 'Level D.' },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const result = normalizeOnlineResponse(raw, 'deep', 'online');
    const a = result.meanings[0].definitions[0];
    const b = a.subsenses?.[0];
    const c = b?.subsenses?.[0];

    expect(b?.definition).toBe('Level B.');
    // Level C gets flattened to a text-only subsense (no further nesting).
    expect(c?.definition).toBe('Level C.');
    expect(c?.subsenses).toBeUndefined();
  });
});