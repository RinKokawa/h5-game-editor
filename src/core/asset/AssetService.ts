/**
 * Core: AssetService — sole mutator of the in-memory AssetManifest.
 *
 * Step 30-A. Mutations are issued by ImportAssetDialog (add), the
 * AssetBrowserPanel rename / delete UI (deferred to a later step),
 * and `registerBuiltinAssets` at app boot. Subscribers — chiefly the
 * `assetStore` mirror — listen via {@link subscribe}.
 *
 * Built-in assets are read-only: {@link removeAsset} and
 * {@link renameAsset} throw for builtin entries. Callers that need to
 * surface this to the user should catch the error.
 */

import { EventEmitter } from '@core/event/EventEmitter';

import type { AssetId, SemanticKind } from '@editor/map/schema/asset';

import {
  EMPTY_MANIFEST,
  MANIFEST_VERSION,
  isBuiltinEntry,
  type AssetEntry,
  type AssetManifest,
} from './types';

import type { Unsubscribe } from '@core/event/EventEmitter';

/** Discriminated union of every AssetService mutation. */
export type AssetChange =
  | { readonly kind: 'add'; readonly entry: AssetEntry }
  | { readonly kind: 'remove'; readonly entry: AssetEntry }
  | { readonly kind: 'rename'; readonly entry: AssetEntry };

export class AssetService {
  private manifest: AssetManifest = EMPTY_MANIFEST;
  private readonly emitter = new EventEmitter<AssetChange>();

  constructor(initial: AssetManifest = EMPTY_MANIFEST) {
    this.manifest = initial;
  }

  // ── manifest access ─────────────────────────────────────────────────

  /** Read-only snapshot of the current manifest. */
  snapshot(): AssetManifest {
    return this.manifest;
  }

  /** Replace the entire manifest. Boot-time use only. */
  setManifest(manifest: AssetManifest): void {
    this.manifest = manifest;
  }

  // ── lookups ────────────────────────────────────────────────────────

  getAsset(id: AssetId): AssetEntry | null {
    return this.manifest.entries.find((e) => e.id === id) ?? null;
  }

  listByKind(kind: SemanticKind): readonly AssetEntry[] {
    return this.manifest.entries.filter((e) => e.semanticKind === kind);
  }

  listBuiltins(): readonly AssetEntry[] {
    return this.manifest.entries.filter((e) => e.builtin);
  }

  listImported(): readonly AssetEntry[] {
    return this.manifest.entries.filter((e) => !e.builtin);
  }

  // ── mutations ──────────────────────────────────────────────────────

  /**
   * Add a new asset. Throws on duplicate id (callers should mint unique
   * ids). Emits `{ kind: 'add', entry }`.
   */
  addAsset(entry: AssetEntry): void {
    if (this.manifest.entries.some((e) => e.id === entry.id)) {
      throw new Error(`AssetService: duplicate asset id "${entry.id}"`);
    }
    this.manifest = {
      version: MANIFEST_VERSION,
      entries: [...this.manifest.entries, entry],
    };
    this.emitter.emit({ kind: 'add', entry });
  }

  /**
   * Remove an asset. Returns the removed entry, or `null` if the id
   * was unknown. Throws when the entry is a built-in.
   */
  removeAsset(id: AssetId): AssetEntry | null {
    const existing = this.manifest.entries.find((e) => e.id === id);
    if (!existing) return null;
    if (isBuiltinEntry(existing)) {
      throw new Error(`AssetService: cannot remove built-in asset "${id}"`);
    }
    this.manifest = {
      version: MANIFEST_VERSION,
      entries: this.manifest.entries.filter((e) => e.id !== id),
    };
    this.emitter.emit({ kind: 'remove', entry: existing });
    return existing;
  }

  /**
   * Rename an asset (display name only — the id stays the path-derived
   * string). Returns the renamed entry, or `null` if unknown. Throws
   * when the entry is a built-in.
   */
  renameAsset(id: AssetId, newName: string): AssetEntry | null {
    const existing = this.manifest.entries.find((e) => e.id === id);
    if (!existing) return null;
    if (isBuiltinEntry(existing)) {
      throw new Error(`AssetService: cannot rename built-in asset "${id}"`);
    }
    const renamed: AssetEntry = { ...existing, name: newName };
    this.manifest = {
      version: MANIFEST_VERSION,
      entries: this.manifest.entries.map((e) => (e.id === id ? renamed : e)),
    };
    this.emitter.emit({ kind: 'rename', entry: renamed });
    return renamed;
  }

  // ── subscriptions ──────────────────────────────────────────────────

  subscribe(listener: (change: AssetChange) => void): Unsubscribe {
    return this.emitter.subscribe(listener);
  }

  /** Drop all listeners. Test-only convenience. */
  clearListeners(): void {
    this.emitter.clear();
  }
}