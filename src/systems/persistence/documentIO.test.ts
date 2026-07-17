/**
 * documentIO — unit tests.
 *
 * Both functions are workspace-scoped (no dialogs in v0.1). The
 * preconditions are: an active workspace in `workspaceStore`, an
 * Electron bridge on `window.h5`. Outside those two conditions, the
 * outcome discriminates on the failure reason — never throws.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { asDocumentId } from '@editor/map/schema/ids';
import { useDocumentStore } from '@state/documentStore';
import { useWorkspaceStore } from '@state/workspaceStore';

import { loadDocument, saveDocument } from './documentIO';

import type { H5Bridge } from './electronBridge';
import type { WorkspaceRef } from '@core/workspace/schema';

const stubBridge = (impl: Partial<H5Bridge> = {}): H5Bridge => {
  const defaults: H5Bridge = {
    openDialog: vi.fn(() => Promise.resolve(null)),
    saveAsDialog: vi.fn(() => Promise.resolve(null)),
    readJson: vi.fn(() => Promise.resolve({ ok: false as const, error: 'unused' })),
    writeJson: vi.fn(() => Promise.resolve({ ok: true as const, bytes: 0 })),
    pickFolder: vi.fn(() => Promise.resolve(null)),
    createWorkspace: vi.fn(() => Promise.resolve({ ok: true as const })),
    statWorkspace: vi.fn(() => Promise.resolve({ ok: false as const, error: 'unused' })),
    readDocumentInWorkspace: vi.fn(() =>
      Promise.resolve({ ok: false as const, error: 'unused' }),
    ),
    writeDocumentInWorkspace: vi.fn(() =>
      Promise.resolve({ ok: true as const, bytes: 0 }),
    ),
    listDocumentsInWorkspace: vi.fn(() =>
      Promise.resolve({ ok: true as const, entries: [] }),
    ),
    loadRecents: vi.fn(() => Promise.resolve({ ok: true as const, entries: [] })),
    saveRecents: vi.fn(() => Promise.resolve({ ok: true as const })),
    setWindowTitle: vi.fn(() => Promise.resolve({ ok: true as const })),
  };
  return { ...defaults, ...impl };
};

const setBridge = (bridge: H5Bridge | undefined): void => {
  (window as unknown as { h5?: H5Bridge }).h5 = bridge;
};

const enterEditor = (): void => {
  const ref: WorkspaceRef = { path: '/ws', name: 'ws' };
  const docId = asDocumentId('doc-1');
  useWorkspaceStore.setState({
    phase: 'editor',
    current: ref,
    activeDocId: docId,
    recents: [],
  });
};

const seedJson = JSON.stringify({
  version: 1,
  meta: { tileSize: 16, mapSize: { width: 256, height: 256 } },
  layers: [
    {
      id: 'layer.tile.seed',
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
});

describe('documentIO', () => {
  let originalBridge: H5Bridge | undefined;

  beforeEach(() => {
    originalBridge = window.h5;
    useDocumentStore.getState().reset();
    useWorkspaceStore.setState({
      phase: 'launcher',
      current: null,
      activeDocId: null,
      recents: [],
    });
  });

  afterEach(() => {
    setBridge(originalBridge);
    vi.restoreAllMocks();
  });

  describe('saveDocument', () => {
    it('refuses when the bridge is missing', async () => {
      setBridge(undefined);
      const out = await saveDocument();
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.error).toMatch(/Electron/);
    });

    it('refuses when no workspace is active', async () => {
      setBridge(stubBridge());
      const out = await saveDocument();
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.error).toMatch(/workspace/i);
    });

    it('writes JSON to <workspace>/documents/<docId>.json', async () => {
      enterEditor();
      const write = vi.fn((_path: string, _id: string, text: string) =>
        Promise.resolve({ ok: true as const, bytes: text.length }),
      );
      setBridge(stubBridge({ writeDocumentInWorkspace: write }));

      const out = await saveDocument();
      expect(out.ok).toBe(true);
      if (out.ok) {
        expect(out.path).toBe('/ws/documents/doc-1.json');
        expect(out.bytes).toBeGreaterThan(0);
      }
      expect(write).toHaveBeenCalledOnce();
      const [folder, id, text] = write.mock.calls[0] ?? [];
      expect(folder).toBe('/ws');
      expect(id).toBe('doc-1');
      const parsed: unknown = JSON.parse(text as string);
      expect((parsed as { version: number }).version).toBe(1);
    });

    it('forwards write failures', async () => {
      enterEditor();
      setBridge(
        stubBridge({
          writeDocumentInWorkspace: vi.fn(() =>
            Promise.resolve({ ok: false as const, error: 'EACCES' }),
          ),
        }),
      );
      const out = await saveDocument();
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.error).toBe('EACCES');
    });
  });

  describe('loadDocument', () => {
    it('refuses when the bridge is missing', async () => {
      setBridge(undefined);
      const out = await loadDocument();
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.error).toMatch(/Electron/);
    });

    it('refuses when no workspace is active', async () => {
      setBridge(stubBridge());
      const out = await loadDocument();
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.error).toMatch(/workspace/i);
    });

    it('forwards read errors', async () => {
      enterEditor();
      setBridge(
        stubBridge({
          readDocumentInWorkspace: vi.fn(() =>
            Promise.resolve({ ok: false as const, error: 'ENOENT' }),
          ),
        }),
      );
      const out = await loadDocument();
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.error).toBe('ENOENT');
    });

    it('returns a clear error on malformed JSON', async () => {
      enterEditor();
      setBridge(
        stubBridge({
          readDocumentInWorkspace: vi.fn(() =>
            Promise.resolve({ ok: true as const, text: '{not json' }),
          ),
        }),
      );
      const out = await loadDocument();
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.error).toMatch(/malformed/);
    });

    it('hydrates the document store and reports layerCount + path on success', async () => {
      enterEditor();
      setBridge(
        stubBridge({
          readDocumentInWorkspace: vi.fn(() =>
            Promise.resolve({ ok: true as const, text: seedJson }),
          ),
        }),
      );
      const out = await loadDocument();
      expect(out.ok).toBe(true);
      if (out.ok) {
        expect(out.layerCount).toBe(1);
        expect(out.path).toBe('/ws/documents/doc-1.json');
      }
      expect(useDocumentStore.getState().meta.tileSize).toBe(16);
    });
  });
});