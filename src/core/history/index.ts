/**
 * Core: Undo/Redo history stack.
 *
 * The implementation lives in `core/command/HistoryStack.ts` (paired
 * with `CommandBus`). This barrel re-exports the public surface so
 * consumers can import from the canonical location
 * `@core/history` instead of reaching into `core/command/`.
 */

export { HistoryStack } from '@core/command/HistoryStack';