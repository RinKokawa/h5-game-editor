/**
 * Japanese bundle.
 *
 * Same keys as `en.ts` and `zh-CN.ts`. Translation contributed by the
 * assistant — not native-reviewed; expect Japanese speakers to want
 * to tighten some phrasing (especially the more technical labels like
 * collider kinds). `view.language.changed` is intentionally kept
 * parametric so the language switcher can show the new locale's name.
 *
 * Conventions used:
 *   - Sentence-final punctuation is dropped for menu items.
 *   - Tooltips keep a long form with parentheses (matches zh-CN style).
 *   - DocumentIO log strings keep their `[DocumentIO]` prefix; the
 *     bracket is a log channel, not localizable.
 */

import type { Bundle } from '../types';

const jaJP: Bundle = {
  // MenuBar — top-level menus
  'menu.file': 'ファイル',
  'menu.edit': '編集',
  'menu.view': '表示',
  'menu.tools': 'ツール',
  'menu.window': 'ウィンドウ',
  'menu.help': 'ヘルプ',

  // MenuBar — File dropdown
  'menu.file.save': '保存',
  'menu.file.load': '読み込み',
  'menu.file.launcher': 'ランチャーに戻る',

  // MenuBar — View → Language
  'view.language': '言語',
  'view.language.changed': '言語を {locale} に切り替えました',

  // Toolbar — tool buttons
  'toolbar.tool.select': '選択',
  'toolbar.tool.pan': 'パン',
  'toolbar.tool.brush': 'ブラシ',
  'toolbar.tool.eraser': '消しゴム',
  'toolbar.tool.entity': 'エンティティ',
  'toolbar.tool.collider': 'コライダー',
  'toolbar.tool.fill': '塗りつぶし',
  'toolbar.tool.rect': '矩形',
  'toolbar.tool.shortcut': '{name}({shortcut})',

  // Toolbar — undo / redo
  'toolbar.undo': '元に戻す',
  'toolbar.undo.shortcut': '元に戻す({shortcut})',
  'toolbar.redo': 'やり直し',
  'toolbar.redo.shortcut': 'やり直し({shortcut})',

  // StatusBar — tool readout
  'statusbar.tool.select': '選択',
  'statusbar.tool.pan': 'パン',
  'statusbar.tool.brush': 'ブラシ',
  'statusbar.tool.eraser': '消しゴム',
  'statusbar.tool.entity': 'エンティティ',
  'statusbar.tool.collider': 'コライダー',
  'statusbar.tool.rect': '矩形',

  // StatusBar — selection count
  'statusbar.selection.empty': '—',
  'statusbar.selection.one': '1 セル',
  'statusbar.selection.other': '{n} セル',

  // StatusBar — row titles (tooltips) and short labels
  'statusbar.row.screen.title': 'スクリーン(キャンバスピクセル)',
  'statusbar.row.world.title': 'ワールド座標',
  'statusbar.row.tile.title': 'タイル',
  'statusbar.row.history.title': '履歴',
  'statusbar.row.selection.title': '選択',
  'statusbar.row.zoom': 'ズーム',
  'statusbar.row.ready': '準備完了',
  'statusbar.abbr.screen': '表示',
  'statusbar.abbr.world': '世界',
  'statusbar.abbr.tile': 'タ',
  'statusbar.abbr.selection': '選',

  // LayerPanel
  'layer.kind.tile': 'タイル',
  'layer.kind.object': 'オブジェクト',
  'layer.kind.collision': 'コリジョン',
  'layer.add': 'レイヤーを追加',
  'layer.delete': 'アクティブレイヤーを削除',
  'layer.moveUp': 'レイヤーを上へ移動',
  'layer.moveDown': 'レイヤーを下へ移動',
  'layer.hide': 'レイヤーを非表示',
  'layer.show': 'レイヤーを表示',
  'layer.lock': 'レイヤーをロック',
  'layer.unlock': 'レイヤーのロックを解除',

  // PalettePanel
  'palette.title': 'デフォルトパレット',
  'palette.hint': 'タイルをクリックしてからキャンバスに描画',
  'palette.aria': 'タイルパレット',

  // InspectorPanel
  'inspector.empty.title': '選択なし',
  'inspector.empty.hint':
    'タイル、エンティティ、またはコライダーを選択してプロパティを確認してください。',

  // Panel dock titles
  'dock.palette': 'パレット',
  'dock.assets': 'アセット',
  'dock.layers': 'レイヤー',
  'dock.inspector': 'インスペクター',
  'dock.properties': 'プロパティ',
  'dock.console': 'コンソール',

  // Console messages
  'console.welcome': 'H5 ゲームエディターを起動しました。',
  'console.noDocument':
    'ドキュメントが読み込まれていません — ファイル ▸ 新規作成 から作成してください。',
  'console.layerAdded': '[Document] レイヤーを追加しました:「{name}」',
  'console.layerRemoved': '[Document] レイヤーを削除しました:「{name}」',
  'console.tilePlaced': '[Document] ({x}, {y}) にタイルを配置',
  'console.tileErased': '[Document] ({x}, {y}) のタイルを消去',
  'console.entityPlaced': '[Document] ({x}, {y}) にエンティティ「{name}」を配置',
  'console.colliderPlaced': '[Document] ({x}, {y}) に {w}×{h} のコライダーを配置',

  // Entity palette (default entity types)
  'entity.type.sprite': 'スプライト',
  'entity.type.spawn-point': 'スポーン地点',
  'entity.type.door': 'ドア',
  'entity.type.pickup': 'ピックアップ',

  // Asset browser folders
  'asset.folder.tilesets': 'タイルセット',
  'asset.folder.sprites': 'スプライト',
  'asset.folder.audio': 'オーディオ',
  'asset.folder.scripts': 'スクリプト',

  // Properties panel — key labels + empty state
  'properties.empty.title': '選択なし',
  'properties.empty.hint':
    'タイル、エンティティ、またはコライダーを選択してプロパティを確認してください。',
  'properties.id': 'id',
  'properties.type': 'タイプ',
  'properties.position': '位置',
  'properties.size': 'サイズ',
  'properties.rotation': '回転',
  'properties.layer': 'レイヤー',
  'properties.cells': 'セル',
  'properties.entityCount': 'エンティティ数',
  'properties.colliderCount': 'コライダー数',

  // Palette — per-tile swatch labels (id 0 は消しゴム)
  'palette.entry.0': '消しゴム',
  'palette.entry.1': 'レンガ',
  'palette.entry.2': '水',
  'palette.entry.3': '草地',
  'palette.entry.4': '砂地',
  'palette.entry.5': '石板',
  'palette.entry.6': '壁',
  'palette.entry.7': '木材',
  'palette.entry.8': '雪',
  'palette.entry.9': 'コンクリート',
  'palette.entry.10': '砂岩',
  'palette.entry.11': '氷',
  'palette.entry.12': '苔',
  'palette.entry.13': '魔法',
  'palette.entry.14': '溶岩',
  'palette.entry.15': '影',

  // Project slot
  'project.untitled': '無題のプロジェクト',

  // Document I/O logs
  'documentio.saved': '[DocumentIO] 保存しました({n} バイト)',
  'documentio.loaded': '[DocumentIO] 読み込みました({n} レイヤー)',
  'documentio.saveFailed': '[DocumentIO] 保存に失敗:{error}',
  'documentio.loadFailed': '[DocumentIO] 読み込みに失敗:{error}',

  // Workspace + Launcher
  'launcher.appName': 'H5 ゲームエディター',
  'launcher.tagline': '編集するワークスペースを選んでください。',
  'launcher.new': '新規ワークスペース',
  'launcher.open': 'フォルダーを開く…',
  'launcher.recent': '最近',
  'launcher.empty': '最近開いたワークスペースはありません。',
  'launcher.pathHint': 'ワークスペースを保存する空のフォルダーを選んでください。',
  'launcher.nameLabel': 'ワークスペース名',
  'launcher.namePlaceholder': 'my-game',
  'launcher.confirm': '作成',
  'launcher.cancel': 'キャンセル',
  'launcher.remove': '一覧から削除',
  'launcher.invalid': 'このフォルダーは有効なワークスペースではありません。',
  'launcher.error.generic': 'ワークスペースを開けません:{error}',
  'launcher.error.noElectron': 'ワークスペースは Electron デスクトップ版が必要です。',
  'launcher.workspace.opened': '[Workspace] ワークスペースを開きました:「{name}」',
  'launcher.workspace.created': '[Workspace] ワークスペースを作成しました:「{name}」',
};

export default jaJP;
