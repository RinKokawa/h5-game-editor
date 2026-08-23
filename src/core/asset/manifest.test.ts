/**
 * Asset manifest — IO tests.
 *
 * Step 30-A. The IO path goes through the Electron IPC bridge, so
 * most tests assert the **non-Electron** fallback paths (the only ones
 * that run in vitest without a fake bridge). The round-trip case is
 * covered indirectly via the type guard test — full IPC round-trip
 * coverage lives in `electron/main.ts` integration tests, out of
 * scope here.
 */

import { describe, expect, it } from 'vitest';

import {
  EMPTY_MANIFEST,
  MANIFEST_VERSION,
  isAssetManifest,
  type AssetManifest,
} from './types';
import { loadManifest, saveManifest } from './manifest';

describe('asset manifest', () => {
  describe('isAssetManifest', () => {
    it('accepts a valid manifest', () => {
      const ok: AssetManifest = { version: MANIFEST_VERSION, entries: [] };
      expect(isAssetManifest(ok)).toBe(true);
    });

    it('rejects a wrong-version manifest', () => {
      expect(isAssetManifest({ version: 99, entries: [] })).toBe(false);
    });

    it('rejects a non-array entries field', () => {
      expect(isAssetManifest({ version: MANIFEST_VERSION, entries: 'oops' })).toBe(false);
    });

    it('rejects null and primitives', () => {
      expect(isAssetManifest(null)).toBe(false);
      expect(isAssetManifest(42)).toBe(false);
      expect(isAssetManifest('manifest')).toBe(false);
    });
  });

  describe('loadManifest outside Electron', () => {
    it('returns the empty manifest when window.h5 is absent', async () => {
      const result = await loadManifest('/whatever');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.manifest).toEqual(EMPTY_MANIFEST);
      }
    });
  });

  describe('saveManifest outside Electron', () => {
    it('returns a structured failure when window.h5 is absent', async () => {
      const result = await saveManifest('/whatever', EMPTY_MANIFEST);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/Electron/);
      }
    });
  });
});