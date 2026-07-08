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
  SelectTool,
} from '@editor/map/tools/index';
import { CanvasArea } from '@layout/CanvasArea';
import { PanelColumn } from '@layout/PanelColumn';
import { PanelDock } from '@layout/PanelDock';
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
import { log, subscribeLog } from '@systems/diagnostics';
import { loadDocument, saveDocument } from '@systems/persistence/documentIO';
import { DocumentIOShortcuts } from '@systems/persistence/DocumentIOShortcuts';
import { HistoryShortcuts } from '@systems/shortcut/HistoryShortcuts';
import { SelectionShortcuts } from '@systems/shortcut/SelectionShortcuts';
import { ToolShortcuts } from '@systems/shortcut/ToolShortcuts';

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
  const eraserToolRef = useRef<EraserTool | null>(null);
  const entityToolRef = useRef<EntityTool | null>(null);
  const colliderToolRef = useRef<ColliderTool | null>(null);
  const panToolRef = useRef<PanTool | null>(null);
  const selectToolRef = useRef<SelectTool | null>(null);

  useEffect(() => {
    installHistorySubscriber();
    const historyShortcuts = new HistoryShortcuts();
    const selectionShortcuts = new SelectionShortcuts();
    const toolShortcuts = new ToolShortcuts();
    const documentIOShortcuts = new DocumentIOShortcuts();
    historyShortcuts.attach();
    selectionShortcuts.attach();
    toolShortcuts.attach();
    documentIOShortcuts.attach();

    // Wire the log subsystem -> consoleStore so ConsolePanel renders
    // every line. `app/` is the only layer that may import both
    // `systems/` (the publisher) and `state/` (the mirror).
    const pushLog = useConsoleStore.getState().push;
    const unsubLog = subscribeLog(pushLog);
    log.info(ti18n('console.welcome'));
    log.info(ti18n('console.noDocument'));

    return () => {
      historyShortcuts.detach();
      selectionShortcuts.detach();
      toolShortcuts.detach();
      documentIOShortcuts.detach();
      unsubLog();
      uninstallHistorySubscriber();
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
      .then(() => {
        if (cancelled || renderer.isDestroyed()) return;
        const camera = new Camera(renderer);
        cameraRef.current = camera;

        gridRef.current = new GridView(renderer, camera.worldContainer);
        tileLayerRef.current = new TileLayerView(camera.worldContainer);
        objectLayerRef.current = new ObjectLayerView(camera.worldContainer);
        collisionLayerRef.current = new CollisionLayerView(camera.worldContainer);
        selectionRef.current = new SelectionOverlay(
          camera.worldContainer,
          () => useDocumentStore.getState().tileSize,
        );

        const canvas = renderer.getCanvas();
        if (canvas) {
          brushToolRef.current = new BrushTool(canvas);
          eraserToolRef.current = new EraserTool(canvas);
          panToolRef.current = new PanTool(canvas);
          selectToolRef.current = new SelectTool(canvas);
          entityToolRef.current = new EntityTool(canvas);
          colliderToolRef.current = new ColliderTool(canvas);
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
      brushToolRef.current?.destroy();
      brushToolRef.current = null;
      eraserToolRef.current?.destroy();
      eraserToolRef.current = null;
      panToolRef.current?.destroy();
      panToolRef.current = null;
      selectToolRef.current?.destroy();
      selectToolRef.current = null;
      entityToolRef.current?.destroy();
      entityToolRef.current = null;
      colliderToolRef.current?.destroy();
      colliderToolRef.current = null;
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
  ];

  return (
    <div className={styles.shell}>
      <div className={styles.menuBarSlot}>
        <MenuBar fileActions={fileActions} />
      </div>
      <div className={styles.toolbarSlot}>
        <Toolbar />
      </div>

      <div className={styles.main}>
        <PanelColumn width={leftWidth} collapsed={leftCollapsed} side="left">
          <PanelDock title={t('dock.palette')}>
            <PalettePanel />
          </PanelDock>
          <PanelDock title={t('dock.assets')}>
            <AssetBrowserPanel />
          </PanelDock>
          <PanelDock title={t('dock.layers')}>
            <LayerPanel />
          </PanelDock>
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
          <PanelDock title={t('dock.inspector')}>
            <InspectorPanel />
          </PanelDock>
          <PanelDock title={t('dock.properties')}>
            <PropertiesPanel />
          </PanelDock>
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
