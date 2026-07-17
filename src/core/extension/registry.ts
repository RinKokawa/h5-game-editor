/**
 * ExtensionRegistry — runtime implementation of {@link EditorRegistry}.
 *
 * Step 24. Tools, panels, command-palette entries, and serializers
 * are all registered through the same registry; the host reads them
 * out by id. Duplicate ids throw at registration time so a
 * third-party extension can't silently shadow a built-in.
 *
 * `install(extension)` runs the extension's `register(registry)`
 * callback and stows the extension object so the host can later
 * enumerate what's mounted. The registry does NOT call into
 * React — it only owns the lookup tables.
 */

import type {
  CommandPaletteEntry,
  DocumentSerializer,
  EditorExtension,
  EditorRegistry,
  PanelDefinition,
  ToolDefinition,
} from './types';

export class ExtensionRegistry implements EditorRegistry {
  private readonly extensions: EditorExtension[] = [];
  private readonly tools = new Map<string, ToolDefinition>();
  private readonly panels: PanelDefinition[] = [];
  private readonly commandPaletteEntries = new Map<string, CommandPaletteEntry>();
  private readonly serializers = new Map<string, DocumentSerializer>();

  // ── install / lookup ────────────────────────────────────────────────

  install(extension: EditorExtension): void {
    extension.register(this);
    this.extensions.push(extension);
  }

  listExtensions(): readonly EditorExtension[] {
    return this.extensions;
  }

  // ── tools ───────────────────────────────────────────────────────────

  registerTool(def: ToolDefinition): void {
    if (this.tools.has(def.id)) {
      throw new Error(`ExtensionRegistry: duplicate tool id "${def.id}"`);
    }
    this.tools.set(def.id, def);
  }

  getTool(id: string): ToolDefinition | undefined {
    return this.tools.get(id);
  }

  listTools(): readonly ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  // ── panels ──────────────────────────────────────────────────────────

  registerPanel(def: PanelDefinition): void {
    if (this.panels.some((p) => p.id === def.id)) {
      throw new Error(`ExtensionRegistry: duplicate panel id "${def.id}"`);
    }
    this.panels.push(def);
  }

  listPanels(): readonly PanelDefinition[] {
    return this.panels;
  }

  // ── command palette ─────────────────────────────────────────────────

  registerCommandPaletteEntry(entry: CommandPaletteEntry): void {
    if (this.commandPaletteEntries.has(entry.id)) {
      throw new Error(`ExtensionRegistry: duplicate command-palette id "${entry.id}"`);
    }
    this.commandPaletteEntries.set(entry.id, entry);
  }

  getCommandPaletteEntry(id: string): CommandPaletteEntry | undefined {
    return this.commandPaletteEntries.get(id);
  }

  listCommandPaletteEntries(): readonly CommandPaletteEntry[] {
    return Array.from(this.commandPaletteEntries.values());
  }

  // ── serializers ─────────────────────────────────────────────────────

  registerSerializer(serializer: DocumentSerializer): void {
    if (this.serializers.has(serializer.format)) {
      throw new Error(`ExtensionRegistry: duplicate serializer format "${serializer.format}"`);
    }
    this.serializers.set(serializer.format, serializer);
  }

  getSerializer(format: string): DocumentSerializer | undefined {
    return this.serializers.get(format);
  }

  listSerializers(): readonly DocumentSerializer[] {
    return Array.from(this.serializers.values());
  }
}