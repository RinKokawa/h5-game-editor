/**
 * ExtensionRegistry — unit tests.
 *
 * Covers the four registration surfaces (tool, panel,
 * command-palette, serializer), the lookup APIs, and the
 * duplicate-id guard. Also exercises `install()` end-to-end:
 * an extension's `register()` callback runs against the same
 * registry that receives the install call, in install order.
 */

import { describe, expect, it } from 'vitest';

import { ExtensionRegistry } from './registry';

import type { EditorExtension, ToolDefinition } from './types';

const makeToolDef = (id: string): ToolDefinition => ({
  id,
  factory: () => {
    throw new Error('factory should not be called by the registry');
  },
  labelKey: `toolbar.tool.${id}`,
});

describe('ExtensionRegistry', () => {
  it('registers and looks up a tool by id', () => {
    const reg = new ExtensionRegistry();
    const def = makeToolDef('brush');
    reg.registerTool(def);
    expect(reg.getTool('brush')).toBe(def);
    expect(reg.getTool('nonexistent')).toBeUndefined();
    expect(reg.listTools()).toEqual([def]);
  });

  it('throws on duplicate tool ids', () => {
    const reg = new ExtensionRegistry();
    reg.registerTool(makeToolDef('brush'));
    expect(() => reg.registerTool(makeToolDef('brush'))).toThrow(/duplicate tool id/);
  });

  it('registers and lists panels, throws on duplicate id', () => {
    const reg = new ExtensionRegistry();
    const renderA = (): null => null;
    const renderB = (): null => null;
    reg.registerPanel({ id: 'layers', titleKey: 'panel.layers', dockSide: 'right', render: renderA });
    reg.registerPanel({ id: 'props', titleKey: 'panel.properties', dockSide: 'right', render: renderB });
    expect(reg.listPanels()).toHaveLength(2);
    expect(
      () =>
        reg.registerPanel({
          id: 'layers',
          titleKey: 'panel.layers',
          dockSide: 'right',
          render: renderA,
        }),
    ).toThrow(/duplicate panel id/);
  });

  it('registers and looks up command-palette entries', () => {
    const reg = new ExtensionRegistry();
    let invoked = 0;
    reg.registerCommandPaletteEntry({
      id: 'cmd.openLauncher',
      titleKey: 'cmd.launcher',
      run: () => {
        invoked += 1;
      },
    });
    const entry = reg.getCommandPaletteEntry('cmd.openLauncher');
    expect(entry).toBeDefined();
    entry?.run();
    expect(invoked).toBe(1);
    expect(reg.listCommandPaletteEntries()).toHaveLength(1);
  });

  it('throws on duplicate command-palette ids', () => {
    const reg = new ExtensionRegistry();
    reg.registerCommandPaletteEntry({
      id: 'cmd.openLauncher',
      titleKey: 'cmd.launcher',
      run: () => undefined,
    });
    expect(() =>
      reg.registerCommandPaletteEntry({
        id: 'cmd.openLauncher',
        titleKey: 'cmd.launcher',
        run: () => undefined,
      }),
    ).toThrow(/duplicate command-palette id/);
  });

  it('registers and looks up serializers, throws on duplicate format', () => {
    const reg = new ExtensionRegistry();
    const ser = {
      format: 'h5doc.v1',
      serialize: () => '{}',
      deserialize: () => ({}),
    };
    reg.registerSerializer(ser);
    expect(reg.getSerializer('h5doc.v1')).toBe(ser);
    expect(reg.listSerializers()).toEqual([ser]);
    expect(() => reg.registerSerializer(ser)).toThrow(/duplicate serializer format/);
  });

  it('install(extension) runs the extension against the registry', () => {
    const reg = new ExtensionRegistry();
    const calls: string[] = [];
    const ext: EditorExtension = {
      id: 'test.ext',
      displayName: 'Test',
      version: '0.0.0',
      register: (r) => {
        calls.push('register');
        r.registerTool(makeToolDef('test-tool'));
      },
    };
    reg.install(ext);
    expect(calls).toEqual(['register']);
    expect(reg.getTool('test-tool')).toBeDefined();
    expect(reg.listExtensions()).toEqual([ext]);
  });

  it('lists extensions in install order', () => {
    const reg = new ExtensionRegistry();
    const a: EditorExtension = {
      id: 'a',
      displayName: 'A',
      version: '0',
      register: () => undefined,
    };
    const b: EditorExtension = {
      id: 'b',
      displayName: 'B',
      version: '0',
      register: () => undefined,
    };
    reg.install(a);
    reg.install(b);
    expect(reg.listExtensions().map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('allows the same extension author to register multiple tools in one install', () => {
    const reg = new ExtensionRegistry();
    const ext: EditorExtension = {
      id: 'tools.bundle',
      displayName: 'Tools bundle',
      version: '0',
      register: (r) => {
        r.registerTool(makeToolDef('t1'));
        r.registerTool(makeToolDef('t2'));
        r.registerTool(makeToolDef('t3'));
      },
    };
    reg.install(ext);
    expect(reg.listTools()).toHaveLength(3);
  });
});