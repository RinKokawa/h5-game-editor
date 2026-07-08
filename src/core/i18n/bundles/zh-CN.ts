/**
 * Simplified Chinese bundle.
 *
 * Same keys as `en.ts`. Interpolation placeholders (`{name}`, `{n}`,
 * `{error}`, etc.) must be preserved verbatim — `translate()` only
 * substitutes what's actually present in the string.
 */

import type { Bundle } from '../types';

const zhCN: Bundle = {
  // MenuBar — top-level menus
  'menu.file': '文件',
  'menu.edit': '编辑',
  'menu.view': '视图',
  'menu.tools': '工具',
  'menu.window': '窗口',
  'menu.help': '帮助',

  // MenuBar — File dropdown
  'menu.file.save': '保存',
  'menu.file.load': '加载',

  // MenuBar — View → Language
  'view.language': '语言',
  'view.language.changed': '语言已切换至 {locale}',

  // Toolbar — tool buttons
  'toolbar.tool.select': '选择',
  'toolbar.tool.pan': '平移',
  'toolbar.tool.brush': '画笔',
  'toolbar.tool.eraser': '橡皮',
  'toolbar.tool.fill': '填充',
  'toolbar.tool.rect': '矩形',
  'toolbar.tool.shortcut': '{name}({shortcut})',

  // Toolbar — undo / redo
  'toolbar.undo': '撤销',
  'toolbar.undo.shortcut': '撤销({shortcut})',
  'toolbar.redo': '重做',
  'toolbar.redo.shortcut': '重做({shortcut})',

  // StatusBar — tool readout
  'statusbar.tool.select': '选择',
  'statusbar.tool.pan': '平移',
  'statusbar.tool.brush': '画笔',
  'statusbar.tool.eraser': '橡皮',

  // StatusBar — selection count
  'statusbar.selection.empty': '—',
  'statusbar.selection.one': '1 个单元格',
  'statusbar.selection.other': '{n} 个单元格',

  // StatusBar — row titles and short labels
  'statusbar.row.screen.title': '屏幕(画布像素)',
  'statusbar.row.world.title': '世界坐标',
  'statusbar.row.tile.title': '瓦片',
  'statusbar.row.history.title': '历史记录',
  'statusbar.row.selection.title': '选区',
  'statusbar.row.zoom': '缩放',
  'statusbar.row.ready': '就绪',
  'statusbar.abbr.screen': '屏',
  'statusbar.abbr.world': '世',
  'statusbar.abbr.tile': '瓦',
  'statusbar.abbr.selection': '选',

  // LayerPanel
  'layer.kind.tile': '瓦片',
  'layer.kind.object': '对象',
  'layer.kind.collision': '碰撞',
  'layer.add': '新增图层',
  'layer.delete': '删除当前图层',
  'layer.moveUp': '上移图层',
  'layer.moveDown': '下移图层',
  'layer.hide': '隐藏图层',
  'layer.show': '显示图层',
  'layer.lock': '锁定图层',
  'layer.unlock': '解锁图层',

  // PalettePanel
  'palette.title': '默认调色板',
  'palette.hint': '点击一个瓦片,然后在画布上绘制',
  'palette.aria': '瓦片调色板',

  // InspectorPanel
  'inspector.empty.title': '当前无选区',
  'inspector.empty.hint': '选中瓦片、实体或碰撞体后可在此查看其属性。',

  // Panel dock titles
  'dock.palette': '调色板',
  'dock.assets': '资源',
  'dock.layers': '图层',
  'dock.inspector': '检视器',
  'dock.properties': '属性',
  'dock.console': '控制台',

  // Console messages
  'console.welcome': 'H5 游戏编辑器已启动。',
  'console.noDocument': '尚未加载文档 — 文件 ▸ 新建 以创建。',
  'console.layerAdded': '[Document] 已新增图层"{name}"',
  'console.layerRemoved': '[Document] 已删除图层"{name}"',
  'console.tilePlaced': '[Document] 已在({x}, {y})放置瓦片',
  'console.tileErased': '[Document] 已擦除({x}, {y})瓦片',
  'console.entityPlaced': '[Document] 已在({x}, {y})放置实体"{name}"',
  'console.colliderPlaced': '[Document] 已在({x}, {y})放置碰撞体({w}×{h})',

  // Asset browser folders
  'asset.folder.tilesets': '瓦片集',
  'asset.folder.sprites': '精灵图',
  'asset.folder.audio': '音频',
  'asset.folder.scripts': '脚本',

  // Properties panel — key labels + empty state
  'properties.empty.title': '当前无选区',
  'properties.empty.hint': '选中瓦片、实体或碰撞体后可在此查看其属性。',
  'properties.id': '编号',
  'properties.type': '类型',
  'properties.position': '位置',
  'properties.size': '尺寸',
  'properties.rotation': '旋转',
  'properties.layer': '所在图层',
  'properties.cells': '单元格',
  'properties.entityCount': '实体数',
  'properties.colliderCount': '碰撞体数',

  // Palette — per-tile swatch labels (id 0 是橡皮)
  'palette.entry.0': '橡皮',
  'palette.entry.1': '砖块',
  'palette.entry.2': '水',
  'palette.entry.3': '草地',
  'palette.entry.4': '沙地',
  'palette.entry.5': '石板',
  'palette.entry.6': '墙体',
  'palette.entry.7': '木板',
  'palette.entry.8': '雪地',
  'palette.entry.9': '混凝土',
  'palette.entry.10': '砂岩',
  'palette.entry.11': '冰面',
  'palette.entry.12': '苔藓',
  'palette.entry.13': '魔法',
  'palette.entry.14': '熔岩',
  'palette.entry.15': '阴影',

  // Project slot
  'project.untitled': '未命名项目',

  // Document I/O logs
  'documentio.saved': '[DocumentIO] 已保存({n} 字节)',
  'documentio.loaded': '[DocumentIO] 已加载({n} 个图层)',
  'documentio.saveFailed': '[DocumentIO] 保存失败:{error}',
  'documentio.loadFailed': '[DocumentIO] 加载失败:{error}',
};

export default zhCN;
