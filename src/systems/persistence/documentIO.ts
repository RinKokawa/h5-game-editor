/**
 * Document I/O — localStorage-backed save / load of the current
 * Document state.
 *
 * `saveDocument` snapshots the current documentStore and writes it
 * to `localStorage` under a fixed key. `loadDocument` reads back
 * the same key and replaces the store's contents (and clears the
 * undo/redo stacks — loading is a fresh history).
 *
 * The serializer lives in `@core/serialization` so the wire format
 * is editor-agnostic and can be re-used for .json export / import
 * in later steps.
 *
 * `SaveOutcome` / `LoadOutcome` are discriminated unions so callers
 * (the menu, the Save shortcut) can show useful error messages
 * instead of catching exceptions.
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

const STORAGE_KEY = 'h5-editor:document:v1';

export type SaveOutcome =
  { readonly ok: true; readonly bytes: number } | { readonly ok: false; readonly error: string };

export type LoadOutcome =
  | { readonly ok: true; readonly layerCount: number }
  | { readonly ok: false; readonly error: string };

export const saveDocument = (): SaveOutcome => {
  try {
    const state = useDocumentStore.getState();
    const serialized: SerializedDocumentV1 = serializeDocument({
      tileSize: state.tileSize,
      mapSize: state.mapSize,
      layers: state.layers,
    });
    const json = JSON.stringify(serialized);
    localStorage.setItem(STORAGE_KEY, json);
    return { ok: true, bytes: json.length };
  } catch (err) {
    return { ok: false, error: errMsg(err) };
  }
};

export const loadDocument = (): LoadOutcome => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return { ok: false, error: 'No saved document found' };
    }
    const parsed = JSON.parse(raw) as unknown;
    const loaded: LoadedDocument = deserializeDocument(parsed);
    applyLoaded(loaded);
    return { ok: true, layerCount: loaded.layers.length };
  } catch (err) {
    return { ok: false, error: errMsg(err) };
  }
};

/** True if there is a saved document in localStorage. */
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
