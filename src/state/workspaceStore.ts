/**
 * Workspace state — the currently-active workspace + which phase of
 * the app we're in.
 *
 * Two phases:
 *   - `launcher`: render `<Launcher/>`. The user picks (or creates) a
 *     workspace on disk; nothing else is mounted (no Document, no
 *     PixiRenderer, no history).
 *   - `editor`: a workspace is open. Mount `<EditorShell/>` against
 *     `current` and `activeDocId`.
 *
 * The whole store is UI-only state. The Document itself lives in
 * `useDocumentStore` and the on-disk mirror lives in
 * `<workspace>/documents/<activeDocId>.json`. The workspaceStore
 * only knows the path and the active-doc id — never reads tiles.
 *
 * Recents persistence lives in `systems/persistence/recentWorkspaces.ts`
 * — NOT here. `state/` cannot import `systems/` per ESLint, so this
 * store only exposes the in-memory mirror + a setter; the `<Launcher/>`
 * pulls them together by calling `loadRecents()` on mount and
 * `pushRecent()` / `removeRecent()` on click.
 *
 * `resetEditorState` orchestrates a full editor-side wipe
 * (selection + history + Document) so callers — including `leave`
 * and `loadActiveDocument` — never forget a step.
 */

import { create } from 'zustand';

import { commandBus } from '@core/command/commandBusSingleton';
import { asDocumentId } from '@editor/map/schema/ids';
import { useDocumentStore } from '@state/documentStore';
import { useSelectionStore } from '@state/selectionStore';

import type { RecentEntry, WorkspaceRef } from '@core/workspace/schema';
import type { DocumentId } from '@editor/map/schema/ids';

export type WorkspacePhase = 'launcher' | 'editor';

export interface WorkspaceState {
  readonly phase: WorkspacePhase;
  readonly current: WorkspaceRef | null;
  readonly activeDocId: DocumentId | null;
  readonly recents: ReadonlyArray<RecentEntry>;

  /**
   * Move into the editor for the given workspace. Caller is
   * responsible for having already created/loaded the on-disk files;
   * this store just flips the phase.
   */
  readonly enter: (ref: WorkspaceRef, activeDocId: DocumentId) => void;

  /** Back to the launcher. Resets selection + history + Document. */
  readonly leave: () => void;

  /**
   * Wipe editor-side state: clear selection, clear command history,
   * reset the Document to its seed. Idempotent and safe to call
   * from any phase. Does not touch on-disk files.
   */
  readonly resetEditorState: () => void;

  /** Replace the in-memory recents mirror (called by Launcher on load). */
  readonly setRecents: (entries: ReadonlyArray<RecentEntry>) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  phase: 'launcher',
  current: null,
  activeDocId: null,
  recents: [],

  enter: (ref, activeDocId) => {
    set({ phase: 'editor', current: ref, activeDocId: asDocumentId(activeDocId) });
  },

  leave: () => {
    useSelectionStore.getState().clear();
    commandBus.clearHistory();
    useDocumentStore.getState().reset();
    set({ phase: 'launcher', current: null, activeDocId: null });
  },

  resetEditorState: () => {
    useSelectionStore.getState().clear();
    commandBus.clearHistory();
    useDocumentStore.getState().reset();
  },

  setRecents: (entries) => {
    set({ recents: entries });
  },
}));
