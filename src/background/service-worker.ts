import type {
  DictionaryResult,
  MessageAction,
  MessageRequest,
  MessageResponse,
  SavedWord,
  Settings,
} from '../shared/types';
import { MESSAGE_ACTIONS, DEFAULT_SETTINGS, STORAGE_KEYS } from '../shared/constants';
import { getBrowserAPI } from '../browser/types';
import { dictionaryResolver } from '../dictionary/resolver';
import {
  getAllSavedWords,
  isWordSaved,
  getSavedWordId,
  saveWord,
  removeSavedWord,
  clearAllSavedWords,
  savedWordsToJSON,
  savedWordsToCSV,
  parseImportedWords,
} from '../storage/bookmarks';
import {
  addHistoryEntry,
  getRecentHistory,
  clearHistory,
} from '../storage/history';
import { getSettings, updateSettings } from '../storage/settings';
import {
  isSiteExcluded,
  addExclusion,
  removeExclusion,
  getExcludedSites,
} from '../storage/exclusions';
import { getStorageItem, setStorageItem } from '../storage/database';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

interface RuntimeSender {
  tab?: { id?: number; url?: string };
  url?: string;
}

function ok<T>(data?: T): MessageResponse<T> {
  return { ok: true, data };
}

function fail(code: string, message: string): MessageResponse<never> {
  return { ok: false, error: { code, message } };
}

class RouteError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

function unwrap(payload: unknown): Record<string, unknown> {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return {};
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function extractHostname(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase() || undefined;
  } catch {
    return undefined;
  }
}

/* ------------------------------------------------------------------ */
/*  Speech                                                             */
/* ------------------------------------------------------------------ */

function speakWord(word: string): Promise<boolean> {
  const scope = globalThis as typeof globalThis & { chrome?: typeof chrome };
  
  if (scope.chrome?.tts) {
    return new Promise<boolean>((resolve) => {
      scope.chrome!.tts.speak(word, {
        lang: 'en-US',
        rate: 0.9,
        onEvent: (event) => {
          if (['end', 'error', 'interrupted', 'cancelled'].includes(event.type)) {
            resolve(true);
          }
        },
      });
    });
  }

  return Promise.resolve(false);
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

async function installDefaults(): Promise<void> {
  const existing = await getStorageItem(STORAGE_KEYS.SETTINGS);
  if (!existing) {
    await setStorageItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  }
}

/* ------------------------------------------------------------------ */
/*  Message router                                                     */
/* ------------------------------------------------------------------ */

type MessageHandler = (
  payload: unknown,
  sender?: RuntimeSender,
) => Promise<unknown>;

const handlers: Partial<Record<MessageAction, MessageHandler>> = {
  [MESSAGE_ACTIONS.DICTIONARY_RESOLVE]: async (payload) => {
    const q = asString(unwrap(payload).query);
    if (!q) throw new RouteError('INVALID_PAYLOAD', 'Field "query" is required');
    const outcome = await dictionaryResolver.resolve(q);
    if (outcome.status === 'found') return outcome.result;
    if (outcome.status === 'not_found') {
      throw new RouteError('NOT_FOUND', 'No definitions found for this word');
    }
    throw new RouteError('NETWORK_ERROR', 'Could not reach a dictionary source');
  },

  [MESSAGE_ACTIONS.BOOKMARK_SAVE]: async (payload) => {
    const result = unwrap(payload).result as DictionaryResult | undefined;
    if (!result || typeof result.word !== 'string' || !Array.isArray(result.meanings)) {
      throw new RouteError('INVALID_PAYLOAD', 'Field "result" (DictionaryResult) is required');
    }
    return saveWord(result);
  },

  [MESSAGE_ACTIONS.BOOKMARK_IS_SAVED]: async (payload) => {
    const query = asString(unwrap(payload).query);
    if (!query) throw new RouteError('INVALID_PAYLOAD', 'Field "query" is required');
    return isWordSaved(query);
  },

  [MESSAGE_ACTIONS.BOOKMARK_REMOVE]: async (payload) => {
    const p = unwrap(payload);
    const id = asString(p.id);
    const query = asString(p.query);
    if (!id && !query) {
      throw new RouteError('INVALID_PAYLOAD', 'Field "id" or "query" is required');
    }
    const targetId = id ?? (await getSavedWordId(query as string));
    if (!targetId) return { removed: false };
    await removeSavedWord(targetId);
    return { removed: true };
  },

  [MESSAGE_ACTIONS.BOOKMARK_GET_ALL]: async () => {
    return getAllSavedWords();
  },

  [MESSAGE_ACTIONS.HISTORY_ADD]: async (payload) => {
    const result = unwrap(payload).result as DictionaryResult | undefined;
    if (!result || typeof result.word !== 'string' || !Array.isArray(result.meanings)) {
      throw new RouteError('INVALID_PAYLOAD', 'Field "result" (DictionaryResult) is required');
    }
    await addHistoryEntry(result);
    return { added: true };
  },

  [MESSAGE_ACTIONS.HISTORY_GET_RECENT]: async (payload) => {
    const limit = unwrap(payload).limit;
    return getRecentHistory(typeof limit === 'number' ? limit : undefined);
  },

  [MESSAGE_ACTIONS.HISTORY_CLEAR]: async () => {
    await clearHistory();
    return { cleared: true };
  },

  [MESSAGE_ACTIONS.SETTINGS_GET]: async () => {
    return getSettings();
  },

  [MESSAGE_ACTIONS.SETTINGS_SET]: async (payload) => {
    const p = unwrap(payload);
    if (Object.keys(p).length === 0) {
      throw new RouteError('INVALID_PAYLOAD', 'At least one setting is required');
    }
    const patch: Partial<Settings> = {};
    if (typeof p.autoLookup === 'boolean') patch.autoLookup = p.autoLookup;
    if (typeof p.enablePronunciation === 'boolean') patch.enablePronunciation = p.enablePronunciation;
    if (typeof p.enableHistory === 'boolean') patch.enableHistory = p.enableHistory;
    if (typeof p.lookupDelayMs === 'number') patch.lookupDelayMs = p.lookupDelayMs;
    if (
      typeof p.theme === 'string' &&
      ['system', 'dark', 'light'].includes(p.theme)
    ) {
      patch.theme = p.theme as Settings['theme'];
    }
    if (Object.keys(patch).length === 0) {
      throw new RouteError('INVALID_PAYLOAD', 'No valid settings provided');
    }
    return updateSettings(patch);
  },

  [MESSAGE_ACTIONS.EXCLUSION_CHECK]: async (payload, sender) => {
    const p = unwrap(payload);
    const domain =
      asString(p.domain) ??
      extractHostname(asString(p.url)) ??
      extractHostname(sender?.tab?.url) ??
      extractHostname(sender?.url);
    if (!domain) return false;
    return isSiteExcluded(domain);
  },

  [MESSAGE_ACTIONS.EXCLUSION_ADD]: async (payload, sender) => {
    const p = unwrap(payload);
    const domain =
      asString(p.domain) ??
      extractHostname(asString(p.url)) ??
      extractHostname(sender?.tab?.url);
    if (!domain) throw new RouteError('INVALID_PAYLOAD', 'Field "domain" is required');
    await addExclusion(domain);
    return { added: true };
  },

  [MESSAGE_ACTIONS.EXCLUSION_REMOVE]: async (payload) => {
    const domain = asString(unwrap(payload).domain);
    if (!domain) throw new RouteError('INVALID_PAYLOAD', 'Field "domain" is required');
    await removeExclusion(domain);
    return { removed: true };
  },

  [MESSAGE_ACTIONS.EXCLUSION_GET_ALL]: async () => {
    return getExcludedSites();
  },

  [MESSAGE_ACTIONS.EXPORT_SAVED]: async () => {
    const words = await getAllSavedWords();
    return { count: words.length, json: savedWordsToJSON(words), csv: savedWordsToCSV(words) };
  },

  [MESSAGE_ACTIONS.IMPORT_SAVED]: async (payload) => {
    const data = unwrap(payload).data;
    if (data === undefined || data === null) {
      throw new RouteError('INVALID_PAYLOAD', 'Field "data" is required');
    }

    const imported = parseImportedWords(data);
    const existing = await getAllSavedWords();
    const seen = new Set<string>();
    const merged: SavedWord[] = [];

    for (const word of [...imported, ...existing]) {
      const key = (word.query || word.word).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(word);
      }
    }

    await setStorageItem(STORAGE_KEYS.SAVED_WORDS, merged);
    return { imported: imported.length, total: merged.length };
  },

  [MESSAGE_ACTIONS.SAVED_CLEAR]: async () => {
    await clearAllSavedWords();
    return { cleared: true };
  },

  [MESSAGE_ACTIONS.CONTENT_INIT]: async (payload, sender) => {
    const p = unwrap(payload);
    const domain =
      asString(p.domain) ??
      extractHostname(asString(p.url)) ??
      extractHostname(sender?.tab?.url) ??
      extractHostname(sender?.url);

    let excluded = false;
    if (domain) excluded = await isSiteExcluded(domain);

    const settings = await getSettings();
    return { excluded, settings, domain: domain ?? null };
  },

  [MESSAGE_ACTIONS.PRONUNCIATION_SPEAK]: async (payload) => {
    const p = unwrap(payload);
    const query = asString(p.query);
    const result = p.result as DictionaryResult | undefined;
    const word = result?.word ?? query;
    if (!word) throw new RouteError('INVALID_PAYLOAD', 'Field "query" is required');

    const settings = await getSettings();
    if (!settings.enablePronunciation) {
      throw new RouteError('SPEECH_DISABLED', 'Pronunciation is disabled in settings');
    }

    const played = await speakWord(word);
    if (!played) {
      throw new RouteError('SPEECH_UNAVAILABLE', 'Speech synthesis is not available');
    }
    return { played: true };
  },
};

/* ------------------------------------------------------------------ */
/*  Router                                                             */
/* ------------------------------------------------------------------ */

function normalizeRequest(message: unknown): MessageRequest | null {
  if (!message || typeof message !== 'object' || Array.isArray(message)) return null;
  const candidate = message as Record<string, unknown>;
  if (typeof candidate.action !== 'string') return null;
  return {
    action: candidate.action as MessageAction,
    payload: candidate.payload,
    requestId: typeof candidate.requestId === 'string' ? candidate.requestId : undefined,
  };
}

async function routeMessage(
  request: MessageRequest,
  sender?: RuntimeSender,
): Promise<MessageResponse<unknown>> {
  const handler = handlers[request.action];
  if (!handler) return fail('UNKNOWN_ACTION', `Unknown action: ${request.action}`);

  try {
    const data = await handler(request.payload, sender);
    return ok(data);
  } catch (err) {
    if (err instanceof RouteError) return fail(err.code, err.message);
    return fail(
      'INTERNAL_ERROR',
      err instanceof Error ? err.message : 'Unexpected error',
    );
  }
}

/* ------------------------------------------------------------------ */
/*  Listeners                                                          */
/* ------------------------------------------------------------------ */

void installDefaults().catch(() => {});

const runtime = getBrowserAPI().runtime as unknown as {
  onInstalled?: {
    addListener: (cb: (details: { reason: string }) => void) => void;
  };
};
runtime.onInstalled?.addListener(() => {
  void installDefaults().catch(() => {});
});

getBrowserAPI().runtime.onMessage.addListener((message, sender) => {
  const request = normalizeRequest(message);
  if (!request) {
    return Promise.resolve(fail('INVALID_REQUEST', 'Malformed message'));
  }
  return routeMessage(request, sender as RuntimeSender | undefined);
});