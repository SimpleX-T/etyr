import type { DictionaryResult, Definition, Meaning, SenseQuote } from '../types';
import { sourceLabel } from './index';

export function formatQuote(quote: SenseQuote): string {
  const base = `"${quote.text}"`;
  return quote.reference ? `${base} — ${quote.reference}` : base;
}

function examplesOf(def: Definition): string[] {
  return def.examples ?? (def.example ? [def.example] : []);
}

/**
 * Plain-text rendering of a single sense (definition, tags, examples, quotes
 * with citations, nested subsenses). No numbering — used by per-item copy.
 */
export function formatDefinition(def: Definition, bullet = '•', depth = 0): string {
  const pad = '  '.repeat(depth);
  const lines: string[] = [];
  lines.push(`${pad}${bullet} ${def.definition}`);
  if (def.tags && def.tags.length > 0) {
    lines.push(`${pad}  Tags: ${def.tags.join(', ')}`);
  }
  const examples = examplesOf(def);
  if (examples.length > 0) {
    lines.push(`${pad}  Examples: ${examples.map(example => `"${example}"`).join('; ')}`);
  }
  if (def.quotes && def.quotes.length > 0) {
    for (const quote of def.quotes) lines.push(`${pad}  Quote: ${formatQuote(quote)}`);
  }
  if (def.subsenses && def.subsenses.length > 0) {
    for (const sub of def.subsenses) {
      lines.push(formatDefinition(sub, '·', depth + 1));
    }
  }
  return lines.join('\n');
}

/**
 * Plain-text rendering of one part-of-speech group: head (POS + forms),
 * numbered senses, then aggregated Synonyms/Antonyms (matching what the UI
 * shows as chips).
 */
export function formatMeaningGroup(meaning: Meaning): string {
  const collect = (field: 'synonyms' | 'antonyms'): string[] => {
    const out: string[] = [];
    const push = (list?: string[]): void => {
      if (list && list.length > 0) out.push(...list);
    };
    push(meaning[field]);
    const walk = (defs: Definition[]): void => {
      for (const def of defs) {
        push(def[field]);
        if (def.subsenses && def.subsenses.length > 0) walk(def.subsenses);
      }
    };
    walk(meaning.definitions);
    return Array.from(new Set(out));
  };

  const lines: string[] = [];
  const head =
    meaning.partOfSpeech +
    (meaning.forms && meaning.forms.length > 0
      ? ` — ${meaning.forms.map(form => `${form.tags?.[0] ? `(${form.tags[0]}) ` : ''}${form.word}`).join(', ')}`
      : '');
  lines.push(head);
  meaning.definitions.forEach((def, index) => lines.push(formatDefinition(def, `${index + 1}.`)));
  const synonyms = collect('synonyms');
  const antonyms = collect('antonyms');
  if (synonyms.length > 0) lines.push(`Synonyms: ${synonyms.join(', ')}`);
  if (antonyms.length > 0) lines.push(`Antonyms: ${antonyms.join(', ')}`);
  return lines.join('\n');
}

/** Whole-entry plain-text: word + phonetic + source + every meaning group. */
export function formatResultForCopy(result: DictionaryResult): string {
  const lines: string[] = [];
  lines.push(result.word + (result.phonetic ? `  ${result.phonetic}` : ''));
  lines.push(sourceLabel(result.source));
  for (const meaning of result.meanings) {
    lines.push('');
    lines.push(formatMeaningGroup(meaning));
  }
  return lines.join('\n').trim();
}