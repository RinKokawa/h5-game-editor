/**
 * English bundle — every user-visible UI string lives here.
 *
 * Keys are flat, dot-separated. New keys: add to BOTH `en.ts` and
 * `zh-CN.ts` in the same commit so neither locale is "missing" the
 * other. Missing keys warn once in dev and fall back to the key
 * itself, but shipping a key without a translation is still a bug.
 */

import type { Bundle } from '../types';

const en: Bundle = {
  // MenuBar — top-level menus
  'menu.file': 'File',
  'menu.edit': 'Edit',
  'menu.view': 'View',
  'menu.tools': 'Tools',
  'menu.window': 'Window',
  'menu.help': 'Help',

  // MenuBar — File dropdown
  'menu.file.save': 'Save',
  'menu.file.load': 'Load',

  // MenuBar — View → Language
  'view.language': 'Language',
  'view.language.changed': 'Language changed to {locale}',

  // Toolbar — tool buttons
  'toolbar.tool.select': 'Select',
  'toolbar.tool.pan': 'Pan',
  'toolbar.tool.brush': 'Brush',
  'toolbar.tool.eraser': 'Eraser',
  'toolbar.tool.fill': 'Fill',
  'toolbar.tool.rect': 'Rect',
  'toolbar.tool.shortcut': '{name} ({shortcut})',

  // Toolbar — undo / redo
  'toolbar.undo': 'Undo',
  'toolbar.undo.shortcut': 'Undo ({shortcut})',
  'toolbar.redo': 'Redo',
  'toolbar.redo.shortcut': 'Redo ({shortcut})',

  // StatusBar — tool readout
  'statusbar.tool.select': 'Select',
  'statusbar.tool.pan': 'Pan',
  'statusbar.tool.brush': 'Brush',
  'statusbar.tool.eraser': 'Eraser',

  // StatusBar — selection count
  'statusbar.selection.empty': '—',
  'statusbar.selection.one': '1 cell',
  'statusbar.selection.other': '{n} cells',

  // StatusBar — row titles (tooltips) and short labels
  'statusbar.row.screen.title': 'Screen (canvas pixels)',
  'statusbar.row.world.title': 'World',
  'statusbar.row.tile.title': 'Tile',
  'statusbar.row.history.title': 'History',
  'statusbar.row.selection.title': 'Selection',
  'statusbar.row.zoom': 'Zoom',
  'statusbar.row.ready': 'Ready',
  'statusbar.abbr.screen': 'Scr',
  'statusbar.abbr.world': 'Wld',
  'statusbar.abbr.tile': 'Tle',
  'statusbar.abbr.selection': 'Sel',

  // LayerPanel
  'layer.kind.tile': 'Tile',
  'layer.kind.object': 'Object',
  'layer.kind.collision': 'Collision',
  'layer.add': 'Add layer',
  'layer.delete': 'Delete active layer',
  'layer.moveUp': 'Move layer up',
  'layer.moveDown': 'Move layer down',
  'layer.hide': 'Hide layer',
  'layer.show': 'Show layer',
  'layer.lock': 'Lock layer',
  'layer.unlock': 'Unlock layer',

  // PalettePanel
  'palette.title': 'Default palette',
  'palette.hint': 'Click a tile, then paint on the canvas',
  'palette.aria': 'Tile palette',

  // InspectorPanel
  'inspector.empty.title': 'No selection',
  'inspector.empty.hint': 'Select a tile, entity, or collider to inspect its properties.',

  // Panel dock titles
  'dock.palette': 'Palette',
  'dock.assets': 'Assets',
  'dock.layers': 'Layers',
  'dock.inspector': 'Inspector',
  'dock.properties': 'Properties',
  'dock.console': 'Console',

  // Console messages
  'console.welcome': 'H5 Game Editor started.',
  'console.noDocument': 'No document loaded — File ▸ New to create one.',
  'console.layerAdded': '[Document] added layer "{name}"',
  'console.layerRemoved': '[Document] removed layer "{name}"',
  'console.tilePlaced': '[Document] placed tile at ({x}, {y})',
  'console.tileErased': '[Document] erased tile at ({x}, {y})',
  'console.entityPlaced': '[Document] placed entity "{name}" at ({x}, {y})',
  'console.colliderPlaced': '[Document] placed collider at ({x}, {y}) size {w}×{h}',

  // Asset browser folders
  'asset.folder.tilesets': 'tilesets',
  'asset.folder.sprites': 'sprites',
  'asset.folder.audio': 'audio',
  'asset.folder.scripts': 'scripts',

  // Properties panel — key labels + empty state
  'properties.empty.title': 'No selection',
  'properties.empty.hint': 'Select a tile, entity, or collider to inspect its properties.',
  'properties.id': 'id',
  'properties.type': 'type',
  'properties.position': 'position',
  'properties.size': 'size',
  'properties.rotation': 'rotation',
  'properties.layer': 'layer',
  'properties.cells': 'cells',
  'properties.entityCount': 'entities',
  'properties.colliderCount': 'colliders',

  // Palette — per-tile swatch labels (id 0 is the eraser)
  'palette.entry.0': 'Eraser',
  'palette.entry.1': 'Brick',
  'palette.entry.2': 'Water',
  'palette.entry.3': 'Grass',
  'palette.entry.4': 'Sand',
  'palette.entry.5': 'Stone',
  'palette.entry.6': 'Wall',
  'palette.entry.7': 'Wood',
  'palette.entry.8': 'Snow',
  'palette.entry.9': 'Concrete',
  'palette.entry.10': 'Sandstone',
  'palette.entry.11': 'Ice',
  'palette.entry.12': 'Moss',
  'palette.entry.13': 'Magic',
  'palette.entry.14': 'Lava',
  'palette.entry.15': 'Shadow',

  // Project slot
  'project.untitled': 'Untitled Project',

  // Document I/O logs
  'documentio.saved': '[DocumentIO] saved ({n} bytes)',
  'documentio.loaded': '[DocumentIO] loaded ({n} layers)',
  'documentio.saveFailed': '[DocumentIO] save failed: {error}',
  'documentio.loadFailed': '[DocumentIO] load failed: {error}',
};

export default en;
