/**
 * Recents — manipulate the in-memory recent-workspaces list.
 *
 * Two flavors:
 *
 *   - Pure: `pushRecent(current, ref)` / `removeRecent(current, path)`
 *     take the current list and return the next list. They are easy
 *     to unit-test (no IPC, no time mocking beyond an injectable
 *     `now`) and the only callers (the Launcher) drive them
 *     imperatively. They also cap the list length so a buggy caller
 *     can't bloat the file.
 *
 *   - I/O-flavored: `loadRecents()` / `saveRecents(list)` go through
 *     the IPC bridge to `<userData>/recent.json`. The main process
 *     owns the path; the renderer never names it.
 *
 * Persistence is fire-and-forget for save (the user's frequent
 * experience shouldn't be a write on every click) — Launcher can
 * `await saveRecents()` when the launcher unmounts or after each
 * mutation; both work because the bridge is debounced by virtue of
 * being in-process.
 */

import { loadRecents as loadRecentsIpc, saveRecents as saveRecentsIpc } from './electronBridge';

import type { RecentEntry, WorkspaceRef } from '@core/workspace/schema';

export const MAX_RECENT_ENTRIES = 10;

const now = (): number => Date.now();

/**
 * Returns the next list with `ref` moved to the front (and updated
 * to "now"). If the path was already in the list, the old entry is
 * removed first so duplicates don't accumulate. Length is capped.
 */
export const pushRecent = (
  current: ReadonlyArray<RecentEntry>,
  ref: WorkspaceRef,
  nowFn: () => number = now,
): ReadonlyArray<RecentEntry> => {
  const filtered = current.filter((entry) => entry.path !== ref.path);
  const next: RecentEntry[] = [
    { path: ref.path, name: ref.name, lastOpenedAt: nowFn() },
    ...filtered,
  ];
  return next.slice(0, MAX_RECENT_ENTRIES);
};

/** Remove the entry with the matching path. Order otherwise stable. */
export const removeRecent = (
  current: ReadonlyArray<RecentEntry>,
  path: string,
): ReadonlyArray<RecentEntry> => current.filter((entry) => entry.path !== path);

/**
 * Read the on-disk recents list via IPC. Returns `[]` if the bridge
 * is missing (browser fallback) or if the file doesn't exist yet
 * (first run).
 */
export const loadRecents = async (): Promise<ReadonlyArray<RecentEntry>> => {
  const result = await loadRecentsIpc();
  if (!result.ok) return [];
  return result.entries;
};

/**
 * Persist the recents list via IPC. Silently succeeds when the
 * bridge is missing — browser-mode launchers don't persist anyway.
 */
export const saveRecents = async (
  entries: ReadonlyArray<RecentEntry>,
): Promise<{ ok: boolean; error?: string }> => {
  const result = await saveRecentsIpc(entries.map((e) => ({ ...e })));
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
};
