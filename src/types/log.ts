/**
 * Log line types — the shape of editor-emitted log records.
 *
 * Lives in `types/` (the lowest layer) so both `state/` (which holds
 * the Zustand mirror) and `systems/diagnostics/` (which owns the
 * publisher) can share the type without `state → systems` becoming
 * a forbidden edge.
 */

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogLine {
  readonly level: LogLevel;
  readonly text: string;
  /** Epoch milliseconds. */
  readonly timestamp: number;
}
