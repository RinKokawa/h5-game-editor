/**
 * Document I/O — save / load the current Document.
 *
 * Two backends, one API:
 *
 *   - Electron (window.h5 present): the renderer shows a native
 *     Open / Save dialog, then writes the document to a path the user
 *     chose. The IPC bridge is in `electronBridge.ts`; the handlers
 *     live in `electron/main.ts`.
 *
 *   - Plain browser (no window.h5): falls back to localStorage under
 *     a fixed key. Useful for `vite dev` without an Electron shell,
 *     and for vitest under happy-dom.
 *
 * The serializer is in `@core/serialization` and stays editor-agnostic
 * — both backends produce the same wire format, so a file written
 * through Electron can be read back in a browser, and vice versa.
 *
 * Outcomes are discriminated unions so callers (menu, shortcuts,
 * console) can show useful messages instead of catching exceptions.
 */

import { commandBus } from '@core/command/commandBusSingleton';
import {
  deserializeDocument,
  serializeDocument,
  type LoadedDocument,
  type SerializedDocumentV1,
} from '@core/serialization/index';
import { asLayerId } from '@editor/map/schema/ids';
import { useDocumentStore } from '@state/documentStore';
import { useSelectionStore } from '@state/selectionStore';

import {
  isElectron,
  openDialog,
  readJsonFile,
  saveAsDialog,
  writeJsonFile,
} from './electronBridge';

const STORAGE_KEY = 'h5-editor:document:v1';

export type SaveOutcome =
  | { readonly ok: true; readonly bytes: number; readonly path: string | null }
  | { readonly ok: false; readonly error: string };

export type LoadOutcome =
  | { readonly ok: true; readonly layerCount: number; readonly path: string | null }
  | { readonly ok: false; readonly error: string };

export const saveDocument = async (): Promise<SaveOutcome> => {
  try {
    const state = useDocumentStore.getState();
    const serialized: SerializedDocumentV1 = serializeDocument({
      tileSize: state.tileSize,
      mapSize: state.mapSize,
      layers: state.layers,
    });
    const json = JSON.stringify(serialized, null, 2);

    if (isElectron()) {
      const path = await saveAsDialog('untitled.json');
      if (!path) return { ok: false, error: 'Save cancelled' };
      const result = await writeJsonFile(path, json);
      if (!result.ok) return { ok: false, error: result.error };
      return { ok: true, bytes: result.bytes, path };
    }

    localStorage.setItem(STORAGE_KEY, json);
    return { ok: true, bytes: json.length, path: null };
  } catch (err) {
    return { ok: false, error: errMsg(err) };
  }
};

export const loadDocument = async (): Promise<LoadOutcome> => {
  try {
    if (isElectron()) {
      const path = await openDialog();
      if (!path) return { ok: false, error: 'Open cancelled' };
      const file = await readJsonFile(path);
      if (!file.ok) return { ok: false, error: file.error };
      const parsed = JSON.parse(file.text) as unknown;
      const loaded: LoadedDocument = deserializeDocument(parsed);
      applyLoaded(loaded);
      return { ok: true, layerCount: loaded.layers.length, path };
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { ok: false, error: 'No saved document found' };
    const parsed = JSON.parse(raw) as unknown;
    const loaded: LoadedDocument = deserializeDocument(parsed);
    applyLoaded(loaded);
    return { ok: true, layerCount: loaded.layers.length, path: null };
  } catch (err) {
    return { ok: false, error: errMsg(err) };
  }
};

/** True if there is a saved document in localStorage (browser-only). */
export const hasSavedDocument = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
};

const applyLoaded = (loaded: LoadedDocument): void => {
  useDocumentStore.setState({
    tileSize: loaded.tileSize,
    mapSize: loaded.mapSize,
    layers: loaded.layers,
    activeLayerId: asLayerId(loaded.activeLayerId),
  });
  useSelectionStore.getState().clear();
  commandBus.clearHistory();
};

const errMsg = (err: unknown): string => (err instanceof Error ? err.message : String(err));
