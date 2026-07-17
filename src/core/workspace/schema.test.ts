/**
 * Workspace schema — type-guard tests.
 *
 * isWorkspaceConfig and isRecentList are the on-disk-shape safety
 * net for everything IO. Both must reject unknown / wrong-type /
 * missing fields, and accept a well-formed payload.
 */

import { describe, expect, it } from 'vitest';

import { isRecentList, isWorkspaceConfig } from './schema';

describe('isWorkspaceConfig', () => {
  it('accepts a well-formed WorkspaceConfig', () => {
    expect(
      isWorkspaceConfig({
        version: 1,
        name: 'My Project',
        activeDocId: 'doc-1',
        documents: [{ id: 'doc-1', name: 'Main' }],
        lastSavedAt: 1700000000000,
      }),
    ).toBe(true);
  });

  it('rejects non-object input', () => {
    expect(isWorkspaceConfig(null)).toBe(false);
    expect(isWorkspaceConfig(undefined)).toBe(false);
    expect(isWorkspaceConfig(42)).toBe(false);
    expect(isWorkspaceConfig('hello')).toBe(false);
  });

  it('rejects wrong version', () => {
    expect(
      isWorkspaceConfig({
        version: 2,
        name: 'My Project',
        activeDocId: 'doc-1',
        documents: [],
        lastSavedAt: 0,
      }),
    ).toBe(false);
  });

  it('rejects missing or empty name', () => {
    expect(
      isWorkspaceConfig({
        version: 1,
        name: '',
        activeDocId: 'doc-1',
        documents: [],
        lastSavedAt: 0,
      }),
    ).toBe(false);
    const { name: _name, ...noName } = {
      version: 1,
      name: 'My Project',
      activeDocId: 'doc-1',
      documents: [],
      lastSavedAt: 0,
    };
    void _name;
    expect(isWorkspaceConfig(noName)).toBe(false);
  });

  it('rejects non-string activeDocId', () => {
    expect(
      isWorkspaceConfig({
        version: 1,
        name: 'My Project',
        activeDocId: 42,
        documents: [],
        lastSavedAt: 0,
      }),
    ).toBe(false);
  });

  it('rejects non-array documents', () => {
    expect(
      isWorkspaceConfig({
        version: 1,
        name: 'My Project',
        activeDocId: 'doc-1',
        documents: 'not-an-array',
        lastSavedAt: 0,
      }),
    ).toBe(false);
  });

  it('rejects non-number lastSavedAt', () => {
    expect(
      isWorkspaceConfig({
        version: 1,
        name: 'My Project',
        activeDocId: 'doc-1',
        documents: [],
        lastSavedAt: 'yesterday',
      }),
    ).toBe(false);
  });

  it('accepts configs with extra unknown fields (forward-compat)', () => {
    expect(
      isWorkspaceConfig({
        version: 1,
        name: 'My Project',
        activeDocId: 'doc-1',
        documents: [],
        lastSavedAt: 0,
        futureField: 'ok',
      }),
    ).toBe(true);
  });
});

describe('isRecentList', () => {
  it('accepts a well-formed RecentList', () => {
    expect(isRecentList({ version: 1, entries: [] })).toBe(true);
    expect(
      isRecentList({
        version: 1,
        entries: [
          { path: '/x', name: 'X', lastOpenedAt: 1 },
          { path: '/y', name: 'Y', lastOpenedAt: 2 },
        ],
      }),
    ).toBe(true);
  });

  it('rejects non-object input', () => {
    expect(isRecentList(null)).toBe(false);
    expect(isRecentList(undefined)).toBe(false);
    expect(isRecentList(42)).toBe(false);
  });

  it('rejects wrong version', () => {
    expect(isRecentList({ version: 2, entries: [] })).toBe(false);
  });

  it('rejects non-array entries', () => {
    expect(isRecentList({ version: 1, entries: 'oops' })).toBe(false);
  });
});