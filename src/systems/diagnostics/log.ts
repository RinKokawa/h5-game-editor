/**
 * Diagnostics: log subsystem.
 *
 * Tiny pub-sub that mirrors every emitted line to the devtools console
 * AND fans it out to subscribers (e.g. the Zustand console mirror in
 * `state/consoleStore`, which is what `ConsolePanel` reads).
 *
 * This is the single sanctioned way to surface editor events to the
 * user. Direct `console.info/warn/error` calls in editor code are
 * reserved for developer-facing debug output (missing i18n keys, etc.).
 *
 * Lines are NOT buffered. If a log fires before any subscriber exists,
 * it's still mirrored to devtools but no panel shows it. This is fine
 * for v0.1 — `EditorShell` wires the subscription on mount, before any
 * user action can fire.
 */

import type { LogLevel, LogLine } from '@local-types/log';

type Listener = (line: LogLine) => void;

const listeners = new Set<Listener>();

const mirrorToDevtools = (level: LogLevel, text: string): void => {
  if (level === 'info') console.info(text);
  else if (level === 'warn') console.warn(text);
  else console.error(text);
};

const emit = (level: LogLevel, text: string): void => {
  mirrorToDevtools(level, text);

  const line: LogLine = { level, text, timestamp: Date.now() };
  for (const cb of listeners) {
    try {
      cb(line);
    } catch {
      // A buggy listener must never crash the editor. Errors here are
      // intentionally swallowed; devtools still got the original line.
    }
  }
};

export const log = {
  info: (text: string): void => emit('info', text),
  warn: (text: string): void => emit('warn', text),
  error: (text: string): void => emit('error', text),
} as const;

export const subscribeLog = (cb: Listener): (() => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
