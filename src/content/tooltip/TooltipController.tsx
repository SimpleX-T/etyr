import { createRoot, type Root } from 'react-dom/client';
import type { DictionaryResult, TooltipState } from '@shared/types';
import type { ResolvedTheme } from '@shared/utils';
import { TooltipRoot, type TooltipRootProps } from './TooltipRoot';
import { calculatePosition } from './position';
import { getSelectionRect } from '../selection/validate';
import type { TooltipNav, TooltipNavItem } from '.';

const ROOT_ID = 'etyr-tooltip-root';
const TOOLTIP_WIDTH = 300;
const TOOLTIP_ESTIMATED_HEIGHT = 220;
const TOOLTIP_MAX_HEIGHT = 360;

type RenderState = TooltipRootProps['state'];

interface ControllerOptions {
  onDismiss: () => void;
  onBookmark: () => void;
  onPronounce: () => void;
  onDisableSite: () => void;
  onOpenWord?: (query: string, label: string) => void;
  onBack?: () => void;
  onOpenSidePanel?: (word: string) => void;
  showPronunciation: boolean;
  styles: string;
}

interface TooltipProps {
  query: string;
  result: DictionaryResult | null;
  state: RenderState;
  isSaved: boolean;
  errorMessage?: string;
  nav: TooltipNav | null;
}

export class TooltipController {
  private container: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private reactRootNode: HTMLDivElement | null = null;
  private root: Root | null = null;
  private rafId = 0;
  private isShown = false;
  private viewportBound = false;

  private selectionRect: DOMRect | null = null;
  private currentPosition: { top: number; left: number } | null = null;
  private renderedSize: { width: number; height: number } | null = null;

  private props: TooltipProps | null = null;
  private theme: ResolvedTheme = 'dark';

  constructor(private readonly options: ControllerOptions) {}

  show(query: string, rect: DOMRect): void {
    const normalized = this.normalizeRect(rect);
    if (!normalized) return;

    this.selectionRect = normalized;
    this.isShown = true;
    this.props = {
      query,
      result: null,
      state: 'loading',
      isSaved: false,
      nav: null,
    };
    this.ensureMounted();
    this.attachViewportListeners();

    this.currentPosition = this.computeEstimatedPosition(normalized);
    this.paint();

    // Correct against real rendered size after the next paint
    this.scheduleMeasure();
  }

  hide(): void {
    this.isShown = false;
    this.selectionRect = null;
    this.currentPosition = null;
    this.renderedSize = null;
    this.props = null;

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }

    this.detachViewportListeners();
    this.root?.render(null);
  }

  updateState(state: TooltipState, result: DictionaryResult | null, isSaved: boolean, errorMessage?: string): void {
    if (!this.isShown || !this.props) return;

    const renderState = this.toRenderState(state);
    if (!renderState) return;

    this.props = { ...this.props, state: renderState, result, isSaved, errorMessage };
    this.paint();

    // Height may have changed (e.g. error vs. definition list)
    this.scheduleMeasure();
  }

  setNavPath(path: TooltipNavItem[], current: TooltipNavItem | null): void {
    if (!this.isShown || !this.props) return;
    this.props = {
      ...this.props,
      nav: path.length > 0 && current ? { path, current } : null,
    };
    this.paint();
  }

  setTheme(theme: ResolvedTheme): void {
    this.theme = theme;
    if (this.container) {
      this.container.dataset.etyrTheme = theme;
    }
  }

  reposition(): void {
    if (!this.isShown) return;

    const selection = window.getSelection();
    const freshRect =
      selection && selection.rangeCount > 0 ? getSelectionRect(selection) : null;

    const rect = freshRect ?? this.selectionRect;
    if (!rect) return;

    const normalized = this.normalizeRect(rect);
    if (!normalized) return;

    this.selectionRect = normalized;
    this.currentPosition = this.computeEstimatedPosition(normalized);
    this.paint();
    this.scheduleMeasure();
  }

  attachViewportListeners(): void {
    if (this.viewportBound) return;
    this.viewportBound = true;
    window.addEventListener('scroll', this.onViewportChange, true);
    window.addEventListener('resize', this.onViewportChange);
  }

  detachViewportListeners(): void {
    if (!this.viewportBound) return;
    this.viewportBound = false;
    window.removeEventListener('scroll', this.onViewportChange, true);
    window.removeEventListener('resize', this.onViewportChange);
  }

  destroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }

    this.detachViewportListeners();
    this.root?.unmount();
    this.root = null;

    if (this.container?.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
    this.container = null;
    this.props = null;
    this.selectionRect = null;
    this.currentPosition = null;
    this.renderedSize = null;
    this.isShown = false;
  }

  private readonly onViewportChange = (): void => {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      this.reposition();
    });
  };

  private ensureMounted(): void {
    if (this.container && this.root) return;

    let container = document.getElementById(ROOT_ID) as HTMLDivElement | null;
    if (!container) {
      container = document.createElement('div');
      container.id = ROOT_ID;
      document.documentElement.appendChild(container);
    }
    container.dataset.etyrTheme = this.theme;

    if (!this.shadowRoot) {
      this.shadowRoot = container.attachShadow({ mode: 'open' });
      
      const styleSheet = document.createElement('style');
      styleSheet.textContent = this.options.styles;
      this.shadowRoot.appendChild(styleSheet);
      
      this.reactRootNode = document.createElement('div');
      this.reactRootNode.className = 'etyr-shadow-root-container';
      this.shadowRoot.appendChild(this.reactRootNode);
    }

    this.container = container;
    this.root = this.root ?? createRoot(this.reactRootNode!);
  }

  private paint(): void {
    const { root, props, currentPosition } = this;
    if (!root || !props) return;

    const style: React.CSSProperties = {
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 2147483647,
      width: TOOLTIP_WIDTH,
      transform: currentPosition
        ? `translate(${currentPosition.left}px, ${currentPosition.top}px)`
        : 'translate(-10000px, -10000px)',
    };

    root.render(
      <div style={style} className="etyr-tooltip-anchor">
        <TooltipRoot
          query={props.query}
          result={props.result}
          state={props.state}
          isSaved={props.isSaved}
          errorMessage={props.errorMessage}
          nav={props.nav}
          showPronunciation={this.options.showPronunciation}
          onBookmark={this.options.onBookmark}
          onPronounce={this.options.onPronounce}
          onDismiss={this.options.onDismiss}
          onDisableSite={this.options.onDisableSite}
          onOpenWord={this.options.onOpenWord}
          onBack={this.options.onBack}
          onOpenSidePanel={this.options.onOpenSidePanel}
        />
      </div>,
    );
  }

  private computeEstimatedPosition(rect: DOMRect): { top: number; left: number } {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const height = this.renderedSize?.height ?? TOOLTIP_ESTIMATED_HEIGHT;

    const tooltipRect = {
      width: TOOLTIP_WIDTH,
      height,
      top: 0,
      left: 0,
      right: TOOLTIP_WIDTH,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;

    const pos = calculatePosition(rect, tooltipRect, viewportWidth, viewportHeight);
    return { top: pos.top, left: pos.left };
  }

  private scheduleMeasure(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);

    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      if (!this.isShown || !this.container || !this.selectionRect) return;

      const realRect = this.container.getBoundingClientRect();
      const width = realRect.width || TOOLTIP_WIDTH;
      const height = Math.min(realRect.height, TOOLTIP_MAX_HEIGHT);

      if (
        this.renderedSize &&
        Math.abs(this.renderedSize.width - width) < 1 &&
        Math.abs(this.renderedSize.height - height) < 1
      ) {
        return;
      }

      this.renderedSize = { width, height };

      const pos = this.computeEstimatedPosition(this.selectionRect);
      this.currentPosition = pos;
      this.paint();

      if (height >= TOOLTIP_MAX_HEIGHT && this.reactRootNode) {
        this.reactRootNode.style.maxHeight = `${TOOLTIP_MAX_HEIGHT}px`;
        this.reactRootNode.style.overflowY = 'auto';
      }
    });
  }

  private toRenderState(state: TooltipState): RenderState | null {
    switch (state) {
      case 'loading':
      case 'showing':
      case 'error':
      case 'not-found':
        return state;
      default:
        return null;
    }
  }

  private normalizeRect(rect: DOMRect): DOMRect | null {
    if (Number.isNaN(rect.left) || Number.isNaN(rect.top)) return null;
    if (rect.width < 0 || rect.height < 0) return null;
    return rect;
  }
}