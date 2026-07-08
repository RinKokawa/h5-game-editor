/**
 * Core: Undo/Redo history stack.
 *
 * Pairs with Command Bus. The HistoryStack owns the executed commands and
 * exposes undo()/redo() based on a cursor. Coalescing is delegated to
 * individual Command implementations.
 */
export {};
