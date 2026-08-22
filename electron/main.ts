/**
 * Electron main process.
 *
 * Responsibilities:
 *   - Create a single BrowserWindow and load the renderer.
 *   - Register IPC handlers for everything the renderer needs:
 *       * Document I/O        (open/save dialog + raw fs read/write)
 *       * Workspace I/O        (folder picker, create/stat workspace,
 *                               list/read/write documents inside it)
 *       * Recents persistence  (file in `app.getPath('userData')`)
 *
 * Dev vs. prod loading:
 *   - `npm run dev`            → loads http://localhost:5173 (Vite HMR)
 *   - `npm run electron:dev`   → same, with the dev tools open
 *   - packaged build           → loads dist/index.html via file://
 *
 * Security stance:
 *   - contextIsolation: true (default; enforce)
 *   - nodeIntegration: false (default; enforce)
 *   - sandbox: false — the editor loads its own assets (Vite dev
 *     server in dev, bundled dist/index.html in prod) and never
 *     fetches remote content, so the sandbox's primary threat
 *     model (untrusted remote scripts) doesn't apply. ESM preloads
 *     with named imports from the virtual `electron` module
 *     (`import { contextBridge, ipcRenderer } from 'electron'`)
 *     silently fail under sandbox: true in Electron 43; disabling
 *     sandbox keeps the same renderer surface and lets the preload
 *     actually expose `window.h5`.
 *   - All file I/O is funneled through these handlers; the renderer
 *     cannot read or write arbitrary paths directly.
 */

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';

const isDev = !app.isPackaged;
const RENDERER_DEV_URL = 'http://localhost:5173';

// Match `src/styles/global.css` `--color-bg`. If the editor's theme
// changes, update this constant too — Electron's chrome can't read
// CSS variables.
const EDITOR_BG = '#1e1e1e';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Workspace on-disk layout constants. The single source of truth —
// the renderer's `core/workspace/schema.ts` carries the same values
// for its in-memory types. Bump versions in both places together.
const WORKSPACE_CONFIG_FILENAME = 'h5-editor.json';
const DOCUMENTS_DIRNAME = 'documents';
const ASSETS_DIRNAME = 'assets';
const WORKSPACE_SCHEMA_VERSION = 1;
const RECENT_LIST_VERSION = 1;
const RECENT_LIST_FILENAME = 'recent.json';
const MAX_RECENT_ENTRIES = 10;

let mainWindow: BrowserWindow | null = null;
// Set when the user actually wants to quit (Cmd+Q / Quit menu / app
// shutdown). When true, `BrowserWindow.close` proceeds normally. When
// false, a close attempt is intercepted and re-routed to the renderer
// as `app:before-close`, so the renderer can flip `phase` back to
// `'launcher'` instead of letting the app exit. The renderer's
// `app:confirmClose` IPC sets this back to true when it's actually OK
// to tear the window down (e.g. we're already on the Launcher page).
let isQuitting = false;
// Failsafe timer set by the close interceptor. If the renderer
// doesn't respond with `app:confirmClose` within this window (e.g.
// it crashed during boot and the user is staring at a blank
// window), the timer flips `isQuitting` and force-closes the
// window so the user isn't trapped. Cleared by `app:confirmClose`
// when the renderer does respond.
let forceCloseTimer: NodeJS.Timeout | null = null;

const createWindow = (): BrowserWindow => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'H5 Game Editor',
    backgroundColor: EDITOR_BG,
    // Window icon: in dev mode the executable is the stock Electron
    // binary (no embedded icon), so we must point BrowserWindow at
    // `build/icon.png` directly. In packaged mode the executable has
    // the icon embedded by electron-builder (via `win.icon` in
    // electron-builder.yml) and the OS uses that — pointing here
    // either works (the file resolves through asar) or is harmlessly
    // ignored in favor of the embedded icon.
    icon: path.join(__dirname, '..', '..', 'build', 'icon.png'),
    // On Windows 11, Mica gives the OS chrome a tinted backdrop that
    // adopts the editor's dark theme instead of the default white.
    // On macOS the title bar picks up the `backgroundColor` directly.
    // On older Windows / Linux the title bar stays white; we accept
    // the small mismatch in v0.1 — making it dark everywhere needs
    // either a custom titleBarStyle (which conflicts with the React
    // MenuBar approach) or a Windows 11-only `backgroundMaterial`.
    ...(process.platform === 'win32' ? { backgroundMaterial: 'mica' as const } : {}),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  // Intercept the OS "close" gesture (X button / Alt+F4 / Cmd+W) so
  // we can route it through the renderer. The renderer's WorkspaceGate
  // decides whether that gesture should flip back to the Launcher
  // (default — keeps the app alive) or actually tear the window
  // down (after the user has explicitly chosen to quit, or when the
  // window is already on the Launcher page). `isQuitting` short-
  // circuits this on real shutdowns so `app:confirmClose`'s
  // `mainWindow.close()` doesn't loop.
  //
  // Failsafe: if the renderer never responds (e.g. it crashed during
  // boot, the user is staring at a blank window) the module-level
  // `forceCloseTimer` fires after 2 s and tears the window down so
  // the user isn't trapped. `app:confirmClose` clears that timer
  // when the renderer does respond.
  win.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();

    if (forceCloseTimer) clearTimeout(forceCloseTimer);
    forceCloseTimer = setTimeout(() => {
      forceCloseTimer = null;
      isQuitting = true;
      if (!win.isDestroyed()) win.close();
    }, 2000);

    if (!win.webContents.isDestroyed()) {
      win.webContents.send('app:before-close');
    }
  });

  if (isDev) {
    void win.loadURL(RENDERER_DEV_URL);
  } else {
    // Packaged: __dirname is `<app.asar>/dist-electron/electron/`. The
    // Vite-built renderer lives at `<app.asar>/dist/index.html`, so
    // step up two levels (out of `electron/`, then out of
    // `dist-electron/`). One `..` would land in `dist-electron/` and
    // miss `dist/` entirely.
    void win.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
  }

  return win;
};

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

const errMsg = (err: unknown): string => (err instanceof Error ? err.message : String(err));

const recentListPath = (): string =>
  path.join(app.getPath('userData'), RECENT_LIST_FILENAME);

// Tiny validation helpers. These are the wall between disk and the
// renderer — keep them strict enough to refuse obviously-bad payloads
// before they round-trip back. The narrow types double as guards so
// callers can read fields off the parsed JSON without re-narrowing.
interface WorkspaceConfigShape {
  version: number;
  name: string;
  activeDocId: string;
  documents: unknown[];
  lastSavedAt: number;
}
interface RecentListShape {
  version: number;
  entries: unknown[];
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isWorkspaceConfig = (raw: unknown): raw is WorkspaceConfigShape => {
  if (!isObject(raw)) return false;
  if (raw['version'] !== WORKSPACE_SCHEMA_VERSION) return false;
  if (typeof raw['name'] !== 'string' || raw['name'].length === 0) return false;
  if (typeof raw['activeDocId'] !== 'string' || raw['activeDocId'].length === 0) return false;
  if (!Array.isArray(raw['documents'])) return false;
  if (typeof raw['lastSavedAt'] !== 'number') return false;
  return true;
};

const isRecentList = (raw: unknown): raw is RecentListShape => {
  if (!isObject(raw)) return false;
  if (raw['version'] !== RECENT_LIST_VERSION) return false;
  return Array.isArray(raw['entries']);
};

const isRecentEntry = (v: unknown): v is { path: string; name: string; lastOpenedAt: number } => {
  if (!isObject(v)) return false;
  return (
    typeof v['path'] === 'string' &&
    v['path'].length > 0 &&
    typeof v['name'] === 'string' &&
    typeof v['lastOpenedAt'] === 'number'
  );
};

// ---------------------------------------------------------------------
// IPC registration
// ---------------------------------------------------------------------

const registerIpc = (): void => {
  // -------------------- Document I/O (pre-Step 18) --------------------

  ipcMain.handle('dialog:open', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Open document',
      properties: ['openFile'],
      filters: [
        { name: 'H5 Editor Document', extensions: ['json'] },
        { name: 'All files', extensions: ['*'] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0] ?? null;
  });

  ipcMain.handle('dialog:saveAs', async (_event, defaultName?: string) => {
    if (!mainWindow) return null;
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Save document',
      defaultPath: defaultName ?? 'untitled.json',
      filters: [{ name: 'H5 Editor Document', extensions: ['json'] }],
    });
    if (result.canceled || result.filePath.length === 0) return null;
    return result.filePath;
  });

  ipcMain.handle('fs:readJson', async (_event, filePath: string) => {
    try {
      const text = await readFile(filePath, 'utf-8');
      return { ok: true as const, text };
    } catch (err) {
      return { ok: false as const, error: errMsg(err) };
    }
  });

  ipcMain.handle('fs:writeJson', async (_event, filePath: string, text: string) => {
    try {
      await writeFile(filePath, text, 'utf-8');
      return { ok: true as const, bytes: text.length };
    } catch (err) {
      return { ok: false as const, error: errMsg(err) };
    }
  });

  // ----------------------- Workspace I/O (Step 18) --------------------

  // Show a folder picker; return the selected absolute path, or null
  // if the user cancelled.
  ipcMain.handle('dialog:pickFolder', async () => {
    if (!mainWindow) return null;
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Pick workspace folder',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0] ?? null;
  });

  // Bootstrap a brand-new workspace at the given path. Creates the
  // directory tree (h5-editor.json + documents/ + assets/) and writes
  // the initial config. Refuses if the folder is non-empty (would
  // risk overwriting existing project data).
  ipcMain.handle(
    'workspace:create',
    async (_event, folderPath: string, name: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      try {
        const trimmed = name.trim();
        if (trimmed.length === 0) return { ok: false, error: 'Workspace name is empty' };

        await mkdir(folderPath, { recursive: true });

        const existing = await readdir(folderPath);
        if (existing.length > 0) {
          return {
            ok: false,
            error: 'Folder is not empty. Pick an empty folder to create a new workspace.',
          };
        }

        await mkdir(path.join(folderPath, DOCUMENTS_DIRNAME), { recursive: true });
        await mkdir(path.join(folderPath, ASSETS_DIRNAME), { recursive: true });

        // v0.1 creates one empty document upfront so the editor has
        // something to load. The document body is the same wire format
        // `serializeDocument()` produces — `meta` is nested, the seed
        // tile layer matches `seedLayer('layer.tile.1', 'Layer 1')` in
        // `src/state/documentStore.ts`, and entities / colliders
        // round-trip as empty arrays. Without a seed layer the
        // renderer's deserializer throws "document has no layers";
        // without `meta` it throws "meta missing". Mirror the
        // renderer's defaults (`DEFAULT_DOCUMENT_META` = 1920×1088 px,
        // tileSize 32) so a freshly created workspace opens with the
        // same state a new editor session would have.
        const docId = `doc.${Date.now().toString(36)}.${randomSuffix()}`;
        const emptyDoc = {
          version: 1,
          meta: {
            tileSize: 32,
            mapSize: { width: 1920, height: 1088 },
          },
          layers: [
            {
              id: 'layer.tile.1',
              type: 'tile',
              name: 'Layer 1',
              visible: true,
              locked: false,
              opacity: 1,
              properties: { entries: [] },
              data: { tiles: [] },
            },
          ],
          entities: [],
          colliders: [],
        };
        await writeFile(
          path.join(folderPath, DOCUMENTS_DIRNAME, `${docId}.json`),
          JSON.stringify(emptyDoc, null, 2),
          'utf-8',
        );

        const config = {
          version: WORKSPACE_SCHEMA_VERSION,
          name: trimmed,
          activeDocId: docId,
          documents: [{ id: docId, name: 'Map 1' }],
          lastSavedAt: Date.now(),
        };
        await writeFile(
          path.join(folderPath, WORKSPACE_CONFIG_FILENAME),
          JSON.stringify(config, null, 2),
          'utf-8',
        );

        return { ok: true };
      } catch (err) {
        return { ok: false, error: errMsg(err) };
      }
    },
  );

  // Read the workspace config and return its identity (name +
  // activeDocId). Used by the launcher when opening an existing
  // workspace to decide whether to enter the editor and which
  // document to load.
  ipcMain.handle(
    'workspace:stat',
    async (
      _event,
      folderPath: string,
    ): Promise<
      { ok: true; name: string; activeDocId: string } | { ok: false; error: string }
    > => {
      try {
        const text = await readFile(
          path.join(folderPath, WORKSPACE_CONFIG_FILENAME),
          'utf-8',
        );
        const parsed: unknown = JSON.parse(text);
        if (!isWorkspaceConfig(parsed)) {
          return { ok: false, error: 'Invalid workspace config: schema mismatch' };
        }
        return { ok: true, name: parsed.name, activeDocId: parsed.activeDocId };
      } catch (err) {
        return { ok: false, error: errMsg(err) };
      }
    },
  );

  // List every `documents/*.json` inside a workspace. Returns id +
  // name pairs. The renderer's `useDocumentStore` expects to know
  // which doc is currently active (matters only once we ship
  // multi-doc switching; safe to forward as-is).
  ipcMain.handle(
    'workspace:listDocuments',
    async (
      _event,
      folderPath: string,
    ): Promise<
      | { ok: true; entries: Array<{ id: string; name: string }> }
      | { ok: false; error: string }
    > => {
      try {
        const docsDir = path.join(folderPath, DOCUMENTS_DIRNAME);
        const entries = await readdir(docsDir);
        const jsonFiles = entries.filter((e) => e.endsWith('.json'));
        const out: Array<{ id: string; name: string }> = [];
        for (const filename of jsonFiles) {
          const docId = filename.replace(/\.json$/, '');
          try {
            const text = await readFile(path.join(docsDir, filename), 'utf-8');
            const parsed: unknown = JSON.parse(text);
            const name =
              isObject(parsed) && typeof parsed['name'] === 'string' ? parsed['name'] : docId;
            out.push({ id: docId, name });
          } catch {
            // Skip malformed documents rather than failing the whole
            // listing; a missing document in the table is recoverable.
          }
        }
        return { ok: true, entries: out };
      } catch (err) {
        return { ok: false, error: errMsg(err) };
      }
    },
  );

  ipcMain.handle(
    'workspace:readDocument',
    async (
      _event,
      folderPath: string,
      docId: string,
    ): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
      try {
        const text = await readFile(
          path.join(folderPath, DOCUMENTS_DIRNAME, `${docId}.json`),
          'utf-8',
        );
        return { ok: true, text };
      } catch (err) {
        return { ok: false, error: errMsg(err) };
      }
    },
  );

  ipcMain.handle(
    'workspace:writeDocument',
    async (
      _event,
      folderPath: string,
      docId: string,
      text: string,
    ): Promise<{ ok: true; bytes: number } | { ok: false; error: string }> => {
      try {
        const filePath = path.join(folderPath, DOCUMENTS_DIRNAME, `${docId}.json`);
        await writeFile(filePath, text, 'utf-8');
        return { ok: true, bytes: text.length };
      } catch (err) {
        return { ok: false, error: errMsg(err) };
      }
    },
  );

  // ----------------------- Recents (Step 18) -----------------------

  // Recents live at `<userData>/recent.json` — app-owned path, the
  // renderer never sees it. Returning `entries: []` when the file is
  // missing is the expected first-run behavior.
  ipcMain.handle('recents:load', async () => {
    try {
      const text = await readFile(recentListPath(), 'utf-8');
      const parsed: unknown = JSON.parse(text);
      if (!isRecentList(parsed)) {
        return { ok: false as const, error: 'Corrupt recent list on disk' };
      }
      const entries = parsed.entries.filter(isRecentEntry);
      return { ok: true as const, entries };
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code === 'ENOENT') return { ok: true as const, entries: [] };
      return { ok: false as const, error: errMsg(err) };
    }
  });

  ipcMain.handle(
    'recents:save',
    async (
      _event,
      entries: Array<{ path: string; name: string; lastOpenedAt: number }>,
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      try {
        // Cap before writing so a corrupt caller can't bloat the
        // file. The renderer also caps; this is defence-in-depth.
        const capped = entries.slice(0, MAX_RECENT_ENTRIES);
        const payload = { version: RECENT_LIST_VERSION, entries: capped };
        await writeFile(recentListPath(), JSON.stringify(payload, null, 2), 'utf-8');
        return { ok: true };
      } catch (err) {
        return { ok: false, error: errMsg(err) };
      }
    },
  );

  // ----------------------- Window chrome -----------------------

  // Update the OS title bar (the strip with the close / maximize /
  // minimize buttons). The renderer calls this when the workspace
  // changes so the title reads "H5 Game Editor - <workspaceName>"
  // while editing and resets to "H5 Game Editor" when the
  // Launcher takes over. The initial title comes from the
  // BrowserWindow `title` option.
  ipcMain.handle('window:setTitle', (_event, title: string) => {
    if (!mainWindow) return { ok: false, error: 'No main window' };
    try {
      mainWindow.setTitle(title);
      return { ok: true as const };
    } catch (err) {
      return { ok: false as const, error: errMsg(err) };
    }
  });

  // ----------------------- Window lifecycle -----------------------
  //
  // Renderer-driven close handshake. The renderer subscribes to
  // `app:before-close` (sent above when the OS close gesture fires);
  // once it has decided to actually quit (e.g. we're already on the
  // Launcher page, or the user picked Quit from a menu) it calls
  // `app:confirmClose`, which clears the failsafe timer (so the
  // force-close doesn't fire) and flips `isQuitting` so the next
  // close attempt lands cleanly.
  //
  // When the renderer decides to keep the window alive (e.g. the
  // editor was open and `leave()` flipped phase back to the
  // Launcher), it calls `app:cancelClose` instead. That handshake
  // exists *only* to clear the failsafe timer — without it the
  // renderer would never ack the gesture, the 2-second timer would
  // fire, and the window would close even though the user just
  // wanted to return to the Launcher.
  ipcMain.handle('app:confirmClose', (): { ok: true } | { ok: false; error: string } => {
    if (!mainWindow) return { ok: false, error: 'No main window' };
    if (forceCloseTimer) {
      clearTimeout(forceCloseTimer);
      forceCloseTimer = null;
    }
    isQuitting = true;
    if (!mainWindow.isDestroyed()) mainWindow.close();
    return { ok: true };
  });

  ipcMain.handle('app:cancelClose', (): { ok: true } => {
    if (forceCloseTimer) {
      clearTimeout(forceCloseTimer);
      forceCloseTimer = null;
    }
    return { ok: true };
  });

  // ----------------------- Open URL in OS browser -----------------------
  //
  // Delegates to `shell.openExternal`, which the renderer cannot
  // reach directly (no nodeIntegration). `shell.openExternal` blocks
  // dangerous schemes (`javascript:`, etc.) per Electron's policy,
  // so the renderer doesn't need its own allowlist — but callers
  // should still pass user-controlled URLs through a validator
  // before this IPC runs in any v1.x+.
  ipcMain.handle(
    'system:openExternal',
    async (_event, url: string): Promise<{ ok: true } | { ok: false; error: string }> => {
      try {
        await shell.openExternal(url);
        return { ok: true as const };
      } catch (err) {
        return { ok: false as const, error: errMsg(err) };
      }
    },
  );
};

const randomSuffix = (): string => Math.random().toString(36).slice(2, 10);

// ---------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------

app
  .whenReady()
  .then(() => {
    registerIpc();
    // The renderer ships its own MenuBar (React + i18n). The default
    // Electron menu duplicates File/Edit/View/Window and clashes with
    // ours, so null it out. macOS still gets the system menu but the
    // app-name entry is the only thing left; harmless.
    Menu.setApplicationMenu(null);
    mainWindow = createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow();
      }
    });
  })
  .catch((err: unknown) => {
    console.error('[electron] failed to start:', err);
    app.quit();
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Real shutdown signal (Cmd+Q on macOS, Quit menu, OS log-out).
// Distinct from `BrowserWindow.close`, which we intercept above.
app.on('before-quit', () => {
  isQuitting = true;
});
