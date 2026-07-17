/**
 * Extension Registry — public type surface.
 *
 * Step 24 finally gives CLAUDE.md §5's "Editor extension points"
 * table a concrete shape: an `EditorExtension` is a unit of
 * contribution that registers tools, panels, command-palette
 * entries, or document serializers at app boot. The runtime
 * implementation lives in {@link ExtensionRegistry}.
 *
 * Extension authors should depend ONLY on this file and
 * {@link ExtensionRegistry} — no other module crosses the
 * `core/extension` boundary.
 */

import type { Tool } from '@shared/tool/Tool';
import type { ReactNode } from 'react';


/** Stable identifier (e.g. `'h5.dialogue'`). Used for dedup + lookup. */
export type ExtensionId = string;

/** A single tool contribution. `factory` is called per-attachment. */
export interface ToolDefinition {
  readonly id: string;
  readonly factory: () => Tool;
  /** i18n key for the toolbar label — never a literal. */
  readonly labelKey: string;
  /** Single-character shortcut (e.g. `'V'`, `'B'`). Omit for none. */
  readonly shortcutKey?: string;
}

/** Side where a panel docks inside the editor chrome. */
export type PanelDockSide = 'left' | 'right' | 'bottom';

/**
 * A panel that renders inside one of the three columns. `render`
 * returns a ReactNode so panels can mount arbitrary React trees;
 * the registry treats the result as opaque and stows it in a slot.
 */
export interface PanelDefinition {
  readonly id: string;
  readonly titleKey: string;
  readonly dockSide: PanelDockSide;
  readonly render: () => ReactNode;
}

/** A discoverable command in the (future) command palette. */
export interface CommandPaletteEntry {
  readonly id: string;
  readonly titleKey: string;
  readonly run: () => void;
}

/** A document-format serializer / deserializer pair. */
export interface DocumentSerializer {
  readonly format: string;
  readonly serialize: (doc: unknown) => string;
  readonly deserialize: (raw: string) => unknown;
}

/** Surface an extension writes into when it registers. */
export interface EditorRegistry {
  registerTool(def: ToolDefinition): void;
  registerPanel(def: PanelDefinition): void;
  registerCommandPaletteEntry(entry: CommandPaletteEntry): void;
  registerSerializer(serializer: DocumentSerializer): void;
}

/**
 * A self-contained editor contribution. `register` runs against the
 * shared registry; the host calls it once at app boot after all
 * built-in extensions have been installed.
 */
export interface EditorExtension {
  readonly id: ExtensionId;
  readonly displayName: string;
  readonly version: string;
  register(registry: EditorRegistry): void;
}