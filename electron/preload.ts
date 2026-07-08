/**
 * Electron preload — runs in the renderer's isolated world with
 * limited Node access. The only thing it does is hand the renderer a
 * typed surface via `contextBridge` — the implementation bodies live
 * in main.ts so the renderer cannot reach the filesystem directly.
 *
 * The exposed shape is intentionally minimal: four async methods,
 * one outcome each. The renderer code (`electronBridge.ts`) decides
 * whether to call them or fall back to localStorage.
 */

import { contextBridge, ipcRenderer } from 'electron';

/**
 * The full surface area the preload hands to the renderer.
 * Declared as an explicit interface (not derived via `typeof api`)
 * because the renderer's `electronBridge.ts` re-declares the same
 * shape — keeping it explicit lets both sides share the same
 * structural type without one file importing the other across the
 * src/ ↔ electron/ project boundary.
 */
export interface H5Bridge {
  readonly openDialog: () => Promise<string | null>;
  readonly saveAsDialog: (defaultName?: string) => Promise<string | null>;
  readonly readJson: (
    filePath: string,
  ) => Promise<{ ok: true; text: string } | { ok: false; error: string }>;
  readonly writeJson: (
    filePath: string,
    text: string,
  ) => Promise<{ ok: true; bytes: number } | { ok: false; error: string }>;
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
};

contextBridge.exposeInMainWorld('h5', api);