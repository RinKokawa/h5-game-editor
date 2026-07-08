/**
 * electronBridge — renderer-side wrapper for the IPC surface the
 * preload script exposes via `contextBridge` as `window.h5`.
 *
 * Two domains are wrapped here, mirroring the preload interface:
 *   - Document I/O (pre-Step 18): dialog + raw fs read/write of a
 *     single .json chosen via dialog.
 *   - Workspace I/O (Step 18): folder picker + workspace bootstrap
 *     and document read/write inside it. Recents are file-locked
 *     inside the main process; the renderer only sees typed lists.
 *
 * Every function short-circuits with a typed "Electron bridge not
 * available" outcome when `window.h5` is absent — that's the
 * `vite dev` (no Electron) and vitest happy-dom paths. Callers
 * compose their own fallback (see `workspaceIO.ts` / `documentIO.ts`).
 *
 * This file does NOT touch the Document directly — it's a thin,
 * typed transport. The same `serializeDocument` /
 * `deserializeDocument` functions in `@core/serialization` are
 * reused; we just hand the JSON back and forth across the IPC
 * boundary.
 *
 * `H5Bridge` is duplicated here (rather than imported from
 * `electron/preload.ts`) because the two tsconfigs split src/ and
 * electron/ into different projects. Keeping the shape duplicated is
 * two declarations but zero cross-boundary coupling.
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

  readonly pickFolder: () => Promise<string | null>;
  readonly createWorkspace: (
    folderPath: string,
    name: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  readonly statWorkspace: (
    folderPath: string,
  ) => Promise<{ ok: true; name: string; activeDocId: string } | { ok: false; error: string }>;
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

  readonly loadRecents: () => Promise<
    | { ok: true; entries: Array<{ path: string; name: string; lastOpenedAt: number }> }
    | {
        ok: false;
        error: string;
      }
  >;
  readonly saveRecents: (
    entries: Array<{ path: string; name: string; lastOpenedAt: number }>,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
}

declare global {
  interface Window {
    readonly h5?: H5Bridge;
  }
}

export const isElectron = (): boolean => typeof window !== 'undefined' && window.h5 !== undefined;

// --- Document I/O ----------------------------------------------------

export const openDialog = async (): Promise<string | null> => {
  if (!window.h5) return null;
  return window.h5.openDialog();
};

export const saveAsDialog = async (defaultName?: string): Promise<string | null> => {
  if (!window.h5) return null;
  return window.h5.saveAsDialog(defaultName);
};

export const readJsonFile = async (
  filePath: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
  if (!window.h5) return { ok: false, error: 'Electron bridge not available' };
  return window.h5.readJson(filePath);
};

export const writeJsonFile = async (
  filePath: string,
  text: string,
): Promise<{ ok: true; bytes: number } | { ok: false; error: string }> => {
  if (!window.h5) return { ok: false, error: 'Electron bridge not available' };
  return window.h5.writeJson(filePath, text);
};

// --- Workspace I/O ---------------------------------------------------

export const pickFolder = async (): Promise<string | null> => {
  if (!window.h5) return null;
  return window.h5.pickFolder();
};

export const createWorkspace = async (
  folderPath: string,
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> => {
  if (!window.h5) return { ok: false, error: 'Electron bridge not available' };
  return window.h5.createWorkspace(folderPath, name);
};

export const statWorkspace = async (
  folderPath: string,
): Promise<{ ok: true; name: string; activeDocId: string } | { ok: false; error: string }> => {
  if (!window.h5) return { ok: false, error: 'Electron bridge not available' };
  return window.h5.statWorkspace(folderPath);
};

export const readDocumentInWorkspace = async (
  folderPath: string,
  docId: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
  if (!window.h5) return { ok: false, error: 'Electron bridge not available' };
  return window.h5.readDocumentInWorkspace(folderPath, docId);
};

export const writeDocumentInWorkspace = async (
  folderPath: string,
  docId: string,
  text: string,
): Promise<{ ok: true; bytes: number } | { ok: false; error: string }> => {
  if (!window.h5) return { ok: false, error: 'Electron bridge not available' };
  return window.h5.writeDocumentInWorkspace(folderPath, docId, text);
};

export const listDocumentsInWorkspace = async (
  folderPath: string,
): Promise<
  { ok: true; entries: Array<{ id: string; name: string }> } | { ok: false; error: string }
> => {
  if (!window.h5) return { ok: false, error: 'Electron bridge not available' };
  return window.h5.listDocumentsInWorkspace(folderPath);
};

// --- Recents ---------------------------------------------------------

export const loadRecents = async (): Promise<
  | { ok: true; entries: Array<{ path: string; name: string; lastOpenedAt: number }> }
  | {
      ok: false;
      error: string;
    }
> => {
  if (!window.h5) return { ok: true, entries: [] };
  return window.h5.loadRecents();
};

export const saveRecents = async (
  entries: Array<{ path: string; name: string; lastOpenedAt: number }>,
): Promise<{ ok: true } | { ok: false; error: string }> => {
  if (!window.h5) return { ok: true };
  return window.h5.saveRecents(entries);
};
