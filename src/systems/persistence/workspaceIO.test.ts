/**
 * workspaceIO — unit tests.
 *
 * The four exported functions are thin orchestrators over the
 * `window.h5` bridge plus the document store. We mock the bridge
 * via `vi.stubGlobal` (set / clear `window.h5`) and reset the
 * document store between tests so behavior is order-independent.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { asDocumentId } from '@editor/map/schema/ids';
import { useDocumentStore } from '@state/documentStore';
import { useWorkspaceStore } from '@state/workspaceStore';

import {
  createNewWorkspace,
  loadActiveDocument,
  openExistingWorkspace,
  serializeActiveDocument,
} from './workspaceIO';

import type { H5Bridge } from './electronBridge';
import type { DocumentId } from '@editor/map/schema/ids';

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
  };
  return { ...defaults, ...impl };
};

const setBridge = (bridge: H5Bridge | undefined): void => {
  (window as unknown as { h5?: H5Bridge }).h5 = bridge;
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

describe('workspaceIO', () => {
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

  describe('createNewWorkspace', () => {
    it('refuses when the bridge is missing', async () => {
      setBridge(undefined);
      const out = await createNewWorkspace('My Project');
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.error).toMatch(/Electron-only/);
    });

    it('returns an error when the user cancels the folder picker', async () => {
      setBridge(stubBridge({ pickFolder: vi.fn(() => Promise.resolve(null)) }));
      const out = await createNewWorkspace('My Project');
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.error).toMatch(/cancelled/i);
    });

    it('returns an error when the workspace name is empty', async () => {
      setBridge(stubBridge({ pickFolder: vi.fn(() => Promise.resolve('/x')) }));
      const out = await createNewWorkspace('   ');
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.error).toMatch(/empty/);
    });

    it('forwards the create failure', async () => {
      setBridge(
        stubBridge({
          pickFolder: vi.fn(() => Promise.resolve('/x')),
          createWorkspace: vi.fn(() =>
            Promise.resolve({ ok: false as const, error: 'permission denied' }),
          ),
        }),
      );
      const out = await createNewWorkspace('Project');
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.error).toBe('permission denied');
    });

    it('forwards the stat failure', async () => {
      setBridge(
        stubBridge({
          pickFolder: vi.fn(() => Promise.resolve('/x')),
          createWorkspace: vi.fn(() => Promise.resolve({ ok: true as const })),
          statWorkspace: vi.fn(() =>
            Promise.resolve({ ok: false as const, error: 'stat fail' }),
          ),
        }),
      );
      const out = await createNewWorkspace('Project');
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.error).toBe('stat fail');
    });

    it('returns ref + activeDocId on success', async () => {
      setBridge(
        stubBridge({
          pickFolder: vi.fn(() => Promise.resolve('/path/to/ws')),
          createWorkspace: vi.fn(() => Promise.resolve({ ok: true as const })),
          statWorkspace: vi.fn(() =>
            Promise.resolve({ ok: true as const, name: 'ws', activeDocId: 'doc-1' }),
          ),
        }),
      );
      const out = await createNewWorkspace('Project');
      expect(out.ok).toBe(true);
      if (out.ok) {
        expect(out.ref).toEqual({ path: '/path/to/ws', name: 'ws' });
        expect(out.activeDocId).toBe('doc-1');
      }
    });
  });

  describe('openExistingWorkspace', () => {
    it('refuses when the bridge is missing', async () => {
      setBridge(undefined);
      const out = await openExistingWorkspace('/x');
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.error).toMatch(/Electron-only/);
    });

    it('forwards the stat failure', async () => {
      setBridge(
        stubBridge({
          statWorkspace: vi.fn(() =>
            Promise.resolve({ ok: false as const, error: 'no config' }),
          ),
        }),
      );
      const out = await openExistingWorkspace('/x');
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.error).toBe('no config');
    });

    it('returns ref + activeDocId on success', async () => {
      setBridge(
        stubBridge({
          statWorkspace: vi.fn(() =>
            Promise.resolve({ ok: true as const, name: 'Old', activeDocId: 'doc-2' }),
          ),
        }),
      );
      const out = await openExistingWorkspace('/old');
      expect(out.ok).toBe(true);
      if (out.ok) {
        expect(out.ref).toEqual({ path: '/old', name: 'Old' });
        expect(out.activeDocId).toBe('doc-2');
      }
    });
  });

  describe('loadActiveDocument', () => {
    it('refuses when the bridge is missing', async () => {
      setBridge(undefined);
      const out = await loadActiveDocument('/x', asDocumentId('doc-1'));
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.error).toMatch(/Electron-only/);
    });

    it('forwards read errors', async () => {
      setBridge(
        stubBridge({
          readDocumentInWorkspace: vi.fn(() =>
            Promise.resolve({ ok: false as const, error: 'missing' }),
          ),
        }),
      );
      const out = await loadActiveDocument('/x', asDocumentId('doc-1'));
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.error).toBe('missing');
    });

    it('returns a clear error on malformed JSON', async () => {
      setBridge(
        stubBridge({
          readDocumentInWorkspace: vi.fn(() =>
            Promise.resolve({ ok: true as const, text: '{not json' }),
          ),
        }),
      );
      const out = await loadActiveDocument('/x', asDocumentId('doc-1'));
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.error).toMatch(/malformed/);
    });

    it('hydrates the document store and reports layerCount on success', async () => {
      setBridge(
        stubBridge({
          readDocumentInWorkspace: vi.fn(() =>
            Promise.resolve({ ok: true as const, text: seedJson }),
          ),
        }),
      );
      const docId: DocumentId = asDocumentId('doc-1');
      const out = await loadActiveDocument('/x', docId);
      expect(out.ok).toBe(true);
      if (out.ok) expect(out.layerCount).toBe(1);
      const state = useDocumentStore.getState();
      expect(state.meta.tileSize).toBe(16);
      expect(state.layers.length).toBe(1);
      expect(useWorkspaceStore.getState().activeDocId).toBe(docId);
    });
  });

  describe('serializeActiveDocument', () => {
    it('returns the serialized view of the current document store', () => {
      const out = serializeActiveDocument();
      expect(out.version).toBe(1);
      expect(out.layers.length).toBe(useDocumentStore.getState().layers.length);
      expect(out.meta.tileSize).toBe(useDocumentStore.getState().meta.tileSize);
    });
  });
});