/**
 * Console store — Zustand mirror of the log subsystem.
 *
 * `panels/` cannot import from `systems/`, so the log subscription
 * lives in `EditorShell` (`app/`), which IS allowed to import from
 * both. It subscribes to `subscribeLog` and writes each line here.
 * `ConsolePanel` reads from this store.
 *
 * Capped at `MAX_LINES` to keep React re-renders bounded.
 */

import { create } from 'zustand';

import type { LogLine } from '@local-types/log';

export const MAX_LINES = 200;

interface ConsoleState {
  readonly lines: ReadonlyArray<LogLine>;
  readonly push: (line: LogLine) => void;
  readonly clear: () => void;
}

export const useConsoleStore = create<ConsoleState>((set) => ({
  lines: [],
  push: (line) =>
    set((state) => {
      const next = [...state.lines, line];
      return { lines: next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next };
    }),
  clear: () => set({ lines: [] }),
}));
