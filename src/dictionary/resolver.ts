import type { DictionaryResult } from '../shared/types';
import { normalizeQuery } from '../shared/utils';
import { OfflineDictionaryProvider } from './offline';
import { OnlineDictionaryProvider, OnlineDictionaryError } from './online';
import { DictionaryCache } from './cache';
import { addHistoryEntry } from '../storage/history';
import { getSettings } from '../storage/settings';

export type ResolveOutcome =
  | { status: 'found'; result: DictionaryResult }
  | { status: 'not_found' }
  | { status: 'error' };

class DictionaryResolver {
  private offline = new OfflineDictionaryProvider();
  private online = new OnlineDictionaryProvider();
  private cache = new DictionaryCache();
  private currentRequestId: string | null = null;
  private pendingController: AbortController | null = null;

  async resolve(query: string, signal?: AbortSignal): Promise<ResolveOutcome> {
    const normalized = normalizeQuery(query);
    if (!normalized) return { status: 'not_found' };

    const requestId = crypto.randomUUID();
    this.cancelPending();
    this.currentRequestId = requestId;

    const controller = new AbortController();
    this.pendingController = controller;

    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    const isCurrent = (): boolean => this.currentRequestId === requestId;

    try {
      const offlineResult = await this.offline.lookup(normalized);
      if (offlineResult) {
        if (!isCurrent()) return { status: 'not_found' };
        this.recordHistory(offlineResult);
        return { status: 'found', result: offlineResult };
      }

      const cachedResult = await this.cache.get(normalized);
      if (cachedResult) {
        if (!isCurrent()) return { status: 'not_found' };
        const cached: DictionaryResult = { ...cachedResult, source: 'cache', timestamp: Date.now() };
        this.recordHistory(cached);
        return { status: 'found', result: cached };
      }

      if (controller.signal.aborted) return { status: 'not_found' };

      const onlineResult = await this.online.lookup(normalized, controller.signal);
      if (!onlineResult) {
        return { status: 'not_found' };
      }

      if (!isCurrent()) return { status: 'not_found' };
      await this.cache.set(normalized, onlineResult);
      this.recordHistory(onlineResult);
      return { status: 'found', result: onlineResult };
    } catch (err) {
      if (!isCurrent()) return { status: 'not_found' };

      if (err instanceof OnlineDictionaryError) {
        if (err.code === 'ABORTED') return { status: 'not_found' };
        if (err.code === 'NOT_FOUND' || err.status === 404) {
          return { status: 'not_found' };
        }
        return { status: 'error' };
      }

      return { status: 'error' };
    } finally {
      if (this.currentRequestId === requestId) {
        this.currentRequestId = null;
        this.pendingController = null;
      }
    }
  }

  private cancelPending(): void {
    if (this.pendingController) {
      this.pendingController.abort();
      this.pendingController = null;
    }
  }

  private recordHistory(result: DictionaryResult): void {
    getSettings()
      .then(settings => {
        if (settings.enableHistory) return addHistoryEntry(result);
        return undefined;
      })
      .catch(() => {});
  }
}

export const dictionaryResolver = new DictionaryResolver();