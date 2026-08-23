/**
 * AssetService — unit tests.
 *
 * Step 30-A. Drives every mutator end-to-end, asserts the AssetChange
 * payloads the emitter fires, and covers the read-only guard for
 * built-in entries. Each test starts from a fresh service so the
 * suite is order-independent.
 */

import { describe, expect, it } from 'vitest';

import { asAssetId } from '@editor/map/schema/asset';

import { AssetService } from './AssetService';

import type { AssetEntry } from './types';
import type { AssetChange } from './AssetService';

const makeEntry = (overrides: Partial<AssetEntry> = {}): AssetEntry => ({
  id: asAssetId('tileset/forest.png'),
  semanticKind: 'tileset',
  path: 'tileset/forest.png',
  name: 'Forest',
  hash: 'abc123',
  size: 1024,
  importedAt: 1_700_000_000_000,
  builtin: false,
  ...overrides,
});

const makeBuiltin = (overrides: Partial<AssetEntry> = {}): AssetEntry => ({
  ...makeEntry(overrides),
  id: asAssetId('_builtin/tileset/sprout.grass'),
  name: 'Grass',
  builtin: true,
});

const collectEvents = (service: AssetService): AssetChange[] => {
  const events: AssetChange[] = [];
  service.subscribe((change) => events.push(change));
  return events;
};

describe('AssetService', () => {
  describe('addAsset', () => {
    it('adds the entry and emits { kind: "add" }', () => {
      const service = new AssetService();
      const events = collectEvents(service);
      const entry = makeEntry();

      service.addAsset(entry);

      expect(service.snapshot().entries).toEqual([entry]);
      expect(events).toEqual([{ kind: 'add', entry }]);
    });

    it('throws on duplicate id', () => {
      const service = new AssetService();
      const entry = makeEntry();
      service.addAsset(entry);

      expect(() => service.addAsset(entry)).toThrowError(/duplicate asset id/);
    });
  });

  describe('removeAsset', () => {
    it('removes the entry and emits { kind: "remove" }', () => {
      const service = new AssetService();
      const entry = makeEntry();
      service.addAsset(entry);
      const events = collectEvents(service);

      const removed = service.removeAsset(entry.id);

      expect(removed).toEqual(entry);
      expect(service.snapshot().entries).toEqual([]);
      expect(events).toEqual([{ kind: 'remove', entry }]);
    });

    it('returns null for unknown id', () => {
      const service = new AssetService();
      expect(service.removeAsset(asAssetId('nope'))).toBeNull();
    });

    it('throws when removing a built-in', () => {
      const service = new AssetService();
      const builtin = makeBuiltin();
      service.addAsset(builtin);

      expect(() => service.removeAsset(builtin.id)).toThrowError(/built-in/);
    });
  });

  describe('renameAsset', () => {
    it('updates the name and emits { kind: "rename" }', () => {
      const service = new AssetService();
      const entry = makeEntry();
      service.addAsset(entry);
      const events = collectEvents(service);

      const renamed = service.renameAsset(entry.id, 'Forest Renamed');

      expect(renamed).not.toBeNull();
      expect(renamed?.name).toBe('Forest Renamed');
      expect(service.snapshot().entries[0]?.name).toBe('Forest Renamed');
      expect(events).toHaveLength(1);
      expect(events[0]?.kind).toBe('rename');
      expect(events[0]?.entry.name).toBe('Forest Renamed');
    });

    it('returns null for unknown id', () => {
      const service = new AssetService();
      expect(service.renameAsset(asAssetId('nope'), 'X')).toBeNull();
    });

    it('throws when renaming a built-in', () => {
      const service = new AssetService();
      const builtin = makeBuiltin();
      service.addAsset(builtin);

      expect(() => service.renameAsset(builtin.id, 'Whatever')).toThrowError(/built-in/);
    });
  });

  describe('lookups', () => {
    it('getAsset returns the entry by id', () => {
      const service = new AssetService();
      const entry = makeEntry();
      service.addAsset(entry);
      expect(service.getAsset(entry.id)).toEqual(entry);
    });

    it('getAsset returns null for unknown id', () => {
      const service = new AssetService();
      expect(service.getAsset(asAssetId('nope'))).toBeNull();
    });

    it('listByKind filters by semanticKind', () => {
      const service = new AssetService();
      const tileset = makeEntry({ id: asAssetId('tileset/a.png'), semanticKind: 'tileset' });
      const theme = makeEntry({ id: asAssetId('theme/a.json'), semanticKind: 'theme', name: 'Theme A' });
      service.addAsset(tileset);
      service.addAsset(theme);

      expect(service.listByKind('tileset')).toEqual([tileset]);
      expect(service.listByKind('theme')).toEqual([theme]);
      expect(service.listByKind('font')).toEqual([]);
    });

    it('listBuiltins / listImported split on the builtin flag', () => {
      const service = new AssetService();
      const builtin = makeBuiltin();
      const imported = makeEntry();
      service.addAsset(builtin);
      service.addAsset(imported);

      expect(service.listBuiltins()).toEqual([builtin]);
      expect(service.listImported()).toEqual([imported]);
    });
  });

  describe('subscribers', () => {
    it('subscribe returns an unsubscribe function', () => {
      const service = new AssetService();
      const events: AssetChange[] = [];
      const unsub = service.subscribe((change) => events.push(change));

      service.addAsset(makeEntry());
      unsub();
      service.addAsset(makeEntry({ id: asAssetId('tileset/two.png'), name: 'Two' }));

      expect(events).toHaveLength(1);
    });
  });
});