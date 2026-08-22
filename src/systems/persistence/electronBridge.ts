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

  /** Update the OS title bar (close / maximize / minimize strip). */
  readonly setWindowTitle: (title: string) => Promise<{ ok: true } | { ok: false; error: string }>;

  /**
   * Window lifecycle bridge — `onBeforeClose` / `offBeforeClose`
   * subscribe to the main process's intercepted close gesture, and
   * `confirmClose` lets the renderer actually tear the window down
   * when it's done handling the gesture.
   *
   * Outside Electron (browser / vitest) the wrapper is a no-op: it
   * returns a noop unsubscribe so callers don't have to branch.
   */
  readonly onBeforeClose: (handler: () => void) => void;
  readonly offBeforeClose: (handler: () => void) => void;
  readonly confirmClose: () => Promise<{ ok: true } | { ok: false; error: string }>;
  readonly cancelClose: () => Promise<{ ok: true }>;

  /**
   * Open a URL in the OS default browser. Routed through the
   * main process's `shell.openExternal`. The main process does
   * not enforce an allowlist; callers should pass a trusted URL.
   * Outside Electron (browser / vitest) the wrapper falls back to
   * `{ ok: false }` rather than `window.open` so we don't pop an
   * unexpected tab during tests.
   */
  readonly openExternal: (url: string) => Promise<
    { ok: true } | { ok: false; error: string }
  >;
}

declare global {
  interface Window {
    readonly h5?: H5Bridge;
  }
}

export const isElectron = (): boolean =>
  typeof window !== 'undefined' && window.h5 !== undefined;

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

// --- Window chrome ----------------------------------------------------

// Browser fallback: returning `{ ok: true }` makes the title update a
// fire-and-forget no-op outside Electron, which matches the recents /
// pickFolder pattern. The OS title bar only matters when running as
// a desktop app anyway.
export const setWindowTitle = async (
  title: string,
): Promise<{ ok: true } | { ok: false; error: string }> => {
  if (!window.h5) return { ok: true };
  return window.h5.setWindowTitle(title);
};

// --- Window lifecycle -------------------------------------------------

/**
 * Subscribe to the OS close gesture (X / Alt+F4 / Cmd+W). Returns an
 * unsubscribe function. Outside Electron, the subscribe is a no-op
 * and the unsubscribe is also a no-op, so callers can use the same
 * pattern in both environments.
 */
export const onBeforeClose = (handler: () => void): (() => void) => {
  const bridge = window.h5;
  if (!bridge) return () => undefined;
  bridge.onBeforeClose(handler);
  return () => bridge.offBeforeClose(handler);
};

/**
 * Confirm that the close gesture should actually tear the window
 * down. Called by the renderer after it has finished responding to
 * `onBeforeClose` — e.g. on the Launcher page, where there's no
 * editor state to return to.
 */
export const confirmClose = async (): Promise<
  { ok: true } | { ok: false; error: string }
> => {
  const bridge = window.h5;
  if (!bridge) return { ok: false, error: 'Electron bridge not available' };
  return bridge.confirmClose();
};

/**
 * Acknowledge that the close gesture has been handled without
 * actually closing the window. Called by the renderer when it
 * responds to `onBeforeClose` by flipping phase back to the
 * Launcher (via `leave()`). Without this ack the main process's
 * 2-second failsafe timer would fire and force-close the window
 * even though the user just wanted to return to the Launcher.
 *
 * Outside Electron (browser / vitest) this is a no-op.
 */
export const cancelClose = async (): Promise<{ ok: true }> => {
  const bridge = window.h5;
  if (!bridge) return { ok: true };
  return bridge.cancelClose();
};

// --- Open URL ---------------------------------------------------------

/**
 * Open a URL in the OS default browser. Outside Electron we
 * refuse (`{ ok: false }`) instead of falling through to
 * `window.open`, which would pop a tab the tests don't want.
 */
export const openExternal = async (
  url: string,
): Promise<{ ok: true } | { ok: false; error: string }> => {
  const bridge = window.h5;
  if (!bridge) return { ok: false, error: 'Electron bridge not available' };
  return bridge.openExternal(url);
};
