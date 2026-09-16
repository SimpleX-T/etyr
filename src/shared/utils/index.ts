import { PUNCTUATION_REGEX, URL_REGEX, EMAIL_REGEX, MAX_SELECTION_LENGTH, MIN_SELECTION_LENGTH } from '../constants';
import type { Settings } from '../types';

export * from './clipboard';
export * from './format';

export type ResolvedTheme = 'dark' | 'light';

export function resolveTheme(theme: Settings['theme']): ResolvedTheme {
  if (theme === 'dark' || theme === 'light') return theme;
  const media =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: light)')
      : null;
  return media?.matches ? 'light' : 'dark';
}

export function sourceLabel(source: string): string {
  if (source === 'cache' || source === 'offline') return 'local';
  return source;
}

export function normalizeText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s'-]/g, '')
    .trim();
}

export function normalizeQuery(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/['']/g, "'")
    .trim();
}

export function isLookupCandidate(text: string): boolean {
  const trimmed = text.trim();

  if (trimmed.length < MIN_SELECTION_LENGTH) return false;
  if (trimmed.length > MAX_SELECTION_LENGTH) return false;

  if (PUNCTUATION_REGEX.test(trimmed)) return false;

  if (URL_REGEX.test(trimmed)) return false;

  if (EMAIL_REGEX.test(trimmed)) return false;

  const alphanumericCount = (trimmed.match(/[\w]/g) || []).length;
  if (alphanumericCount < 2) return false;

  const letterCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
  if (letterCount < 2) return false;

  const spaceRatio = trimmed.split(/\s+/).length / trimmed.length;
  if (spaceRatio > 0.5) return false;

  return true;
}

export function looksLikeCode(text: string): boolean {
  const codeIndicators = [
    /[{}]/,
    /;\s*$/,
    /^import\s+/,
    /^const\s+/,
    /^let\s+/,
    /^var\s+/,
    /^function\s+/,
    /^class\s+/,
    /^\s*(?:if|else|for|while|return)\s*[({]/,
    /^\/\/+/,
    /^#+\s*(include|define|import)/,
    /\.\w+\(/,
    /=>\s*{/,
    /===?|!==?|&&|\|\|/,
  ];

  const lines = text.split('\n');
  const codeLineCount = lines.filter(line =>
    codeIndicators.some(pattern => pattern.test(line))
  ).length;

  return codeLineCount > lines.length * 0.5;
}

export function createId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delayMs: number
): { (...args: Parameters<T>): void; cancel(): void } {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  };

  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '…';
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function sanitizeForDisplay(text: string): string {
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

const HTML_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#039;': "'",
  '&apos;': "'",
  '&mdash;': '—',
  '&ndash;': '–',
  '&hellip;': '…',
  '&times;': '×',
  '&ldquo;': '“',
  '&rdquo;': '”',
  '&lsquo;': '‘',
  '&rsquo;': '’',
};

export function stripHtmlToText(html: string): string {
  let text = html;
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    text = text.split(entity).join(char);
  }
  text = text.replace(/<[^>]*>/g, ' ');
  text = text.replace(/[\u200b\u200e\u200f]/g, '');
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

export type DefinitionSegment =
  | { type: 'text'; text: string }
  | { type: 'link'; text: string; query: string };

export function splitDefinitionSegments(
  definition: string,
  linkedWords?: NonNullable<import('../types').Definition['linkedWords']>,
): DefinitionSegment[] {
  if (!linkedWords || linkedWords.length === 0) {
    return definition ? [{ type: 'text', text: definition }] : [];
  }

  const segments: DefinitionSegment[] = [];
  let rest = definition;

  for (const word of linkedWords) {
    const idx = rest.indexOf(word.label);
    if (idx === -1) continue;

    if (idx > 0) segments.push({ type: 'text', text: rest.slice(0, idx) });
    segments.push({ type: 'link', text: word.label, query: word.query });
    rest = rest.slice(idx + word.label.length);
  }

  if (rest) segments.push({ type: 'text', text: rest });
  if (segments.length === 0 && definition) {
    segments.push({ type: 'text', text: definition });
  }
  return segments;
}
