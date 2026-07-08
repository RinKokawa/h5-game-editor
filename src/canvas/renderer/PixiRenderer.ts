/**
 * PixiRenderer — entry point for the Canvas rendering subsystem.
 *
 * Owns the Pixi Application and orchestrates its lifecycle. Step 5 keeps
 * this minimal: black canvas, HiDPI, auto-resize to host. Step 6+ adds
 * Camera, Grid, and Layer views through this same renderer.
 *
 * Async safety: {@link start} returns a Promise. If {@link destroy} runs
 * while init is in flight, the partially-created Application is torn
 * down and the canvas is never attached. This makes the renderer safe
 * under React StrictMode's mount/unmount/mount cycle.
 */

import { Application } from 'pixi.js';

import type { Container } from 'pixi.js';

export class PixiRenderer {
  private app: Application | null = null;
  private host: HTMLElement | null = null;
  private destroyed = false;

  /**
   * Initialize the Pixi Application and attach its canvas to `host`.
   * Resolves once the canvas is in the DOM; rejects if Pixi fails.
   */
  async start(host: HTMLElement): Promise<void> {
    this.host = host;
    const app = new Application();

    await app.init({
      background: 0x1a1a1a,
      backgroundAlpha: 1,
      antialias: true,
      resolution: window.devicePixelRatio,
      autoDensity: true,
      resizeTo: host,
    });

    if (this.destroyed) {
      app.destroy(true, { children: true, texture: true, textureSource: true });
      return;
    }

    host.appendChild(app.canvas);
    this.app = app;
  }

  /** Tear down the renderer and remove its canvas from the DOM. */
  destroy(): void {
    this.destroyed = true;
    if (this.app) {
      this.app.destroy(true, {
        children: true,
        texture: true,
        textureSource: true,
      });
      this.app = null;
    }
    this.host = null;
  }

  /** Underlying Pixi Application. `null` until `start()` resolves. */
  getApplication(): Application | null {
    return this.app;
  }

  /** The root Pixi Container. `null` until `start()` resolves. */
  getStage(): Container | null {
    return this.app?.stage ?? null;
  }

  /** The HTML canvas element Pixi created. `null` until `start()` resolves. */
  getCanvas(): HTMLCanvasElement | null {
    return this.app?.canvas ?? null;
  }

  /** Current canvas size in CSS pixels. `(0, 0)` if not yet initialized. */
  getSize(): { width: number; height: number } {
    const app = this.app;
    if (!app) return { width: 0, height: 0 };
    const screen = app.renderer.screen;
    return { width: screen.width, height: screen.height };
  }

  /** The host element passed to {@link start}. `null` before init. */
  getHost(): HTMLElement | null {
    return this.host;
  }

  /** True once {@link destroy} has been called. */
  isDestroyed(): boolean {
    return this.destroyed;
  }
}
