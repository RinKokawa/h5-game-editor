/**
 * EditorShell — top-level layout.
 *
 * Composition order (top to bottom):
 *
 *   MenuBar
 *   Toolbar
 *   ┌─ Left column ─┬─ CanvasArea ─┬─ Right column ─┐
 *   │  Palette      │              │  Inspector      │
 *   │  Assets       │              │  Properties     │
 *   │  Layers       │              │                 │
 *   └────────────────┴──────────────┴─────────────────┘
 *   Bottom panel (Console)
 *   StatusBar
 *
 * Splitters write directly to the layout store. Panels are dumb — they
 * only render whatever their parent gives them.
 *
 * Side columns are PanelStacks fed by declarative panel registries
 * (LEFT_PANELS / RIGHT_PANELS). Order, heights, and collapse state live
 * in the layout store and persist across sessions; PanelStack owns the
 * drag-to-reorder and drag-to-resize gestures.
 *
 * Step 11+ adds SelectionOverlay and instantiates all four tools
 * (Select, Pan, Brush, Eraser). Each tool checks the active tool id
 * before responding to events; only the active one acts.
 *
 * Step 16 cross-cutting systems:
 *   - historyStore subscriber (Zustand mirror of canUndo/canRedo)
 *   - HistoryShortcuts (Ctrl/Cmd+Z, Ctrl/Cmd+Y, Ctrl/Cmd+Shift+Z)
 *   - SelectionShortcuts (Delete/Backspace, Escape)
 *
 * Step 17 wires `core/i18n/`:
 *   - fileActions passed to MenuBar use `labelKey` (bundle key)
 *     so MenuBar owns all UI strings.
 *   - PanelDock titles and console logs are translated via `useT()`.
 *   - Imperative `t()` reads from the store synchronously for the
 *     click handlers, so log messages always reflect the latest
 *     locale without forcing EditorShell to subscribe.
 */

import { useCallback, useEffect, useRef } from 'react';

import { preloadBuiltinTilesets } from '@assets';
import { Camera } from '@canvas/camera/Camera';
import { CollisionLayerView } from '@canvas/collision-layer/CollisionLayerView';
import { GridView } from '@canvas/grid/GridView';
import { ObjectLayerView } from '@canvas/object-layer/ObjectLayerView';
import { PixiRenderer } from '@canvas/renderer/PixiRenderer';
import { SelectionOverlay } from '@canvas/selection/SelectionOverlay';
import { TileLayerView } from '@canvas/tile-layer/TileLayerView';
import { t as ti18n, useT } from '@core/i18n';
import {
  BrushTool,
  ColliderTool,
  EntityTool,
  EraserTool,
  PanTool,
  RectTool,
  SelectTool,
} from '@editor/map/tools/index';
import { CanvasArea } from '@layout/CanvasArea';
import { PanelColumn } from '@layout/PanelColumn';
import { PanelDock } from '@layout/PanelDock';
import { PanelStack, type PanelSpec } from '@layout/PanelStack';
import { Splitter } from '@layout/Splitter';
import { AssetBrowserPanel } from '@panels/asset-browser/AssetBrowserPanel';
import { ConsolePanel } from '@panels/console/ConsolePanel';
import { InspectorPanel } from '@panels/inspector/InspectorPanel';
import { LayerPanel } from '@panels/layer/LayerPanel';
import { MenuBar } from '@panels/menubar/MenuBar';
import { PalettePanel } from '@panels/palette/PalettePanel';
import { PropertiesPanel } from '@panels/properties/PropertiesPanel';
import { StatusBar } from '@panels/status-bar/StatusBar';
import { Toolbar } from '@panels/toolbar/Toolbar';
import { useConsoleStore } from '@state/consoleStore';
import { useDocumentStore } from '@state/documentStore';
import { installHistorySubscriber, uninstallHistorySubscriber } from '@state/historyStore';
import { useLayoutStore } from '@state/layoutStore';
import { useWorkspaceStore } from '@state/workspaceStore';
import { log, subscribeLog } from '@systems/diagnostics';
import { loadDocument, saveDocument } from '@systems/persistence/documentIO';
import { documentIOShortcuts } from '@systems/persistence/DocumentIOShortcuts';
import { openExternal, setWindowTitle } from '@systems/persistence/electronBridge';
import { historyShortcuts } from '@systems/shortcut/HistoryShortcuts';
import { ShortcutRegistry } from '@systems/shortcut/index';
import { selectionShortcuts } from '@systems/shortcut/SelectionShortcuts';
import { toolShortcuts } from '@systems/shortcut/ToolShortcuts';

import styles from './EditorShell.module.css';

export function EditorShell() {
  const t = useT();
  const leftWidth = useLayoutStore((s) => s.leftWidth);
  const rightWidth = useLayoutStore((s) => s.rightWidth);
  const bottomHeight = useLayoutStore((s) => s.bottomHeight);
  const leftCollapsed = useLayoutStore((s) => s.leftCollapsed);
  const rightCollapsed = useLayoutStore((s) => s.rightCollapsed);
  const bottomCollapsed = useLayoutStore((s) => s.bottomCollapsed);

  const setLeftWidth = useLayoutStore((s) => s.setLeftWidth);
  const setRightWidth = useLayoutStore((s) => s.setRightWidth);
  const setBottomHeight = useLayoutStore((s) => s.setBottomHeight);

  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<PixiRenderer | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const gridRef = useRef<GridView | null>(null);
  const tileLayerRef = useRef<TileLayerView | null>(null);
  const objectLayerRef = useRef<ObjectLayerView | null>(null);
  const collisionLayerRef = useRef<CollisionLayerView | null>(null);
  const selectionRef = useRef<SelectionOverlay | null>(null);
  const brushToolRef = useRef<BrushTool | null>(null);
  const rectToolRef = useRef<RectTool | null>(null);
  const eraserToolRef = useRef<EraserTool | null>(null);
  const entityToolRef = useRef<EntityTool | null>(null);
  const colliderToolRef = useRef<ColliderTool | null>(null);
  const panToolRef = useRef<PanTool | null>(null);
  const selectToolRef = useRef<SelectTool | null>(null);

  useEffect(() => {
    installHistorySubscriber();
    const shortcutRegistry = new ShortcutRegistry();
    shortcutRegistry.registerAll(historyShortcuts);
    shortcutRegistry.registerAll(selectionShortcuts);
    shortcutRegistry.registerAll(toolShortcuts);
    shortcutRegistry.registerAll(documentIOShortcuts);
    shortcutRegistry.attach();

    // Wire the log subsystem -> consoleStore so ConsolePanel renders
    // every line. `app/` is the only layer that may import both
    // `systems/` (the publisher) and `state/` (the mirror).
    const pushLog = useConsoleStore.getState().push;
    const unsubLog = subscribeLog(pushLog);
    log.info(ti18n('console.welcome'));
    log.info(ti18n('console.noDocument'));

    // Sync the OS title bar (the strip with close / maximize /
    // minimize). EditorShell only mounts in the editor phase, so on
    // mount `current` is guaranteed set; on unmount (Back to
    // Launcher) we reset to the bare app name. The initial
    // `H5 Game Editor` title lives in the BrowserWindow `title`
    // option, set by main.ts before the renderer loads — the
    // launcher phase never triggers this effect.
    const current = useWorkspaceStore.getState().current;
    if (current) {
      void setWindowTitle(`H5 Game Editor - ${current.name}`);
    }

    return () => {
      shortcutRegistry.detach();
      unsubLog();
      uninstallHistorySubscriber();
      void setWindowTitle('H5 Game Editor');
    };
  }, []);

  // Mount the PixiJS renderer + Camera + GridView + TileLayerView +
  // SelectionOverlay + all four tools. The async `start()` is safe
  // under React StrictMode: if destroy() fires before init resolves,
  // the partially-built application is torn down and the Camera (and
  // everything downstream) is never constructed.
  //
  // Teardown order: tools remove DOM listeners before the canvas is
  // gone; views detach from worldContainer before Camera destroys it.
  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    const renderer = new PixiRenderer();
    rendererRef.current = renderer;

    let cancelled = false;
    renderer
      .start(host)
      .then(async () => {
        if (cancelled || renderer.isDestroyed()) return;
        // Tileset sheets must be sliced into textures before the tile
        // view's first render, or every cell would flash the fallback
        // tint. Memoized by the cache — the StrictMode double mount
        // reuses the first pass.
        await preloadBuiltinTilesets();
        if (cancelled || renderer.isDestroyed()) return;
        const camera = new Camera(renderer);
        cameraRef.current = camera;

        gridRef.current = new GridView(renderer, camera.worldContainer);
        tileLayerRef.current = new TileLayerView(camera.worldContainer);
        objectLayerRef.current = new ObjectLayerView(camera.worldContainer);
        collisionLayerRef.current = new CollisionLayerView(camera.worldContainer);
        selectionRef.current = new SelectionOverlay(
          camera.worldContainer,
          () => useDocumentStore.getState().meta.tileSize,
        );

        const canvas = renderer.getCanvas();
        if (canvas) {
          brushToolRef.current = new BrushTool();
          eraserToolRef.current = new EraserTool();
          panToolRef.current = new PanTool();
          selectToolRef.current = new SelectTool();
          entityToolRef.current = new EntityTool();
          colliderToolRef.current = new ColliderTool();
          rectToolRef.current = new RectTool();
          brushToolRef.current.attach(canvas);
          eraserToolRef.current.attach(canvas);
          panToolRef.current.attach(canvas);
          selectToolRef.current.attach(canvas);
          entityToolRef.current.attach(canvas);
          colliderToolRef.current.attach(canvas);
          rectToolRef.current.attach(canvas);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        log.error(
          `PixiRenderer failed to start: ${err instanceof Error ? err.message : String(err)}`,
        );
      });

    return () => {
      cancelled = true;
      brushToolRef.current?.detach();
      brushToolRef.current = null;
      eraserToolRef.current?.detach();
      eraserToolRef.current = null;
      panToolRef.current?.detach();
      panToolRef.current = null;
      selectToolRef.current?.detach();
      selectToolRef.current = null;
      entityToolRef.current?.detach();
      entityToolRef.current = null;
      colliderToolRef.current?.detach();
      colliderToolRef.current = null;
      rectToolRef.current?.detach();
      rectToolRef.current = null;
      selectionRef.current?.destroy();
      selectionRef.current = null;
      collisionLayerRef.current?.destroy();
      collisionLayerRef.current = null;
      objectLayerRef.current?.destroy();
      objectLayerRef.current = null;
      tileLayerRef.current?.destroy();
      tileLayerRef.current = null;
      gridRef.current?.destroy();
      gridRef.current = null;
      cameraRef.current?.destroy();
      cameraRef.current = null;
      renderer.destroy();
      rendererRef.current = null;
    };
  }, []);

  const handleLeftResize = useCallback(
    (delta: number) => setLeftWidth(leftWidth + delta),
    [leftWidth, setLeftWidth],
  );
  const handleRightResize = useCallback(
    (delta: number) => setRightWidth(rightWidth - delta),
    [rightWidth, setRightWidth],
  );
  const handleBottomResize = useCallback(
    (delta: number) => setBottomHeight(bottomHeight + delta),
    [bottomHeight, setBottomHeight],
  );

  // Declarative panel registry per side. PanelStack renders these in the
  // order stored in the layout store (drag-to-reorder rewrites it).
  const leftPanels: readonly PanelSpec[] = [
    { id: 'palette', title: t('dock.palette'), render: () => <PalettePanel /> },
    { id: 'assets', title: t('dock.assets'), render: () => <AssetBrowserPanel /> },
    { id: 'layers', title: t('dock.layers'), render: () => <LayerPanel /> },
  ];
  const rightPanels: readonly PanelSpec[] = [
    { id: 'inspector', title: t('dock.inspector'), render: () => <InspectorPanel /> },
    { id: 'properties', title: t('dock.properties'), render: () => <PropertiesPanel /> },
  ];

  const fileActions = [
    {
      labelKey: 'menu.file.save',
      shortcut: 'Ctrl+S',
      onClick: () => {
        void saveDocument().then((outcome) => {
          if (outcome.ok) {
            const where = outcome.path ? ` → ${outcome.path}` : '';
            log.info(ti18n('documentio.saved', { n: outcome.bytes }) + where);
          } else {
            log.error(ti18n('documentio.saveFailed', { error: outcome.error }));
          }
        });
      },
    },
    {
      labelKey: 'menu.file.load',
      shortcut: 'Ctrl+O',
      onClick: () => {
        void loadDocument().then((outcome) => {
          if (outcome.ok) {
            const where = outcome.path ? ` ← ${outcome.path}` : '';
            log.info(ti18n('documentio.loaded', { n: outcome.layerCount }) + where);
          } else {
            log.warn(ti18n('documentio.loadFailed', { error: outcome.error }));
          }
        });
      },
    },
    {
      labelKey: 'menu.file.launcher',
      onClick: () => useWorkspaceStore.getState().leave(),
    },
  ];

  return (
    <div className={styles.shell}>
      <div className={styles.menuBarSlot}>
        <MenuBar
          fileActions={fileActions}
          onOpenDocs={() => {
            void openExternal('https://github.com/RinKokawa/h5-game-editor');
          }}
        />
      </div>
      <div className={styles.toolbarSlot}>
        <Toolbar />
      </div>

      <div className={styles.main}>
        <PanelColumn width={leftWidth} collapsed={leftCollapsed} side="left">
          <PanelStack side="left" panels={leftPanels} />
        </PanelColumn>

        <Splitter direction="vertical" onResize={handleLeftResize} ariaLabel="Resize left panel" />

        <CanvasArea>
          <div ref={canvasHostRef} className={styles.canvasHost} />
        </CanvasArea>

        <Splitter
          direction="vertical"
          onResize={handleRightResize}
          ariaLabel="Resize right panel"
        />

        <PanelColumn width={rightWidth} collapsed={rightCollapsed} side="right">
          <PanelStack side="right" panels={rightPanels} />
        </PanelColumn>
      </div>

      <Splitter
        direction="horizontal"
        onResize={handleBottomResize}
        ariaLabel="Resize bottom panel"
      />

      <div
        className={styles.bottomSlot}
        style={{ height: bottomCollapsed ? 28 : `${bottomHeight}px` }}
      >
        <PanelDock title={t('dock.console')} defaultOpen={!bottomCollapsed}>
          <ConsolePanel />
        </PanelDock>
      </div>

      <div className={styles.statusBarSlot}>
        <StatusBar />
      </div>
    </div>
  );
}
