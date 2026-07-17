/**
 * Workspace I/O — renderer-side facade over the workspace IPC surface.
 *
 * Three operations the launcher / shell needs:
 *
 *   1. createWorkspace(name) — prompt for a folder, bootstrap the
 *      directory tree, return the WorkspaceRef.
 *
 *   2. openExistingWorkspace(path) — verify the folder is a valid
 *      workspace (has `h5-editor.json` with v1 schema), then return
 *      the ref + active doc id so the caller can flip the editor
 *      phase.
 *
 *   3. loadActiveDocument(path, docId) — read
 *      `<path>/documents/<docId>.json` from disk and apply it to the
 *      document store. The lifecycle (state reset, history clear)
 *      lives here too so callers can't forget a step.
 *
 * Saving the active document is in `documentIO.ts` — it's the same
 * renderer path that the editor uses day-to-day, just workspace-
 * scoped. Keeping save out of this file avoids two places writing
 * to the same file.
 *
 * Errors surface as discriminated unions — never thrown — so the
 * launcher / menu can render a useful message without try/catch.
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

import {
  createWorkspace as createWorkspaceIpc,
  isElectron,
  pickFolder,
  readDocumentInWorkspace,
  statWorkspace,
} from './electronBridge';

import type { WorkspaceRef } from '@core/workspace/schema';
import type { DocumentId } from '@editor/map/schema/ids';

export type WorkspaceOutcome<T> =
  ({ readonly ok: true } & T) | { readonly ok: false; readonly error: string };

const errMsg = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/**
 * Prompt the OS folder picker, then bootstrap a brand-new workspace
 * at the chosen path. Returns the new ref + the active doc id so
 * the caller can enter the editor immediately.
 */
export const createNewWorkspace = async (
  name: string,
): Promise<WorkspaceOutcome<{ ref: WorkspaceRef; activeDocId: DocumentId }>> => {
  try {
    if (!isElectron()) {
      return { ok: false, error: 'Workspaces are Electron-only (no window.h5)' };
    }
    const folderPath = await pickFolder();
    if (!folderPath) return { ok: false, error: 'Folder selection cancelled' };

    const trimmed = name.trim();
    if (trimmed.length === 0) return { ok: false, error: 'Workspace name is empty' };

    const create = await createWorkspaceIpc(folderPath, trimmed);
    if (!create.ok) return { ok: false, error: create.error };

    const stat = await statWorkspace(folderPath);
    if (!stat.ok) return { ok: false, error: stat.error };

    const ref: WorkspaceRef = { path: folderPath, name: stat.name };
    const activeDocId = stat.activeDocId as DocumentId;
    return { ok: true, ref, activeDocId };
  } catch (err) {
    return { ok: false, error: errMsg(err) };
  }
};

/**
 * Verify the given folder is a valid workspace and return its
 * identity. The caller can then call {@link loadActiveDocument}
 * (or skip it if the editor doesn't need the document yet).
 */
export const openExistingWorkspace = async (
  path: string,
): Promise<WorkspaceOutcome<{ ref: WorkspaceRef; activeDocId: DocumentId }>> => {
  try {
    if (!isElectron()) {
      return { ok: false, error: 'Workspaces are Electron-only (no window.h5)' };
    }
    const stat = await statWorkspace(path);
    if (!stat.ok) return { ok: false, error: stat.error };

    const ref: WorkspaceRef = { name: stat.name, path };
    const activeDocId = stat.activeDocId as DocumentId;
    return { ok: true, ref, activeDocId };
  } catch (err) {
    return { ok: false, error: errMsg(err) };
  }
};

/**
 * Read the active document from the workspace and apply it to the
 * document store. The store update is atomic (single setState) so
 * React only sees one transition. Selection + history are reset
 * because loading a new document should not be undoable.
 */
export const loadActiveDocument = async (
  folderPath: string,
  docId: DocumentId,
): Promise<WorkspaceOutcome<{ layerCount: number }>> => {
  try {
    if (!isElectron()) {
      return { ok: false, error: 'Workspaces are Electron-only (no window.h5)' };
    }
    const file = await readDocumentInWorkspace(folderPath, docId);
    if (!file.ok) return { ok: false, error: file.error };

    let parsed: unknown;
    try {
      parsed = JSON.parse(file.text);
    } catch (err) {
      return { ok: false, error: `Document JSON is malformed: ${errMsg(err)}` };
    }

    const loaded: LoadedDocument = deserializeDocument(parsed);
    // Wipe selection + history first so they don't bleed across
    // workspaces. The Document store fields below overwrite the
    // reset() defaults wholesale, so we don't call documentStore.reset().
    useWorkspaceStore.getState().resetEditorState();
    useDocumentStore.setState({
      meta: loaded.meta,
      layers: loaded.layers,
      entities: loaded.entities,
      colliders: loaded.colliders,
      activeLayerId: asLayerId(loaded.activeLayerId),
    });
    useWorkspaceStore.setState({ activeDocId: docId });

    return { ok: true, layerCount: loaded.layers.length };
  } catch (err) {
    return { ok: false, error: errMsg(err) };
  }
};

/**
 * Re-export of the serializer so `documentIO.ts` can share the same
 * wire format for save without re-importing `@core/serialization`.
 * Pure re-export — nothing runtime-level added.
 */
export const serializeActiveDocument = (): SerializedDocumentV1 => {
  const state = useDocumentStore.getState();
  return serializeDocument({
    meta: state.meta,
    layers: state.layers,
    entities: state.entities,
    colliders: state.colliders,
  });
};
