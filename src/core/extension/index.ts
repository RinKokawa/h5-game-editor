/**
 * Core: Extension Registry.
 *
 * Allows future editor types (Dialogue, Animation, Quest, …) and
 * third-party plugins to register tools, panels, command-palette
 * entries, and document serializers without modifying the framework.
 *
 * Step 24 lifts this from an empty stub to a real, contract-first
 * registry. Built-in editor contributions (the Map editor's seven
 * tools, the Properties / Palette / Layer panels) are installed at
 * app boot — see `app/ExtensionHost.ts`.
 */

export { ExtensionRegistry } from './registry';
export type {
  CommandPaletteEntry,
  DocumentSerializer,
  EditorExtension,
  EditorRegistry,
  ExtensionId,
  PanelDefinition,
  PanelDockSide,
  ToolDefinition,
} from './types';