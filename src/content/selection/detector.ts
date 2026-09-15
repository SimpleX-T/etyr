import type { SelectionSnapshot, Settings } from '@shared/types';
import { createId, debounce } from '@shared/utils';
import { isLookupCandidate, getSelectionRect, normalizeSelectionText, isWithinEditableElement } from './validate';

type SelectionCallback = (snapshot: SelectionSnapshot | null) => void;

export class SelectionDetector {
  private callbacks: SelectionCallback[] = [];
  private abortController: AbortController | null = null;
  private isActive = false;
  private lastSnapshot: SelectionSnapshot | null = null;
  
  private settings: Settings;
  private debouncedDetect: { (...args: unknown[]): void; cancel(): void };
  
  private modifiers = {
    alt: false,
    ctrl: false,
    shift: false,
    meta: false,
  };

  constructor(initialSettings: Settings) {
    this.settings = initialSettings;
    this.debouncedDetect = debounce(() => this.detect(false), this.settings.lookupDelayMs);
  }

  updateSettings(newSettings: Settings): void {
    const delayChanged = this.settings.lookupDelayMs !== newSettings.lookupDelayMs;
    this.settings = newSettings;
    
    if (delayChanged) {
      this.debouncedDetect.cancel();
      this.debouncedDetect = debounce(() => this.detect(false), this.settings.lookupDelayMs);
    }
  }

  onSelect(callback: SelectionCallback): () => void {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  start(): void {
    if (this.isActive) return;
    this.isActive = true;

    this.abortController = new AbortController();
    const { signal } = this.abortController;

    document.addEventListener('selectionchange', () => this.onSelectionChange(), { signal });
    document.addEventListener('mousedown', (e) => {
      this.updateModifiers(e);
      if (e.target instanceof Element && e.target.closest('#etyr-tooltip-root')) return;
      this.onSelectionChange();
    }, { signal });
    document.addEventListener('mouseup', (e) => this.updateModifiers(e), { signal });
    document.addEventListener('keydown', (e) => this.updateModifiers(e), { signal });
    document.addEventListener('keyup', (e) => this.updateModifiers(e), { signal });
    document.addEventListener('dblclick', (e) => {
      this.updateModifiers(e);
      if (e.target instanceof Element && e.target.closest('#etyr-tooltip-root')) return;
      if (this.settings.doubleClickLookup) {
        this.debouncedDetect.cancel();
        this.detect(true); // Force lookup bypassing delay/trigger
      }
    }, { signal });
  }

  private updateModifiers(e: MouseEvent | KeyboardEvent) {
    this.modifiers.alt = e.altKey;
    this.modifiers.ctrl = e.ctrlKey;
    this.modifiers.shift = e.shiftKey;
    this.modifiers.meta = e.metaKey;
  }

  destroy(): void {
    this.isActive = false;
    this.debouncedDetect.cancel();
    this.abortController?.abort();
    this.abortController = null;
    this.callbacks = [];
    this.lastSnapshot = null;
  }

  getLastSnapshot(): SelectionSnapshot | null {
    return this.lastSnapshot;
  }

  private onSelectionChange(): void {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      this.debouncedDetect.cancel();
      this.emit(null);
      this.lastSnapshot = null;
      return;
    }

    const text = normalizeSelectionText(selection.toString());
    if (!isLookupCandidate(text)) {
      this.debouncedDetect.cancel();
      this.emit(null);
      this.lastSnapshot = null;
      return;
    }

    this.debouncedDetect();
  }

  private detect(isDoubleClick: boolean = false): void {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      this.emit(null);
      this.lastSnapshot = null;
      return;
    }

    const anchor = selection.anchorNode;
    if (anchor && isWithinEditableElement(anchor)) {
      this.emit(null);
      this.lastSnapshot = null;
      return;
    }

    const text = normalizeSelectionText(selection.toString());
    if (!isLookupCandidate(text)) {
      this.emit(null);
      this.lastSnapshot = null;
      return;
    }

    const rect = getSelectionRect(selection);
    if (!rect) {
      this.emit(null);
      this.lastSnapshot = null;
      return;
    }

    // Settings check
    if (!isDoubleClick) {
      const { autoLookup, triggerKey } = this.settings;
      if (!autoLookup && triggerKey === 'none') {
        this.emit(null);
        this.lastSnapshot = null;
        return; // Auto disabled, and no trigger key set
      }

      if (triggerKey !== 'none') {
        if (!this.modifiers[triggerKey]) {
          this.emit(null);
          this.lastSnapshot = null;
          return; // Required modifier not held
        }
      }
    }

    const range = selection.getRangeAt(0).cloneRange();

    if (
      this.lastSnapshot &&
      this.lastSnapshot.text === text &&
      this.lastSnapshot.range.startContainer === range.startContainer &&
      this.lastSnapshot.range.startOffset === range.startOffset &&
      this.lastSnapshot.range.endContainer === range.endContainer &&
      this.lastSnapshot.range.endOffset === range.endOffset
    ) {
      return;
    }

    const snapshot: SelectionSnapshot = {
      text,
      rect,
      range,
      timestamp: Date.now(),
      requestId: createId(),
    };

    this.lastSnapshot = snapshot;
    this.emit(snapshot);
  }

  private emit(snapshot: SelectionSnapshot | null): void {
    for (const cb of this.callbacks) {
      cb(snapshot);
    }
  }
}
