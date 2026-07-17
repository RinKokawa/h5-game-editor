/**
 * Electron preload — runs in the renderer's isolated world with
 * limited Node access. The only thing it does is hand the renderer a
 * typed surface via `contextBridge` — the implementation bodies live
 * in main.ts so the renderer cannot reach the filesystem directly.
 *
 * The exposed shape covers two domains:
 *   - Document I/O (existing) — open/save dialogs + raw read/write of
 *     a JSON file chosen via dialog. Free-form: the renderer picks
 *     any path.
 *   - Workspace I/O (Step 18) — folder-based persistence. The main
 *     process owns the schema location (`<folder>/h5-editor.json`,
 *     `<folder>/documents/<id>.json`) so the renderer doesn't need to
 *     compose them. Recents are file-locked inside the userData
 *     directory.
 *
 * Security stance:
 *   - contextIsolation: true (default; enforce)
 *   - nodeIntegration: false (default; enforce)
 *   - sandbox: true (default; enforce)
 *   - Renderer only sees the typed surface below.
 */

import { contextBridge, ipcRenderer } from 'electron';

/**
 * The full surface area the preload hands to the renderer.
 *
 * Declared as an explicit interface (not derived via `typeof api`)
 * because the renderer's `electronBridge.ts` re-declares the same
 * structural shape — keeping it explicit lets both sides share the
 * same type without one file importing the other across the
 * src/ ↔ electron/ project boundary.
 *
 * Workspace handlers return their outcomes as discriminated unions
 * `{ ok: true, ... } | { ok: false, error: string }` so callers can
 * render a useful error without throwing.
 */
export interface H5Bridge {
  // Document I/O (pre-Step 18)
  readonly openDialog: () => Promise<string | null>;
  readonly saveAsDialog: (defaultName?: string) => Promise<string | null>;
  readonly readJson: (
    filePath: string,
  ) => Promise<{ ok: true; text: string } | { ok: false; error: string }>;
  readonly writeJson: (
    filePath: string,
    text: string,
  ) => Promise<{ ok: true; bytes: number } | { ok: false; error: string }>;

  // Workspace I/O (Step 18)
  readonly pickFolder: () => Promise<string | null>;
  readonly createWorkspace: (
    folderPath: string,
    name: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  readonly statWorkspace: (
    folderPath: string,
  ) => Promise<
    | { ok: true; name: string; activeDocId: string }
    | { ok: false; error: string }
  >;
  readonly readDocumentInWorkspace: (
    folderPath: string,
    docId: string,
  ) => Promise<{ ok: true; text: string } | { ok: false; error: string }>;
  readonly writeDocumentInWorkspace: (
    folderPath: string,
    docId: string,
    text: string,
  ) => Promise<{ ok: true; bytes: number } | { ok: false; error: string }>;
  readonly listDocumentsInWorkspace: (
    folderPath: string,
  ) => Promise<
    { ok: true; entries: Array<{ id: string; name: string }> } | { ok: false; error: string }
  >;

  // Recents (lives in userData; main process owns the path)
  readonly loadRecents: () => Promise<
    { ok: true; entries: Array<{ path: string; name: string; lastOpenedAt: number }> } | {
      ok: false;
      error: string;
    }
  >;
  readonly saveRecents: (
    entries: Array<{ path: string; name: string; lastOpenedAt: number }>,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;

  // Window chrome (OS title bar) — see `window:setTitle` in main.ts.
  readonly setWindowTitle: (title: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}

const api: H5Bridge = {
  openDialog: (): Promise<string | null> => ipcRenderer.invoke('dialog:open'),
  saveAsDialog: (defaultName?: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:saveAs', defaultName),
  readJson: (
    filePath: string,
  ): Promise<{ ok: true; text: string } | { ok: false; error: string }> =>
    ipcRenderer.invoke('fs:readJson', filePath),
  writeJson: (
    filePath: string,
    text: string,
  ): Promise<{ ok: true; bytes: number } | { ok: false; error: string }> =>
    ipcRenderer.invoke('fs:writeJson', filePath, text),

  pickFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:pickFolder'),
  createWorkspace: (folderPath: string, name: string) =>
    ipcRenderer.invoke('workspace:create', folderPath, name),
  statWorkspace: (folderPath: string) => ipcRenderer.invoke('workspace:stat', folderPath),
  readDocumentInWorkspace: (folderPath: string, docId: string) =>
    ipcRenderer.invoke('workspace:readDocument', folderPath, docId),
  writeDocumentInWorkspace: (folderPath: string, docId: string, text: string) =>
    ipcRenderer.invoke('workspace:writeDocument', folderPath, docId, text),
  listDocumentsInWorkspace: (folderPath: string) =>
    ipcRenderer.invoke('workspace:listDocuments', folderPath),

  loadRecents: () => ipcRenderer.invoke('recents:load'),
  saveRecents: (
    entries: Array<{ path: string; name: string; lastOpenedAt: number }>,
  ): Promise<{ ok: true } | { ok: false; error: string }> =>
    ipcRenderer.invoke('recents:save', entries),

  setWindowTitle: (title: string): Promise<{ ok: true } | { ok: false; error: string }> =>
    ipcRenderer.invoke('window:setTitle', title),
};

contextBridge.exposeInMainWorld('h5', api);
