import { describe, it, expect } from 'vitest';
import { normalizeText, normalizeQuery, isLookupCandidate, looksLikeCode } from '../src/shared/utils';
import { DEFAULT_SETTINGS, MAX_SELECTION_LENGTH } from '../src/shared/constants';

describe('text normalization', () => {
  it('trims whitespace', () => {
    expect(normalizeText('  ephemeral  ')).toBe('ephemeral');
    expect(normalizeQuery('  ephemeral  ')).toBe('ephemeral');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeText('the   writing   was   rather  convoluted')).toBe('the writing was rather convoluted');
    expect(normalizeQuery('the   writing   was   rather  convoluted')).toBe('the writing was rather convoluted');
  });

  it('strips surrounding punctuation but keeps internal apostrophes and hyphens', () => {
    expect(normalizeText('"ephemeral"')).toBe('ephemeral');
    expect(normalizeText('(ephemeral)')).toBe('ephemeral');
    expect(normalizeText('red herring.')).toBe('red herring');
    expect(normalizeText('don\'t')).toBe('don\'t');
    expect(normalizeQuery('Ephemeral')).toBe('ephemeral');
  });

  it('preserves meaningful phrase structure', () => {
    expect(normalizeQuery('red herring')).toBe('red herring');
    expect(normalizeQuery('on the contrary')).toBe('on the contrary');
  });

  it('normalizes case for queries', () => {
    expect(normalizeQuery('Ephemeral')).toBe('ephemeral');
    expect(normalizeQuery('RED HERRING')).toBe('red herring');
  });
});

describe('selection detection', () => {
  it('rejects empty selections', () => {
    expect(isLookupCandidate('')).toBe(false);
    expect(isLookupCandidate('   ')).toBe(false);
  });

  it('rejects selections of only punctuation', () => {
    expect(isLookupCandidate('...')).toBe(false);
    expect(isLookupCandidate('!!!')).toBe(false);
    expect(isLookupCandidate('---')).toBe(false);
  });

  it('rejects URLs', () => {
    expect(isLookupCandidate('https://example.com')).toBe(false);
    expect(isLookupCandidate('www.example.com')).toBe(false);
  });

  it('rejects email addresses', () => {
    expect(isLookupCandidate('user@example.com')).toBe(false);
  });

  it('rejects extremely long selections', () => {
    expect(isLookupCandidate('word '.repeat(MAX_SELECTION_LENGTH))).toBe(false);
  });

  it('accepts valid words', () => {
    expect(isLookupCandidate('ephemeral')).toBe(true);
  });

  it('accepts valid phrases', () => {
    expect(isLookupCandidate('red herring')).toBe(true);
    expect(isLookupCandidate('on the contrary')).toBe(true);
    expect(isLookupCandidate('the writing was rather convoluted')).toBe(true);
  });

  it('rejects selections with too many characters of non-letter content', () => {
    expect(isLookupCandidate('12345678901234567890123456789012345678901234567890123456789012345678901234567890')).toBe(false);
  });
});

describe('code detection', () => {
  it('detects obvious code blocks', () => {
    expect(looksLikeCode('const x = 5;')).toBe(true);
    expect(looksLikeCode('function foo() { return 1; }')).toBe(true);
    expect(looksLikeCode('if (x > 0) {')).toBe(true);
  });

  it('does not flag normal prose', () => {
    expect(looksLikeCode('The quick brown fox jumps over the lazy dog')).toBe(false);
    expect(looksLikeCode('red herring')).toBe(false);
  });
});

describe('settings defaults', () => {
  it('has sensible defaults', () => {
    expect(DEFAULT_SETTINGS.autoLookup).toBe(true);
    expect(DEFAULT_SETTINGS.lookupDelayMs).toBe(1500);
    expect(DEFAULT_SETTINGS.enablePronunciation).toBe(true);
    expect(DEFAULT_SETTINGS.enableHistory).toBe(true);
    expect(DEFAULT_SETTINGS.theme).toBe('system');
  });
});