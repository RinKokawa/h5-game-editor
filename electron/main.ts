/**
 * Electron main process.
 *
 * Responsibilities:
 *   - Create a single BrowserWindow and load the renderer.
 *   - Register IPC handlers for the four document-IO operations the
 *     renderer needs (show-open-dialog, show-save-dialog, read-json,
 *     write-json). The handler bodies live here, not in preload, so
 *     the renderer only sees a typed surface area via contextBridge.
 *
 * Dev vs. prod loading:
 *   - `npm run dev`     → loads http://localhost:5173 (Vite HMR)
 *   - `npm run electron:dev` → same, with the dev tools open
 *   - packaged build    → loads dist/index.html via file://
 *
 * Security stance:
 *   - contextIsolation: true (default)
 *   - nodeIntegration: false (default)
 *   - sandbox: true (default; preload uses `electron` via the
 *     contextBridge, which is the only Node bridge the renderer sees)
 *   - All file I/O is funneled through these handlers; the renderer
 *     cannot read or write arbitrary paths directly.
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';

const isDev = !app.isPackaged;
const RENDERER_DEV_URL = 'http://localhost:5173';

// Match `src/styles/global.css` `--color-bg`. If the editor's theme
// changes, update this constant too — Electron's chrome can't read
// CSS variables.
const EDITOR_BG = '#1e1e1e';
const EDITOR_BG_ELEVATED = '#252526';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

const createWindow = (): BrowserWindow => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'H5 Game Editor',
    backgroundColor: EDITOR_BG,
    // Hide the OS chrome so the renderer's MenuBar is the only thing
    // the user sees at the top. Drag handles (the editor's empty
    // areas) still let the user move the window.
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    // Tint the small traffic-light / window-control strip so it
    // doesn't look out of place against the editor's dark theme.
    titleBarOverlay:
      process.platform === 'darwin'
        ? false
        : { color: EDITOR_BG, symbolColor: EDITOR_BG_ELEVATED, height: 28 },
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  if (isDev) {
    void win.loadURL(RENDERER_DEV_URL);
  } else {
    void win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  return win;
};

const registerIpc = (): void => {
  // Pick a file to open. Returns the absolute path, or null if the
  // user cancelled. The renderer reads the file with `fs:readJson`.
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

  // Pick a path to save to. Returns the absolute path, or null if the
  // user cancelled. The renderer writes the file with `fs:writeJson`.
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

  // Read a JSON file from disk. Caller is responsible for parsing —
  // we return raw bytes (utf-8 string) so the renderer's existing
  // JSON.parse + deserializeDocument path stays in renderer-land.
  ipcMain.handle('fs:readJson', async (_event, filePath: string) => {
    try {
      const text = await readFile(filePath, 'utf-8');
      return { ok: true as const, text };
    } catch (err) {
      return { ok: false as const, error: errMsg(err) };
    }
  });

  // Write text to a JSON file on disk. Returns bytes written or an
  // error string — same outcome shape the renderer already uses.
  ipcMain.handle('fs:writeJson', async (_event, filePath: string, text: string) => {
    try {
      await writeFile(filePath, text, 'utf-8');
      return { ok: true as const, bytes: text.length };
    } catch (err) {
      return { ok: false as const, error: errMsg(err) };
    }
  });
};

const errMsg = (err: unknown): string => (err instanceof Error ? err.message : String(err));

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