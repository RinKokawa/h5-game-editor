/**
 * Document I/O — save / load the currently-active Document.
 *
 * Step 18 scoping: the active Document lives at
 * `<workspace>/documents/<activeDocId>.json`. Save writes to that
 * path; Load re-reads that path (a manual "revert to disk" gesture,
 * not a dialog). Both operations require a workspace to be active —
 * there is no "untitled" / localStorage fallback in Step 18: the
 * launcher is the only legal way to put a document on screen, and
 * the File menu's Save / Load become no-ops (with a logged error)
 * when called outside the editor phase.
 *
 * The decision to delete the localStorage fallback is deliberate
 * (see CLAUDE.md §13 / Step 18). The pre-Step-18 code was a dev
 * convenience; with a real launcher in place, "no workspace, no
 * document" is the correct rule rather than a magic last-snapshot.
 *
 * Outcomes are discriminated unions so callers (menu, shortcuts,
 * console) can show useful messages instead of catching exceptions.
 */

import {
  deserializeDocument,
  serializeDocument,
  type LoadedDocument,
  type SerializedDocumentV1,
} from '@core/serialization/index';
import { asLayerId } from '@editor/map/schema/ids';
import { useDocumentStore } from '@state/documentStore';
import { useWorkspaceStore } from '@state/workspaceStore';

import { isElectron, writeDocumentInWorkspace, readDocumentInWorkspace } from './electronBridge';

export type SaveOutcome =
  | { readonly ok: true; readonly bytes: number; readonly path: string }
  | { readonly ok: false; readonly error: string };

export type LoadOutcome =
  | { readonly ok: true; readonly layerCount: number; readonly path: string }
  | { readonly ok: false; readonly error: string };

/**
 * Serialize the current Document and write it to
 * `<workspace>/documents/<activeDocId>.json`. The save is
 * workspace-scoped — no dialog, no Save As. A future "Export to…
 * dialog" can layer on top without changing this signature.
 */
export const saveDocument = async (): Promise<SaveOutcome> => {
  try {
    if (!isElectron()) {
      return { ok: false, error: 'Document I/O requires Electron (no window.h5)' };
    }
    const ws = useWorkspaceStore.getState();
    if (ws.phase !== 'editor' || !ws.current || !ws.activeDocId) {
      return { ok: false, error: 'No active workspace — return to the launcher first' };
    }

    const state = useDocumentStore.getState();
    const serialized: SerializedDocumentV1 = serializeDocument({
      meta: state.meta,
      layers: state.layers,
      entities: state.entities,
      colliders: state.colliders,
    });
    const json = JSON.stringify(serialized, null, 2);
    const targetPath = `${ws.current.path}/documents/${ws.activeDocId}.json`;
    const result = await writeDocumentInWorkspace(ws.current.path, ws.activeDocId, json);
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, bytes: result.bytes, path: targetPath };
  } catch (err) {
    return { ok: false, error: errMsg(err) };
  }
};

/**
 * Re-read the workspace's active Document from disk. Discards any
 * in-memory unsaved changes. Called by File ▸ Load and the Ctrl+O
 * shortcut. There's no dialog — the path is fixed by the workspace.
 */
export const loadDocument = async (): Promise<LoadOutcome> => {
  try {
    if (!isElectron()) {
      return { ok: false, error: 'Document I/O requires Electron (no window.h5)' };
    }
    const ws = useWorkspaceStore.getState();
    if (ws.phase !== 'editor' || !ws.current || !ws.activeDocId) {
      return { ok: false, error: 'No active workspace — return to the launcher first' };
    }

    const file = await readDocumentInWorkspace(ws.current.path, ws.activeDocId);
    if (!file.ok) return { ok: false, error: file.error };

    let parsed: unknown;
    try {
      parsed = JSON.parse(file.text);
    } catch (err) {
      return { ok: false, error: `Document JSON is malformed: ${errMsg(err)}` };
    }
    const loaded: LoadedDocument = deserializeDocument(parsed);
    applyLoaded(loaded);
    const targetPath = `${ws.current.path}/documents/${ws.activeDocId}.json`;
    return { ok: true, layerCount: loaded.layers.length, path: targetPath };
  } catch (err) {
    return { ok: false, error: errMsg(err) };
  }
};

const applyLoaded = (loaded: LoadedDocument): void => {
  // Wipe selection + history first so they don't bleed across
  // loads. The Document store fields below overwrite the
  // resetEditorState() defaults wholesale.
  useWorkspaceStore.getState().resetEditorState();
  useDocumentStore.setState({
    meta: loaded.meta,
    layers: loaded.layers,
    entities: loaded.entities,
    colliders: loaded.colliders,
    activeLayerId: asLayerId(loaded.activeLayerId),
  });
};

const errMsg = (err: unknown): string => (err instanceof Error ? err.message : String(err));
