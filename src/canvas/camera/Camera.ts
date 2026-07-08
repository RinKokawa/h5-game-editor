/**
 * Camera — pan/zoom controller for the map canvas.
 *
 * The Camera owns a PixiJS Container that world-space rendering targets
 * (TileLayerView, ObjectLayerView, ...) attach themselves to. It does
 * not own world data; it only owns the transformation between screen
 * and world coordinates and the user inputs that change it.
 *
 * State flow:
 *   viewStore (Zustand)   ──►  this.worldContainer (Pixi Container)
 *        ▲                            │
 *        │                            └─► Pixi render
 *        │
 *   wheel / pointer / key events
 *
 * The Camera is the bridge from the DOM input layer to the React-managed
 * view store. Step 12 will introduce a dedicated Input subsystem; until
 * then input handlers live here.
 */

import { Container } from 'pixi.js';

import { screenToWorld } from '@shared/math/index';
import { setViewportSize, useViewStore } from '@state/viewStore';

import type { PixiRenderer } from '@canvas/renderer/PixiRenderer';
import type { Point, ScreenPoint } from '@local-types/index';

const WHEEL_ZOOM_FACTOR = 1.1;
const MIN_PAN_PIXEL_DELTA = 0;

export class Camera {
  /** Container in which world-space children are placed. */
  readonly worldContainer: Container;

  private readonly renderer: PixiRenderer;
  private readonly canvas: HTMLCanvasElement | null;
  private readonly stage: Container | null;

  private unsubscribeStore: (() => void) | null = null;
  private detachDom: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private destroyed = false;

  /** Transient pan state. */
  private spacePressed = false;
  private panning = false;
  private panStart: ScreenPoint | null = null;
  private panCameraStart: { position: Point; zoom: number } | null = null;

  constructor(renderer: PixiRenderer) {
    this.renderer = renderer;
    this.stage = renderer.getStage();
    this.canvas = renderer.getCanvas();

    this.worldContainer = new Container();
    this.worldContainer.eventMode = 'none';
    if (this.stage) {
      this.stage.addChild(this.worldContainer);
    }

    // Apply initial viewStore state.
    const initial = useViewStore.getState();
    this.worldContainer.position.set(initial.position.x, initial.position.y);
    this.worldContainer.scale.set(initial.zoom);

    this.subscribeToViewStore();
    if (this.canvas) {
      this.attachDom();
      this.syncViewportSize();
      this.observeCanvasResize();
    }
  }

  /** World coordinate at a given screen point, using the current camera state. */
  screenToWorld(screen: ScreenPoint): Point {
    return screenToWorld(screen, useViewStore.getState());
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.unsubscribeStore?.();
    this.detachDom?.();
    this.resizeObserver?.disconnect();
    if (this.stage && this.worldContainer.parent === this.stage) {
      this.stage.removeChild(this.worldContainer);
    }
    this.worldContainer.destroy({ children: true });
  }

  // ── viewStore → Pixi bridge ───────────────────────────────────────────────

  private subscribeToViewStore(): void {
    this.unsubscribeStore = useViewStore.subscribe((state) => {
      this.worldContainer.position.set(state.position.x, state.position.y);
      this.worldContainer.scale.set(state.zoom);
    });
  }

  // ── DOM input ────────────────────────────────────────────────────────────

  private attachDom(): void {
    if (!this.canvas) return;

    const onWheel = this.handleWheel;
    const onPointerDown = this.handlePointerDown;
    const onPointerMove = this.handlePointerMove;
    const onPointerUp = this.handlePointerUp;
    const onPointerLeave = this.handlePointerLeave;
    const onKeyDown = this.handleKeyDown;
    const onKeyUp = this.handleKeyUp;

    // Use passive: false so we can preventDefault on wheel (browser zoom).
    this.canvas.addEventListener('wheel', onWheel, { passive: false });
    this.canvas.addEventListener('pointerdown', onPointerDown);
    this.canvas.addEventListener('pointermove', onPointerMove);
    this.canvas.addEventListener('pointerup', onPointerUp);
    this.canvas.addEventListener('pointerleave', onPointerLeave);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    this.detachDom = () => {
      this.canvas?.removeEventListener('wheel', onWheel);
      this.canvas?.removeEventListener('pointerdown', onPointerDown);
      this.canvas?.removeEventListener('pointermove', onPointerMove);
      this.canvas?.removeEventListener('pointerup', onPointerUp);
      this.canvas?.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }

  private observeCanvasResize(): void {
    if (!this.canvas) return;
    this.resizeObserver = new ResizeObserver(() => this.syncViewportSize());
    this.resizeObserver.observe(this.canvas);
  }

  private syncViewportSize(): void {
    const { width, height } = this.renderer.getSize();
    setViewportSize(width, height);
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  private handleWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const factor = event.deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR;
    const cursor = this.toCanvasPoint(event.clientX, event.clientY);
    useViewStore.getState().zoomBy(factor, cursor);
  };

  private handlePointerDown = (event: PointerEvent): void => {
    const wantsPan = event.button === 1 || (event.button === 0 && this.spacePressed);
    if (!wantsPan) return;
    event.preventDefault();
    if (!this.canvas) return;
    this.canvas.setPointerCapture(event.pointerId);
    this.panning = true;
    this.panStart = this.toCanvasPoint(event.clientX, event.clientY);
    const state = useViewStore.getState();
    this.panCameraStart = {
      position: { x: state.position.x, y: state.position.y },
      zoom: state.zoom,
    };
  };

  private handlePointerMove = (event: PointerEvent): void => {
    const cursor = this.toCanvasPoint(event.clientX, event.clientY);
    const store = useViewStore.getState();

    if (this.panning && this.panStart && this.panCameraStart) {
      const dx = cursor.x - this.panStart.x;
      const dy = cursor.y - this.panStart.y;
      if (Math.abs(dx) > MIN_PAN_PIXEL_DELTA || Math.abs(dy) > MIN_PAN_PIXEL_DELTA) {
        store.setPosition({
          x: this.panCameraStart.position.x + dx,
          y: this.panCameraStart.position.y + dy,
        });
      }
    } else {
      store.setCursor(cursor);
    }
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (!this.panning) return;
    if (this.canvas?.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
    this.panning = false;
    this.panStart = null;
    this.panCameraStart = null;
  };

  private handlePointerLeave = (): void => {
    useViewStore.getState().setCursor(null);
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== 'Space' || event.repeat) return;
    // Only treat Space as pan modifier when the canvas host (or a child)
    // is the active element, so Space inside an input field still works.
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
    this.spacePressed = true;
    if (this.canvas) this.canvas.style.cursor = 'grab';
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    if (event.code !== 'Space') return;
    this.spacePressed = false;
    if (this.canvas) this.canvas.style.cursor = '';
  };

  private toCanvasPoint(clientX: number, clientY: number): ScreenPoint {
    if (!this.canvas) return { x: clientX, y: clientY };
    const rect = this.canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }
}
