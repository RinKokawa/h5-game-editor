/**
 * PanTool — drags the camera with left-button drag.
 *
 * Independent of the Space+left gesture (which works in any tool).
 * Activate PanTool when the user wants "pan with plain left drag",
 * e.g. on a trackpad where holding Space is awkward.
 *
 * Implementation: while active, pointermove translates the camera
 * by the delta in screen pixels. `screenToWorld` / `worldToScreen`
 * are not needed — panning is a pure camera translation in screen
 * space.
 *
 * Step 24: implements {@link Tool}.
 */

import { useToolStore } from '@state/toolStore';
import { useViewStore } from '@state/viewStore';

import type { Tool } from '@shared/tool/Tool';

export class PanTool implements Tool {
  readonly id = 'pan';
  readonly labelKey = 'toolbar.tool.pan';

  private canvas: HTMLCanvasElement | null = null;

  private dragging = false;
  private lastX = 0;
  private lastY = 0;

  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
  }

  detach(): void {
    const canvas = this.canvas;
    if (canvas) {
      canvas.removeEventListener('pointerdown', this.onPointerDown);
      canvas.removeEventListener('pointermove', this.onPointerMove);
      canvas.removeEventListener('pointerup', this.onPointerUp);
      canvas.removeEventListener('pointerleave', this.onPointerLeave);
    }
    this.canvas = null;
    this.dragging = false;
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (!this.isActive()) return;
    if (event.button !== 0 && event.button !== 1) return;
    if (!this.canvas) return;
    event.preventDefault();
    this.canvas.setPointerCapture(event.pointerId);
    this.dragging = true;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.isActive() || !this.dragging) return;
    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    useViewStore.getState().panBy(dx, dy);
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.dragging) return;
    if (this.canvas?.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
    this.dragging = false;
  };

  private readonly onPointerLeave = (): void => {
    this.dragging = false;
  };

  private isActive(): boolean {
    return useToolStore.getState().activeToolId === 'pan';
  }
}