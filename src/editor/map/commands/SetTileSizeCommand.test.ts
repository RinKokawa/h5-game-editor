/**
 * SetTileSizeCommand — unit tests.
 *
 * Verifies do/undo symmetry, prev/next capture at construction,
 * and that the event emitter fires once per mutation.
 */

import { describe, expect, it, beforeEach } from 'vitest';

import { DocumentService } from '@core/document/DocumentService';
import { useDocumentStore } from '@state/documentStore';

import { SetTileSizeCommand, setTileSize } from './SetTileSizeCommand';

const resetStore = (): void => {
  useDocumentStore.setState({
    meta: { tileSize: 32, mapSize: { width: 32 * 60, height: 32 * 34 } },
    layers: [],
    activeLayerId: undefined as never,
    entities: new Map(),
    colliders: new Map(),
  });
};

describe('SetTileSizeCommand', () => {
  beforeEach(() => {
    resetStore();
  });

  it('do applies next, undo restores prev', () => {
    const service = new DocumentService();
    expect(service.getMeta().tileSize).toBe(32);

    const cmd = new SetTileSizeCommand(32, 64);
    cmd.do(service);
    expect(service.getMeta().tileSize).toBe(64);

    cmd.undo(service);
    expect(service.getMeta().tileSize).toBe(32);
  });

  it('emits document:meta on do and undo', () => {
    const service = new DocumentService();
    const seen: string[] = [];
    service.subscribe((c) => {
      if (c.kind === 'document:meta') seen.push('meta');
    });
    const cmd = setTileSize(32, 16);
    cmd.do(service);
    cmd.undo(service);
    expect(seen).toEqual(['meta', 'meta']);
  });

  it('rejects a non-positive next', () => {
    expect(() => new SetTileSizeCommand(32, 0)).toThrow();
    expect(() => new SetTileSizeCommand(32, -1)).toThrow();
  });

  it('symmetric construction helper matches direct construction', () => {
    expect(setTileSize(32, 64)).toBeInstanceOf(SetTileSizeCommand);
  });
});
