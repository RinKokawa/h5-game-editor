/**
 * History store — Zustand mirror of the CommandBus undo/redo state.
 *
 * The Bus itself is plain TypeScript; React components subscribe to
 * this store instead so re-renders only happen on history changes
 * (not on every Document mutation). The store is kept in sync by a
 * one-shot subscriber installed at app startup — see
 * `installHistorySubscriber` below.
 */

import { create } from 'zustand';

import { commandBus } from '@core/command/commandBusSingleton';

import type { Unsubscribe } from '@core/event/EventEmitter';

export interface HistoryState {
  readonly canUndo: boolean;
  readonly canRedo: boolean;

  readonly undo: () => void;
  readonly redo: () => void;
}

const initial = {
  canUndo: commandBus.canUndo(),
  canRedo: commandBus.canRedo(),
};

export const useHistoryStore = create<HistoryState>(() => ({
  ...initial,
  undo: () => commandBus.undo(),
  redo: () => commandBus.redo(),
}));

let installed = false;
let unsubscribe: Unsubscribe | null = null;

/**
 * Wire the store to the CommandBus. Idempotent — repeated calls are
 * no-ops. The {@link EditorShell} invokes this once on mount.
 */
export const installHistorySubscriber = (): void => {
  if (installed) return;
  installed = true;
  unsubscribe = commandBus.subscribe(() => {
    useHistoryStore.setState({
      canUndo: commandBus.canUndo(),
      canRedo: commandBus.canRedo(),
    });
  });
};

/** Tear down the subscriber. The shell calls this on unmount. */
export const uninstallHistorySubscriber = (): void => {
  unsubscribe?.();
  unsubscribe = null;
  installed = false;
};
