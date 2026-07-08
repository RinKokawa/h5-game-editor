/**
 * Core: Workspace schema.
 *
 * A "workspace" is a directory on disk the user has chosen to author
 * a project in. The top level of a workspace contains:
 *
 *   h5-editor.json           — WorkspaceConfig (this file)
 *   documents/<docId>.json   — one Document per file
 *   assets/                  — imported assets (v0.1: empty)
 *
 * v0.1 ships a single Document per workspace (activeDocId). The
 * schema already supports a `documents[]` table so the multi-doc UI
 * in a future step doesn't need to migrate the on-disk shape.
 */

import type { DocumentId } from '@editor/map/schema/ids';

/**
 * `WorkspaceRef` — the minimal handle held in memory while the
 * workspace is active. `path` is the absolute directory path; `name`
 * is the folder basename (also displayed in the launcher recent list).
 */
export interface WorkspaceRef {
  readonly path: string;
  readonly name: string;
}

/**
 * A reference to a Document inside a workspace. v0.1 only ever has one
 * entry per workspace (`WorkspaceConfig.activeDocId`), but storing the
 * full list now means a future "open multiple documents" step doesn't
 * need to migrate the on-disk config format.
 */
export interface DocumentSummary {
  readonly id: DocumentId;
  readonly name: string;
}

/**
 * The on-disk shape of `h5-editor.json`.
 *
 * `version: 1` is the schema version. When adding fields, append — do
 * not reuse names — and write a migration alongside the loader.
 */
export interface WorkspaceConfig {
  readonly version: 1;
  readonly name: string;
  readonly activeDocId: DocumentId;
  readonly documents: ReadonlyArray<DocumentSummary>;
  readonly lastSavedAt: number;
}

/**
 * One entry in the "recent workspaces" list stored in Electron's
 * userData. Kept separate from `WorkspaceConfig` so a missing or
 * corrupt on-disk workspace doesn't silently nuke the recent entry
 * (we'd rather show the entry greyed out than lose the user's path).
 */
export interface RecentEntry {
  readonly path: string;
  readonly name: string;
  readonly lastOpenedAt: number;
}

/**
 * The on-disk shape of `recent.json`. v0.1 is just a flat list — when
 * we add fields (e.g. pinning, ordering), bump the version.
 */
export interface RecentList {
  readonly version: 1;
  readonly entries: ReadonlyArray<RecentEntry>;
}

/** Filename constants. Single source of truth — used by every IO path. */
export const WORKSPACE_CONFIG_FILENAME = 'h5-editor.json';
export const RECENT_LIST_FILENAME = 'recent.json';
export const DOCUMENTS_DIRNAME = 'documents';
export const ASSETS_DIRNAME = 'assets';
export const WORKSPACE_SCHEMA_VERSION = 1 as const;
export const RECENT_LIST_VERSION = 1 as const;
export const MAX_RECENT_ENTRIES = 10;

/**
 * Type guard for the on-disk config. Lenient on unknown fields so
 * future-proof formats don't crash older builds — we only care that
 * the fields we need are present and well-typed.
 */
export const isWorkspaceConfig = (raw: unknown): raw is WorkspaceConfig => {
  if (typeof raw !== 'object' || raw === null) return false;
  const r = raw as Record<string, unknown>;
  if (r['version'] !== 1) return false;
  if (typeof r['name'] !== 'string' || r['name'].length === 0) return false;
  if (typeof r['activeDocId'] !== 'string' || r['activeDocId'].length === 0) return false;
  if (!Array.isArray(r['documents'])) return false;
  if (typeof r['lastSavedAt'] !== 'number') return false;
  return true;
};

export const isRecentList = (raw: unknown): raw is RecentList => {
  if (typeof raw !== 'object' || raw === null) return false;
  const r = raw as Record<string, unknown>;
  if (r['version'] !== 1) return false;
  return Array.isArray(r['entries']);
};
