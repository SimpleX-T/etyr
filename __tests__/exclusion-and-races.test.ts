import { describe, it, expect, beforeEach } from 'vitest';
import { getBrowserAPI } from '../src/browser/types';
import { SelectionStateMachine } from '../src/content/selection/state-machine';
import type { SelectionSnapshot } from '../src/shared/types';

function snapshot(requestId: string, text = 'word'): SelectionSnapshot {
  return {
    text,
    rect: { x: 0, y: 0, width: 40, height: 16, top: 0, right: 40, bottom: 16, left: 0, toJSON: () => ({}) } as DOMRect,
    range: new Range(),
    timestamp: Date.now(),
    requestId,
  };
}

describe('site exclusion', () => {
  beforeEach(() => {
    chrome.storage.local.clear();
  });

  it('stores excluded sites', async () => {
    const api = getBrowserAPI();
    await api.storage.local.set({ etyr_excluded_sites: ['github.com', 'stackoverflow.com'] });
    const result = await api.storage.local.get('etyr_excluded_sites');
    const sites = result['etyr_excluded_sites'] as string[];
    expect(sites).toContain('github.com');
    expect(sites).toContain('stackoverflow.com');
  });

  it('removes an excluded site', async () => {
    const api = getBrowserAPI();
    await api.storage.local.set({ etyr_excluded_sites: ['github.com', 'stackoverflow.com'] });
    const result = await api.storage.local.get('etyr_excluded_sites');
    let sites = result['etyr_excluded_sites'] as string[];
    sites = sites.filter(s => s !== 'github.com');
    await api.storage.local.set({ etyr_excluded_sites: sites });

    const updated = await api.storage.local.get('etyr_excluded_sites');
    const updatedSites = updated['etyr_excluded_sites'] as string[];
    expect(updatedSites).not.toContain('github.com');
    expect(updatedSites).toContain('stackoverflow.com');
  });

  it('checks domain inclusion', async () => {
    const excluded = ['github.com', 'stackoverflow.com'];
    expect(excluded.some(d => 'github.com'.includes(d) || d.includes('github.com'))).toBe(true);
    expect(excluded.some(d => 'google.com'.includes(d) || d.includes('google.com'))).toBe(false);
  });

  it('handles www prefix', () => {
    const domain = 'www.github.com';
    const normalized = domain.replace(/^www\./, '');
    expect(normalized).toBe('github.com');
  });
});

describe('selection race conditions', () => {
  it('requestId prevents stale results', () => {
    const results: Array<{ requestId: string; text: string }> = [];
    let currentRequestId = '';

    function onSelection(text: string) {
      currentRequestId = crypto.randomUUID();
      const reqId = currentRequestId;
      results.push({ requestId: reqId, text });
    }

    function onComplete(reqId: string, text: string) {
      if (reqId !== currentRequestId) return 'stale';
      return 'accepted';
    }

    onSelection('ephemeral');
    const id1 = currentRequestId;

    onSelection('ubiquitous');
    const id2 = currentRequestId;

    expect(id1).not.toBe(id2);
    expect(onComplete(id1, 'ephemeral')).toBe('stale');
    expect(onComplete(id2, 'ubiquitous')).toBe('accepted');
  });

  it('subsequent selection cancels previous wait', () => {
    const calls: string[] = [];
    let abortController: AbortController | null = null;

    function startLookup(query: string) {
      if (abortController) abortController.abort();
      abortController = new AbortController();
      const signal = abortController.signal;

      const timeout = setTimeout(() => {
        if (!signal.aborted) {
          calls.push(query);
        }
      }, 1500);

      signal.addEventListener('abort', () => clearTimeout(timeout));
    }

    startLookup('ephemeral');
    startLookup('ubiquitous');
    expect(calls).toHaveLength(0);
  });

  it('abort cancels pending operations', async () => {
    const controller = new AbortController();
    let aborted = false;

    const promise = new Promise<void>((resolve, reject) => {
      controller.signal.addEventListener('abort', () => {
        aborted = true;
        reject(new Error('aborted'));
      });
      setTimeout(resolve, 1000);
    });

    controller.abort();
    try {
      await promise;
    } catch {
      // expected
    }
    expect(aborted).toBe(true);
  });

  it('re-selecting while WAITING restarts the lookup window', () => {
    const machine = new SelectionStateMachine();
    const transitions: string[] = [];
    machine.onStateChange((state, requestId) => {
      transitions.push(`${state}:${requestId}`);
    });

    // First selection -> SELECTION_DETECTED -> accepted -> WAITING
    machine.dispatch({ type: 'selection_change', snapshot: snapshot('req-1') });
    machine.dispatch({ type: 'accepted' });
    expect(machine.getState()).toBe('WAITING');
    expect(machine.getRequestId()).toBe('req-1');

    // New selection while WAITING must re-emit (fresh requestId) so the
    // content script can restart its 1.5s timer.
    const before = transitions.length;
    machine.dispatch({ type: 'selection_change', snapshot: snapshot('req-2') });
    expect(machine.getState()).toBe('SELECTION_DETECTED');
    expect(transitions.length).toBeGreaterThan(before);
    expect(transitions.at(-1)).toContain('req-2');

    machine.dispatch({ type: 'accepted' });
    expect(machine.getState()).toBe('WAITING');
  });

  it('stale requestIds never surface showing results', () => {
    const machine = new SelectionStateMachine();
    let shown: string | null = null;
    machine.onStateChange((state, requestId) => {
      if (state === 'SHOWING') shown = requestId;
    });

    machine.dispatch({ type: 'selection_change', snapshot: snapshot('req-1') });
    machine.dispatch({ type: 'accepted' });
    machine.dispatch({ type: 'timer_expire' });

    // User re-selects mid-flight -> state resets toward WAITING, and the old
    // requestId is no longer active.
    machine.dispatch({ type: 'selection_change', snapshot: snapshot('req-2') });
    expect(machine.isActiveRequestId('req-1')).toBe(false);
    expect(machine.isActiveRequestId('req-2')).toBe(true);

    // A late response for req-1 must be rejected.
    machine.dispatch({ type: 'resolve_complete' });
    expect(machine.getState()).toBe('SELECTION_DETECTED');
    expect(shown).toBeNull();

    // Completing the active request works.
    machine.dispatch({ type: 'accepted' });
    machine.dispatch({ type: 'timer_expire' });
    machine.dispatch({ type: 'resolve_complete' });
    expect(machine.getState()).toBe('SHOWING');
    expect(shown).toBe('req-2');
  });
});