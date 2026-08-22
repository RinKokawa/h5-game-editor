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
  'menu.edit.undo': '元に戻す',
  'menu.edit.redo': 'やり直し',
  'menu.edit.cut': '切り取り',
  'menu.edit.copy': 'コピー',
  'menu.edit.paste': '貼り付け',
  'menu.edit.selectAll': 'すべて選択',
  'menu.tools.select': '選択ツール',
  'menu.tools.pan': 'パンツール',
  'menu.tools.brush': 'ブラシツール',
  'menu.tools.eraser': '消しゴムツール',
  'menu.tools.rect': '矩形ツール',
  'menu.tools.entity': 'エンティティツール',
  'menu.tools.collider': 'コライダーツール',
  'menu.window.toggleConsole': 'コンソール切替',
  'menu.window.toggleLeftPanel': '左パネル切替',
  'menu.window.toggleRightPanel': '右パネル切替',
  'menu.help.about': 'バージョン情報',
  'menu.help.docs': 'ドキュメント',

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
  'palette.title': 'タイルセットパレット',
  'palette.hint': 'タイルセットとタイルを選んでキャンバスに描画',
  'palette.aria': 'タイルパレット',
  'palette.eraser': '消しゴム',
  'palette.tileset.sprout.grass': '草',
  'palette.tileset.sprout.hills': '丘',
  'palette.tileset.sprout.tilled-dirt': '耕した土',
  'palette.tileset.sprout.water': '水',

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

  // Asset browser — builtin tileset group
  'asset.builtin.title': '内蔵 — Sprout Lands',
  'asset.builtin.tiles': '{n} タイル',

  // Properties panel — key labels + empty state
  'properties.empty.title': '選択なし',
  'properties.empty.hint':
    'タイル、エンティティ、またはコライダーを選択してプロパティを確認してください。',
  'properties.id': 'id',
  'properties.type': 'タイプ',
  'properties.name': '名前',
  'properties.kind': '種別',
  'properties.position': '位置',
  'properties.size': 'サイズ',
  'properties.rotation': '回転',
  'properties.radius': '半径',
  'properties.vertices': '頂点数',
  'properties.layer': 'レイヤー',
  'properties.cells': 'セル',
  'properties.entityCount': 'エンティティ数',
  'properties.colliderCount': 'コライダー数',
  'properties.stale': '選択は既に存在しません。',

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
  'launcher.openRecent': 'このワークスペースを開く',
  'launcher.invalid': 'このフォルダーは有効なワークスペースではありません。',
  'launcher.error.generic': 'ワークスペースを開けません:{error}',
  'launcher.error.noElectron':
    'ワークスペースには Electron デスクトップビルドが必要です。`npm run electron:dev` を実行してエディタを起動してください。',
  'launcher.workspace.opened': '[Workspace] ワークスペースを開きました:「{name}」',
  'launcher.workspace.created': '[Workspace] ワークスペースを作成しました:「{name}」',
};

export default jaJP;
