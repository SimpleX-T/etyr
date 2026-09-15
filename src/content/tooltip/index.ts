import type { DictionaryResult, SelectionSnapshot, TooltipState } from '@shared/types';
import type { ResolvedTheme } from '@shared/utils';
import { TooltipController } from './TooltipController';

export { TooltipController } from './TooltipController';
export { TooltipRoot } from './TooltipRoot';
export { calculatePosition } from './position';

export interface TooltipBridgeOptions {
  onDismiss: () => void;
  onBookmark: () => void;
  onPronounce: () => void;
  onDisableSite: () => void;
  showPronunciation?: boolean;
  styles?: string;
}

export interface TooltipBridge {
  show(snapshot: SelectionSnapshot): void;
  updateState(state: TooltipState, result: DictionaryResult | null, isSaved: boolean, errorMessage?: string): void;
  hide(): void;
  reposition(): void;
  setTheme(theme: ResolvedTheme): void;
  attachViewportListeners(): void;
  destroy(): void;
}

export function initTooltip(options: TooltipBridgeOptions): TooltipBridge {
  const controller = new TooltipController({
    onDismiss: options.onDismiss,
    onBookmark: options.onBookmark,
    onPronounce: options.onPronounce,
    onDisableSite: options.onDisableSite,
    showPronunciation: options.showPronunciation ?? true,
    styles: options.styles ?? '',
  });

  return {
    show(snapshot) {
      controller.show(snapshot.text, snapshot.rect);
    },
    updateState(state, result, isSaved, errorMessage) {
      controller.updateState(state, result, isSaved, errorMessage);
    },
    hide() {
      controller.hide();
    },
    reposition() {
      controller.reposition();
    },
    setTheme(theme) {
      controller.setTheme(theme);
    },
    attachViewportListeners() {
      controller.attachViewportListeners();
    },
    destroy() {
      controller.destroy();
    },
  };
}