import type { DictionaryResult } from '../shared/types';
import type { DictionaryProvider, OnlineDictionaryResponse } from './types';
import { normalizeOnlineResponse } from './types';

import { DICTIONARY_TIMEOUT_MS, DICTIONARY_API_BASE } from '../shared/constants';

export class OnlineDictionaryError extends Error {
  code: string;
  status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = 'OnlineDictionaryError';
    this.code = code;
    this.status = status;
  }
}

/* ------------------------------------------------------------------ */
/*  Fetch helper with timeout + abort propagation                      */
/* ------------------------------------------------------------------ */

async function fetchWithTimeout(
  url: string,
  signal?: AbortSignal,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DICTIONARY_TIMEOUT_MS);

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      if (controller.signal.aborted && !signal?.aborted) {
        throw new OnlineDictionaryError('TIMEOUT', 'Dictionary request timed out');
      }
      throw new OnlineDictionaryError('ABORTED', 'Request was cancelled');
    }
    if (err instanceof TypeError) {
      throw new OnlineDictionaryError('NETWORK_ERROR', 'Network request failed');
    }
    throw new OnlineDictionaryError('UNKNOWN_ERROR', (err as Error).message || 'Unknown error');
  } finally {
    clearTimeout(timeoutId);
  }
}



/* ------------------------------------------------------------------ */
/*  Free Dictionary API provider                                       */
/* ------------------------------------------------------------------ */

export class OnlineDictionaryProvider implements DictionaryProvider {
  async lookup(query: string, signal?: AbortSignal): Promise<DictionaryResult> {
    const normalized = query.toLowerCase().trim();
    if (!normalized) {
      throw new OnlineDictionaryError('EMPTY_QUERY', 'Empty query');
    }

    const url = `${DICTIONARY_API_BASE}/${encodeURIComponent(normalized)}`;

    const response = await fetchWithTimeout(url, signal, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new OnlineDictionaryError('NOT_FOUND', `No results for "${normalized}"`, 404);
      }
      throw new OnlineDictionaryError(
        'API_ERROR',
        `Dictionary API returned ${response.status}`,
        response.status,
      );
    }

    const data: OnlineDictionaryResponse = await response.json();
    if (!data || typeof data !== 'object' || !data.word) {
      throw new OnlineDictionaryError('MALFORMED_RESPONSE', 'Malformed response from dictionary API');
    }

    if (!data.entries || data.entries.length === 0) {
      throw new OnlineDictionaryError('NOT_FOUND', `No results for "${normalized}"`, 404);
    }

    return normalizeOnlineResponse(data, normalized, 'online');
  }
}