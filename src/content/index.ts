import type {
  DictionaryResult,
  MessageRequest,
  MessageResponse,
  SelectionSnapshot,
  Settings,
} from '@shared/types';
import { DEFAULT_SETTINGS, LOOKUP_DELAY_MS, MESSAGE_ACTIONS, STORAGE_KEYS } from '@shared/constants';
import { normalizeQuery, resolveTheme } from '@shared/utils';
import { getBrowserAPI, isExtensionContext } from '@browser/types';
import { SelectionDetector } from './selection/detector';
import { SelectionStateMachine, type MachineState } from './selection/state-machine';
import { initTooltip, type TooltipBridge } from './tooltip';
import { PronunciationService } from '@dictionary/pronunciation';
import tooltipStyles from './styles/tooltip.css?inline';

const ROOT_SELECTOR = '#etyr-tooltip-root';
const NAV_MAX_DEPTH = 12;

export class EtyrContent {
  private detector: SelectionDetector | null = null;
  private machine: SelectionStateMachine | null = null;
  private tooltip: TooltipBridge | null = null;
  private aborted = false;
  private lookupTimer: number | null = null;
  private currentResult: DictionaryResult | null = null;
  private currentSnapshot: SelectionSnapshot | null = null;
  private settings: Settings = DEFAULT_SETTINGS;
  private pronunciationService = new PronunciationService();
  private navRequestId = 0;
  private navStack: Array<{ id: string; label: string }> = [];
  private sidePanelActive = false;

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      if (event.isTrusted) {
        event.preventDefault();
        event.stopPropagation();
      }
      this.dismissTooltip();
    }
  };

  private readonly onPointerDown = (event: MouseEvent | TouchEvent): void => {
    if (!this.tooltip || this.aborted) return;
    const target = event.target;
    if (!(target instanceof Element)) return;

    // Ignore clicks inside the tooltip itself
    if (target.closest(ROOT_SELECTOR)) return;

    const state = this.machine?.getState();
    if (state && state !== 'IDLE') {
      this.dismissTooltip();
    }
  };

  private readonly onPageHide = (): void => {
    this.destroy();
  };

  async init(): Promise<void> {
    if (!isExtensionContext()) return;

    document.documentElement.dataset.etyrInjected = '1';

    const boot = await this.sendMessage<{
      excluded: boolean;
      settings: Settings | null;
      domain: string | null;
    }>({ action: MESSAGE_ACTIONS.CONTENT_INIT, payload: {} });

    const settings = boot?.ok === true ? boot.data?.settings : null;
    const excluded = boot?.ok === true ? boot.data?.excluded === true : false;

    if (excluded) {
      this.aborted = true;
      return;
    }

    const effective = settings ?? DEFAULT_SETTINGS;
    this.settings = effective;

    this.detector = new SelectionDetector(effective);
    this.machine = new SelectionStateMachine();
    this.tooltip = initTooltip({
      onDismiss: () => this.dismissTooltip(),
      onBookmark: () => void this.toggleBookmark(),
      onPronounce: () => void this.speakCurrent(),
      onDisableSite: () => void this.disableOnSite(),
      onOpenWord: (query, _label) => this.openNavWord(query),
      onBack: () => this.navigateBack(),
      onOpenSidePanel: (word) => this.openSidePanelWord(word),
      showPronunciation: effective.enablePronunciation,
      styles: tooltipStyles,
    });

    this.applyTheme(effective.theme);

    this.machine.onStateChange((state, _requestId, snapshot) =>
      this.onMachineState(state, snapshot),
    );

    // Load the initial side-panel state (the panel page updates it as it
    // opens/closes, but the content script may boot while it's already open).
    void getBrowserAPI()
      .storage.local.get(STORAGE_KEYS.SIDEPANEL_ACTIVE)
      .then(result => {
        this.sidePanelActive = result[STORAGE_KEYS.SIDEPANEL_ACTIVE] === true;
      })
      .catch(() => undefined);

    this.detector.onSelect(snapshot => this.onSelection(snapshot));
    this.detector.start();

    window.addEventListener('keydown', this.onKeyDown, true);
    document.addEventListener('mousedown', this.onPointerDown, true);
    document.addEventListener('touchstart', this.onPointerDown, true);
    window.addEventListener('pagehide', this.onPageHide);
    this.api.storage.onChanged.addListener(this.onStorageChange);
  }

  private readonly onStorageChange = (
    changes: Record<string, { newValue?: unknown }>,
    areaName: string,
  ): void => {
    if (areaName !== 'local') return;

    if (changes[STORAGE_KEYS.SETTINGS]) {
      const newSettings = changes[STORAGE_KEYS.SETTINGS].newValue as Settings | undefined;
      if (newSettings) {
        this.settings = newSettings;
        this.detector?.updateSettings(newSettings);
        if (newSettings.theme) {
          this.applyTheme(newSettings.theme);
        }
      }
    }

    if (changes[STORAGE_KEYS.SIDEPANEL_ACTIVE]) {
      this.sidePanelActive = changes[STORAGE_KEYS.SIDEPANEL_ACTIVE].newValue === true;
    }
  };

  private applyTheme(theme: Settings['theme']): void {
    const apply = (): void => {
      this.tooltip?.setTheme(resolveTheme(theme));
    };
    apply();

    if (theme === 'system') {
      const mql = window.matchMedia('(prefers-color-scheme: light)');
      mql.addEventListener('change', apply);
      window.addEventListener('pagehide', () => mql.removeEventListener('change', apply));
    }
  }

  destroy(): void {
    this.aborted = true;
    this.clearTimers();
    this.detector?.destroy();
    this.detector = null;
    this.machine = null;
    this.currentResult = null;
    this.tooltip?.destroy();
    this.tooltip = null;

    window.removeEventListener('keydown', this.onKeyDown, true);
    document.removeEventListener('mousedown', this.onPointerDown, true);
    document.removeEventListener('touchstart', this.onPointerDown, true);
    window.removeEventListener('pagehide', this.onPageHide);
    this.api.storage.onChanged.removeListener(this.onStorageChange);
  }

  private get api() {
    return getBrowserAPI();
  }

  private onSelection(snapshot: SelectionSnapshot | null): void {
    if (!this.machine || this.aborted) return;

    if (!snapshot) {
      this.clearTimers();
      this.navRequestId++;
      this.machine.dispatch({ type: 'dismiss' });
      this.hideTooltip();
      return;
    }

    const currentState = this.machine.getState();
    if (currentState === 'SHOWING' || currentState === 'RESOLVING') {
      this.tooltip?.hide();
    }

    // Side panel is open: route the selected word there instead of showing
    // the in-page tooltip.
    if (this.sidePanelActive) {
      this.navStack = [];
      this.navRequestId++;
      this.currentResult = null;
      this.clearTimers();
      this.openSidePanelWord(snapshot.text);
      return;
    }

    this.navStack = [];
    this.navRequestId++;
    this.currentResult = null;
    this.currentSnapshot = snapshot;
    this.clearTimers();
    this.machine.dispatch({ type: 'selection_change', snapshot });
  }

  private onMachineState(state: MachineState, snapshot: SelectionSnapshot | null): void {
    if (this.aborted || !this.machine) return;

    switch (state) {
      case 'SELECTION_DETECTED':
        // Validation is complete; move into the delay window.
        this.machine.dispatch({ type: 'accepted' });
        break;

      case 'WAITING':
        if (snapshot) this.tooltip?.show(snapshot);
        this.clearTimers();
        this.lookupTimer = window.setTimeout(() => {
          this.lookupTimer = null;
          this.machine?.dispatch({ type: 'timer_expire' });
        }, LOOKUP_DELAY_MS);
        break;

      case 'RESOLVING':
        if (snapshot) {
          this.machine.dispatch({ type: 'resolve_start' });
          void this.performLookup(snapshot);
        }
        break;

      case 'SHOWING':
        break;

      case 'IDLE':
      case 'DISMISSED':
        this.clearTimers();
        break;
    }
  }

  private async performLookup(snapshot: SelectionSnapshot): Promise<void> {
    const { requestId } = snapshot;
    const request: MessageRequest = {
      action: MESSAGE_ACTIONS.DICTIONARY_RESOLVE,
      requestId,
      payload: { query: normalizeQuery(snapshot.text) },
    };

    const response = await this.sendMessage<DictionaryResult | null>(request);
    this.handleLookupResponse(response, requestId);
  }

  private handleLookupResponse(
    response: MessageResponse<DictionaryResult | null> | null,
    requestId: string,
  ): void {
    if (!this.machine || !this.machine.isActiveRequestId(requestId)) return;

    const ok = response?.ok === true;
    const result = ok ? (response?.data as DictionaryResult | null) : null;
    const errorCode = response?.ok === false ? response?.error?.code : undefined;
    const errorMessage = response?.ok === false ? response?.error?.message : undefined;

    if (result && result.meanings.length > 0) {
      this.machine.dispatch({ type: 'resolve_complete' });
      this.currentResult = result;

      void this.isSaved(result.query).then(saved => {
        if (!this.machine?.isActiveRequestId(requestId)) return;
        this.tooltip?.updateState('showing', result, saved);
        if (this.settings.autoPlayPronunciation) {
          void this.speakCurrent();
        }
      });
    } else {
      this.machine.dispatch({ type: 'resolve_error' });
      this.currentResult = null;
      const state = (errorCode === 'NOT_FOUND' || (ok && result && result.meanings.length === 0)) ? 'not-found' : 'error';
      this.tooltip?.updateState(state, null, false, errorMessage);
    }
  }

  private async isSaved(query: string): Promise<boolean> {
    const response = await this.sendMessage<boolean>({
      action: MESSAGE_ACTIONS.BOOKMARK_IS_SAVED,
      payload: { query },
    });
    return response?.ok === true ? response.data === true : false;
  }

  private async toggleBookmark(): Promise<void> {
    const result = this.currentResult;
    if (!result || !this.machine) return;

    const saved = await this.isSaved(result.query);

    if (saved) {
      const response = await this.sendMessage<boolean>({
        action: MESSAGE_ACTIONS.BOOKMARK_REMOVE,
        payload: { query: result.query },
      });
      if (response?.ok === true) {
        this.tooltip?.updateState('showing', result, false);
      }
    } else {
      const response = await this.sendMessage<boolean>({
        action: MESSAGE_ACTIONS.BOOKMARK_SAVE,
        payload: { result, context: this.currentSnapshot?.context },
      });
      if (response?.ok === true) {
        this.tooltip?.updateState('showing', result, true);
      }
    }
  }

  private async speakCurrent(): Promise<void> {
    const result = this.currentResult;
    if (!result) return;
    try {
      await this.pronunciationService.speak(result.query, result);
    } catch (e) {
      console.error('Pronunciation failed:', e);
    }
  }

  private async disableOnSite(): Promise<void> {
    if (!this.machine) return;

    await this.sendMessage({
      action: MESSAGE_ACTIONS.EXCLUSION_ADD,
      payload: { domain: window.location.hostname },
    });

    this.clearTimers();
    this.machine.dispatch({ type: 'navigation' });
    this.hideTooltip();
    this.destroy();
  }

  private dismissTooltip(): void {
    if (this.aborted || !this.machine) return;
    if (this.machine.getState() === 'IDLE') return;

    this.clearTimers();
    this.machine.dispatch({ type: 'dismiss' });
    this.hideTooltip();
  }

  private hideTooltip(): void {
    this.navStack = [];
    this.navRequestId++;
    this.tooltip?.setNavPath([], null);
    this.tooltip?.hide();
    this.currentResult = null;
  }

  /* ------------------------------------------------------------------ */
  /*  Cross-reference navigation ("form of" → interactive word links)    */
  /* ------------------------------------------------------------------ */

  private openNavWord(word: string): void {
    if (!this.machine || this.aborted || !this.tooltip) return;

    const base = this.currentResult;
    if (!base) return;

    const target = normalizeQuery(word);
    if (!target || target === normalizeQuery(base.query)) return;

    const existingIndex = this.navStack.findIndex(item => item.id === target);
    if (existingIndex >= 0) {
      // Journey loops back to an ancestor: truncate and re-show it.
      this.navStack.length = existingIndex + 1;
      const last = this.navStack[this.navStack.length - 1];
      this.tooltip.setNavPath(this.navStack, last ? { id: last.id, label: last.label } : null);
      void this.runNavLookup(target);
      return;
    }

    if (this.navStack.length >= NAV_MAX_DEPTH) {
      this.navStack.shift();
    }
    this.navStack.push({ id: normalizeQuery(base.query), label: base.word || base.query });
    this.tooltip.setNavPath(this.navStack, { id: target, label: word });
    void this.runNavLookup(target);
  }

  private navigateBack(): void {
    if (!this.machine || this.aborted || !this.tooltip) return;

    const previous = this.navStack.pop();
    if (!previous) {
      this.tooltip.setNavPath([], null);
      return;
    }

    this.tooltip.setNavPath(this.navStack, { id: previous.id, label: previous.label });
    void this.runNavLookup(previous.id);
  }

  private openSidePanelWord(word: string): void {
    if (!word || !isExtensionContext()) return;
    // The panel replaces the tooltip — close it so the page is unobstructed.
    this.dismissTooltip();
    void this.sendMessage({
      action: MESSAGE_ACTIONS.SIDEPANEL_OPEN,
      payload: { word },
    });
  }

  private async runNavLookup(query: string): Promise<void> {
    if (!this.tooltip || !this.machine || this.aborted) return;

    const requestId = ++this.navRequestId;
    this.currentResult = null;
    this.tooltip.updateState('loading', null, false);

    const request: MessageRequest = {
      action: MESSAGE_ACTIONS.DICTIONARY_RESOLVE,
      requestId: String(requestId),
      payload: { query: normalizeQuery(query) },
    };

    const response = await this.sendMessage<DictionaryResult | null>(request);
    if (requestId !== this.navRequestId) return;

    const ok = response?.ok === true;
    const result = ok ? (response?.data as DictionaryResult | null) : null;

    if (result && result.meanings.length > 0) {
      this.currentResult = result;
      const saved = await this.isSaved(result.query);
      if (requestId !== this.navRequestId) return;
      this.tooltip?.updateState('showing', result, saved);
    } else {
      const errorCode = response?.ok === false ? response?.error?.code : undefined;
      const errorMessage = response?.ok === false ? response?.error?.message : undefined;
      const notFound = errorCode === 'NOT_FOUND' || (ok && result && result.meanings.length === 0);
      this.tooltip?.updateState(notFound ? 'not-found' : 'error', null, false, errorMessage);
    }
  }

  private clearTimers(): void {
    if (this.lookupTimer !== null) {
      clearTimeout(this.lookupTimer);
      this.lookupTimer = null;
    }
  }

  private async sendMessage<T = unknown>(
    request: MessageRequest,
  ): Promise<MessageResponse<T> | null> {
    try {
      const response = await this.api.runtime.sendMessage(request);
      if (response && typeof response === 'object' && 'ok' in response) {
        return response as MessageResponse<T>;
      }
      return null;
    } catch {
      return null;
    }
  }
}

export function initContentScript(): void {
  if (!isExtensionContext()) return;
  const instance = new EtyrContent();
  void instance.init();
}

if (typeof window !== 'undefined' && window.document && isExtensionContext()) {
  initContentScript();
}