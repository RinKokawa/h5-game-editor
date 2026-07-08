/**
 * CanvasArea — hosts the PixiJS canvas.
 *
 * In v0.1 (Step 4) this is purely a visual placeholder. The PixiRenderer
 * is created and mounted in EditorShell; CanvasArea just provides the DOM
 * container it lives in.
 *
 * Future versions will pass the canvas host element to PixiRenderer via a
 * ref so the renderer can be re-parented when panels dock/undock.
 */

import { type ReactNode } from 'react';

import styles from './CanvasArea.module.css';

export interface CanvasAreaProps {
  readonly children?: ReactNode;
}

export function CanvasArea({ children }: CanvasAreaProps) {
  return <main className={styles.canvasArea}>{children}</main>;
}
