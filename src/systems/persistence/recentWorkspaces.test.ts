/**
 * recentWorkspaces — unit tests.
 *
 * `pushRecent` and `removeRecent` are pure list manipulations — easy
 * to unit-test without touching the IPC bridge. `loadRecents` /
 * `saveRecents` delegate to the bridge; we mock `window.h5` for those.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  MAX_RECENT_ENTRIES,
  loadRecents,
  pushRecent,
  removeRecent,
  saveRecents,
} from './recentWorkspaces';

import type { H5Bridge } from './electronBridge';
import type { RecentEntry, WorkspaceRef } from '@core/workspace/schema';

const ref = (path: string, name = path): WorkspaceRef => ({ path, name });
const entry = (path: string, lastOpenedAt = 1): RecentEntry => ({
  path,
  name: path,
  lastOpenedAt,
});

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

describe('pushRecent', () => {
  it('appends a fresh ref to an empty list', () => {
    const now = 1000;
    const next = pushRecent([], ref('/a', 'A'), () => now);
    expect(next).toEqual([{ path: '/a', name: 'A', lastOpenedAt: now }]);
  });

  it('moves an existing ref to the front and updates the timestamp', () => {
    const current: RecentEntry[] = [entry('/b', 200), entry('/a', 100)];
    const now = 999;
    const next = pushRecent(current, ref('/a', 'A'), () => now);
    expect(next[0]).toEqual({ path: '/a', name: 'A', lastOpenedAt: now });
    expect(next[1]?.path).toBe('/b');
    expect(next.length).toBe(2);
  });

  it('does not accumulate duplicates', () => {
    const current = pushRecent([], ref('/a'), () => 1);
    const next = pushRecent(current, ref('/a'), () => 2);
    expect(next.length).toBe(1);
    expect(next[0]?.lastOpenedAt).toBe(2);
  });

  it('caps the list at MAX_RECENT_ENTRIES', () => {
    let current: RecentEntry[] = [];
    for (let i = 0; i < MAX_RECENT_ENTRIES + 5; i++) {
      current = [...pushRecent(current, ref(`/p${i}`), () => i)];
    }
    expect(current.length).toBe(MAX_RECENT_ENTRIES);
    expect(current[0]?.path).toBe(`/p${MAX_RECENT_ENTRIES + 4}`);
  });
});

describe('removeRecent', () => {
  it('removes the matching path and preserves order', () => {
    const current: RecentEntry[] = [entry('/a', 1), entry('/b', 2), entry('/c', 3)];
    const next = removeRecent(current, '/b');
    expect(next.map((e) => e.path)).toEqual(['/a', '/c']);
  });

  it('returns the same shape when the path is missing', () => {
    const current: RecentEntry[] = [entry('/a', 1)];
    const next = removeRecent(current, '/missing');
    expect(next).toEqual(current);
  });
});

describe('loadRecents / saveRecents', () => {
  let originalBridge: H5Bridge | undefined;

  beforeEach(() => {
    originalBridge = window.h5;
  });

  afterEach(() => {
    setBridge(originalBridge);
    vi.restoreAllMocks();
  });

  it('loadRecents returns the bridge entries when ok', async () => {
    const entries: RecentEntry[] = [entry('/a', 1)];
    setBridge(
      stubBridge({
        loadRecents: vi.fn(() => Promise.resolve({ ok: true as const, entries })),
      }),
    );
    const out = await loadRecents();
    expect(out).toEqual(entries);
  });

  it('loadRecents returns [] when the bridge reports failure', async () => {
    setBridge(
      stubBridge({
        loadRecents: vi.fn(() => Promise.resolve({ ok: false as const, error: 'nope' })),
      }),
    );
    const out = await loadRecents();
    expect(out).toEqual([]);
  });

  it('loadRecents returns [] when the bridge is missing (browser fallback)', async () => {
    setBridge(undefined);
    const out = await loadRecents();
    expect(out).toEqual([]);
  });

  it('saveRecents returns ok on success', async () => {
    const save = vi.fn(() => Promise.resolve({ ok: true as const }));
    setBridge(stubBridge({ saveRecents: save }));
    const out = await saveRecents([entry('/a', 1)]);
    expect(out).toEqual({ ok: true });
    expect(save).toHaveBeenCalledOnce();
  });

  it('saveRecents forwards bridge errors', async () => {
    setBridge(
      stubBridge({
        saveRecents: vi.fn(() => Promise.resolve({ ok: false as const, error: 'disk full' })),
      }),
    );
    const out = await saveRecents([entry('/a', 1)]);
    expect(out).toEqual({ ok: false, error: 'disk full' });
  });

  it('saveRecents returns ok when the bridge is missing (browser fallback)', async () => {
    setBridge(undefined);
    const out = await saveRecents([entry('/a', 1)]);
    expect(out).toEqual({ ok: true });
  });

  it('saveRecents sends plain-object copies (no ReadonlyArray shape)', async () => {
    const save = vi.fn((_entries: ReadonlyArray<RecentEntry>) =>
      Promise.resolve({ ok: true as const }),
    );
    setBridge(stubBridge({ saveRecents: save }));
    await saveRecents([entry('/a', 1)]);
    const sent = save.mock.calls[0]?.[0];
    expect(Array.isArray(sent)).toBe(true);
    expect(sent?.[0]).toEqual({ path: '/a', name: '/a', lastOpenedAt: 1 });
  });
});