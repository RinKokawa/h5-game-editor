/**
 * SetMapSizeCommand — unit tests.
 *
 * Verifies do/undo symmetry, prev/next capture at construction,
 * and that the event emitter fires once per mutation.
 */

import { describe, expect, it, beforeEach } from 'vitest';

import { DocumentService } from '@core/document/DocumentService';
import { useDocumentStore } from '@state/documentStore';

import { SetMapSizeCommand, setMapSize } from './SetMapSizeCommand';

const resetStore = (): void => {
  useDocumentStore.setState({
    meta: { tileSize: 32, mapSize: { width: 32 * 60, height: 32 * 34 } },
    layers: [],
    activeLayerId: undefined as never,
    entities: new Map(),
    colliders: new Map(),
  });
};

describe('SetMapSizeCommand', () => {
  beforeEach(() => {
    resetStore();
  });

  it('do applies next, undo restores prev', () => {
    const service = new DocumentService();
    const prev = service.getMeta().mapSize;
    const next = { width: 1280, height: 720 };
    const cmd = new SetMapSizeCommand(prev, next);

    cmd.do(service);
    expect(service.getMeta().mapSize).toEqual(next);

    cmd.undo(service);
    expect(service.getMeta().mapSize).toEqual(prev);
  });

  it('emits document:meta on do and undo', () => {
    const service = new DocumentService();
    const seen: string[] = [];
    service.subscribe((c) => {
      if (c.kind === 'document:meta') seen.push('meta');
    });
    const cmd = setMapSize(
      { width: 32 * 60, height: 32 * 34 },
      { width: 1280, height: 720 },
    );
    cmd.do(service);
    cmd.undo(service);
    expect(seen).toEqual(['meta', 'meta']);
  });

  it('rejects a non-positive width or height', () => {
    const prev = { width: 100, height: 100 };
    expect(() => new SetMapSizeCommand(prev, { width: 0, height: 100 })).toThrow();
    expect(() => new SetMapSizeCommand(prev, { width: 100, height: -1 })).toThrow();
  });

  it('symmetric construction helper matches direct construction', () => {
    expect(setMapSize({ width: 1, height: 1 }, { width: 2, height: 2 })).toBeInstanceOf(
      SetMapSizeCommand,
    );
  });
});
