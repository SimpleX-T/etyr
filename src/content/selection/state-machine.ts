import type { SelectionSnapshot } from '@shared/types';

export type MachineState =
  | 'IDLE'
  | 'SELECTION_DETECTED'
  | 'WAITING'
  | 'RESOLVING'
  | 'SHOWING'
  | 'DISMISSED';

export type MachineEvent =
  | { type: 'selection_change'; snapshot: SelectionSnapshot }
  | { type: 'accepted' }
  | { type: 'timer_expire' }
  | { type: 'resolve_start' }
  | { type: 'resolve_complete' }
  | { type: 'resolve_error' }
  | { type: 'dismiss' }
  | { type: 'escape' }
  | { type: 'navigation' };

type StateChangeCallback = (
  state: MachineState,
  requestId: string | null,
  snapshot: SelectionSnapshot | null,
) => void;

interface Transition {
  target: MachineState;
  guard?: (ctx: MachineContext) => boolean;
}

interface MachineContext {
  requestId: string | null;
  snapshot: SelectionSnapshot | null;
  activeRequestId: number;
}

const RESET_EVENTS: MachineEvent['type'][] = ['dismiss', 'escape', 'navigation'];

const TRANSITIONS: Record<MachineState, Partial<Record<MachineEvent['type'], Transition>>> = {
  IDLE: {
    selection_change: {
      target: 'SELECTION_DETECTED',
      guard: (ctx) => ctx.snapshot !== null,
    },
  },
  SELECTION_DETECTED: {
    selection_change: {
      target: 'SELECTION_DETECTED',
      guard: (ctx) => ctx.snapshot !== null,
    },
    accepted: { target: 'WAITING' },
    dismiss: { target: 'IDLE' },
    escape: { target: 'IDLE' },
    navigation: { target: 'IDLE' },
  },
  WAITING: {
    selection_change: {
      target: 'SELECTION_DETECTED',
      guard: (ctx) => ctx.snapshot !== null,
    },
    timer_expire: { target: 'RESOLVING' },
    dismiss: { target: 'IDLE' },
    escape: { target: 'IDLE' },
    navigation: { target: 'IDLE' },
  },
  RESOLVING: {
    selection_change: {
      target: 'SELECTION_DETECTED',
      guard: (ctx) => ctx.snapshot !== null,
    },
    resolve_start: { target: 'RESOLVING' },
    resolve_complete: { target: 'SHOWING' },
    resolve_error: { target: 'IDLE' },
    dismiss: { target: 'IDLE' },
    escape: { target: 'IDLE' },
    navigation: { target: 'IDLE' },
  },
  SHOWING: {
    selection_change: {
      target: 'SELECTION_DETECTED',
      guard: (ctx) => ctx.snapshot !== null,
    },
    dismiss: { target: 'IDLE' },
    escape: { target: 'IDLE' },
    navigation: { target: 'IDLE' },
  },
  DISMISSED: {
    selection_change: {
      target: 'SELECTION_DETECTED',
      guard: (ctx) => ctx.snapshot !== null,
    },
  },
};

export class SelectionStateMachine {
  private state: MachineState = 'IDLE';
  private ctx: MachineContext = {
    requestId: null,
    snapshot: null,
    activeRequestId: 0,
  };
  private stateCallbacks: StateChangeCallback[] = [];

  getState(): MachineState {
    return this.state;
  }

  getRequestId(): string | null {
    return this.ctx.requestId;
  }

  getSnapshot(): SelectionSnapshot | null {
    return this.ctx.snapshot;
  }

  onStateChange(callback: StateChangeCallback): () => void {
    this.stateCallbacks.push(callback);
    return () => {
      this.stateCallbacks = this.stateCallbacks.filter(cb => cb !== callback);
    };
  }

  dispatch(event: MachineEvent): MachineState {
    const transitions = TRANSITIONS[this.state];
    const transition = transitions[event.type];

    if (!transition) return this.state;

    let requestIdChanged = false;

    if (event.type === 'selection_change') {
      const prevRequestId = this.ctx.requestId;
      this.ctx.snapshot = event.snapshot;
      this.ctx.requestId = event.snapshot.requestId;
      this.ctx.activeRequestId++;
      requestIdChanged = event.snapshot.requestId !== prevRequestId;
    }

    if (transition.guard && !transition.guard(this.ctx)) {
      return this.state;
    }

    // Clear snapshot on reset transitions
    if (RESET_EVENTS.includes(event.type)) {
      this.ctx.snapshot = null;
      this.ctx.requestId = null;
    }

    const previousState = this.state;
    this.state = transition.target;

    // Emit on real state changes AND on re-detection of a fresh selection
    // while the machine is already in the same state (e.g. WAITING). Without
    // this, downstream handlers (lookup timer) would never restart.
    if (previousState !== this.state || requestIdChanged) {
      this.emitStateChange();
    }

    return this.state;
  }

  reset(): void {
    this.state = 'IDLE';
    this.ctx = {
      requestId: null,
      snapshot: null,
      activeRequestId: 0,
    };
    this.emitStateChange();
  }

  getActiveRequestId(): number {
    return this.ctx.activeRequestId;
  }

  isActiveRequestId(requestId: string): boolean {
    return this.ctx.requestId === requestId;
  }

  private emitStateChange(): void {
    for (const cb of this.stateCallbacks) {
      cb(this.state, this.ctx.requestId, this.ctx.snapshot);
    }
  }
}