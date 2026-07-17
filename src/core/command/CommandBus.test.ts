/**
 * CommandBus — unit tests.
 *
 * Drives the bus with a stub DocumentService and three trivial
 * Commands. Asserts do/undo ordering, redo-stack clearing on a new
 * execute, subscriber notifications, and clearHistory behavior.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CommandBus } from './CommandBus';

import type { Command } from './Command';
import type { DocumentService } from '@core/document/DocumentService';

const stubService = (): DocumentService => ({}) as DocumentService;

const trackingCmd = (tag: string, log: string[]): Command => ({
  kind: tag,
  do: () => {
    log.push(`do:${tag}`);
  },
  undo: () => {
    log.push(`undo:${tag}`);
  },
});

describe('CommandBus', () => {
  let bus: CommandBus;
  let log: string[];

  beforeEach(() => {
    bus = new CommandBus(stubService());
    log = [];
  });

  it('execute runs do() and pushes the command onto the undo stack', () => {
    bus.execute(trackingCmd('a', log));
    expect(log).toEqual(['do:a']);
    expect(bus.canUndo()).toBe(true);
    expect(bus.canRedo()).toBe(false);
  });

  it('undo runs undo() and moves the command onto the redo stack', () => {
    bus.execute(trackingCmd('a', log));
    bus.undo();
    expect(log).toEqual(['do:a', 'undo:a']);
    expect(bus.canUndo()).toBe(false);
    expect(bus.canRedo()).toBe(true);
  });

  it('redo re-runs do()', () => {
    bus.execute(trackingCmd('a', log));
    bus.undo();
    bus.redo();
    expect(log).toEqual(['do:a', 'undo:a', 'do:a']);
    expect(bus.canRedo()).toBe(false);
  });

  it('a fresh execute clears the redo stack', () => {
    bus.execute(trackingCmd('a', log));
    bus.undo();
    expect(bus.canRedo()).toBe(true);
    bus.execute(trackingCmd('b', log));
    expect(bus.canRedo()).toBe(false);
  });

  it('undo on empty stack is a no-op', () => {
    bus.undo();
    expect(log).toEqual([]);
  });

  it('redo on empty stack is a no-op', () => {
    bus.redo();
    expect(log).toEqual([]);
  });

  it('subscribe() fires on every execute / undo / redo', () => {
    const listener = vi.fn();
    const unsub = bus.subscribe(listener);
    bus.execute(trackingCmd('a', log));
    bus.undo();
    bus.redo();
    expect(listener).toHaveBeenCalledTimes(3);
    unsub();
  });

  it('clearHistory wipes both stacks and notifies', () => {
    const listener = vi.fn();
    bus.subscribe(listener);
    bus.execute(trackingCmd('a', log));
    bus.execute(trackingCmd('b', log));
    listener.mockClear();
    bus.clearHistory();
    expect(bus.canUndo()).toBe(false);
    expect(bus.canRedo()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('accepts commands whose do/undo receive the injected service', () => {
    // Lock the CommandBus → DocumentService wiring by passing a real
    // service to a command that records the service argument.
    let received: DocumentService | null = null;
    const captureCmd: Command = {
      kind: 'capture',
      do: (s) => {
        received = s;
      },
      undo: () => undefined,
    };
    const real = stubService();
    const localBus = new CommandBus(real);
    localBus.execute(captureCmd);
    expect(received).toBe(real);
  });
});