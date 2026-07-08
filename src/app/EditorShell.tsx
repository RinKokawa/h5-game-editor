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
 * Step 10 wires up the cross-cutting subsystems:
 *   - historyStore subscriber (Zustand mirror of canUndo/canRedo)
 *   - HistoryShortcuts (Ctrl/Cmd+Z, Ctrl/Cmd+Y, Ctrl/Cmd+Shift+Z)
 */

import { useCallback, useEffect, useRef } from 'react';

import { Camera } from '@canvas/camera/Camera';
import { GridView } from '@canvas/grid/GridView';
import { PixiRenderer } from '@canvas/renderer/PixiRenderer';
import { TileLayerView } from '@canvas/tile-layer/TileLayerView';
import { BrushTool } from '@editor/map/tools/BrushTool';
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
import { installHistorySubscriber, uninstallHistorySubscriber } from '@state/historyStore';
import { useLayoutStore } from '@state/layoutStore';
import { HistoryShortcuts } from '@systems/shortcut/HistoryShortcuts';

import styles from './EditorShell.module.css';

export function EditorShell() {
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
  const brushToolRef = useRef<BrushTool | null>(null);

  // Step 10 cross-cutting systems. The history subscriber mirrors the
  // CommandBus into Zustand so React can render Undo/Redo button state;
  // HistoryShortcuts maps Ctrl/Cmd+Z/Y to CommandBus.undo/redo.
  useEffect(() => {
    installHistorySubscriber();
    const shortcuts = new HistoryShortcuts();
    shortcuts.attach();
    return () => {
      shortcuts.detach();
      uninstallHistorySubscriber();
    };
  }, []);

  // Mount the PixiJS renderer + Camera + GridView + TileLayerView +
  // BrushTool. The async `start()` is safe under React StrictMode: if
  // destroy() fires before init resolves, the partially-built
  // application is torn down and the Camera (and everything downstream)
  // is never constructed.
  //
  // Teardown order: views detach from worldContainer before Camera
  // destroys it; BrushTool removes DOM listeners before the canvas is
  // gone.
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

        const canvas = renderer.getCanvas();
        if (canvas) brushToolRef.current = new BrushTool(canvas);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('PixiRenderer failed to start:', err);
      });

    return () => {
      cancelled = true;
      brushToolRef.current?.destroy();
      brushToolRef.current = null;
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

  return (
    <div className={styles.shell}>
      <div className={styles.menuBarSlot}>
        <MenuBar />
      </div>
      <div className={styles.toolbarSlot}>
        <Toolbar />
      </div>

      <div className={styles.main}>
        <PanelColumn width={leftWidth} collapsed={leftCollapsed} side="left">
          <PanelDock title="Palette">
            <PalettePanel />
          </PanelDock>
          <PanelDock title="Assets">
            <AssetBrowserPanel />
          </PanelDock>
          <PanelDock title="Layers">
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
          <PanelDock title="Inspector">
            <InspectorPanel />
          </PanelDock>
          <PanelDock title="Properties">
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
        <PanelDock title="Console" defaultOpen={!bottomCollapsed}>
          <ConsolePanel />
        </PanelDock>
      </div>

      <div className={styles.statusBarSlot}>
        <StatusBar />
      </div>
    </div>
  );
}
