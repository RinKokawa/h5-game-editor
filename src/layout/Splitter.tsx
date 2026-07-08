/**
 * Splitter — drag handle for resizing adjacent panels.
 *
 * Communicates resize deltas via the `onResize` callback. The owning
 * component is responsible for clamping values and committing them to
 * the layout store.
 */

import { useCallback, useRef } from 'react';

import styles from './Splitter.module.css';

export type SplitterDirection = 'vertical' | 'horizontal';

export interface SplitterProps {
  readonly direction: SplitterDirection;
  /** Called on every pointer move with the delta in pixels. */
  readonly onResize: (deltaPx: number) => void;
  /** Optional hooks for showing/hiding cursors or suspending layouts. */
  readonly onResizeStart?: () => void;
  readonly onResizeEnd?: () => void;
  readonly ariaLabel?: string;
}

export function Splitter({
  direction,
  onResize,
  onResizeStart,
  onResizeEnd,
  ariaLabel,
}: SplitterProps) {
  const lastPosRef = useRef<number | null>(null);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const handle = event.currentTarget;
      handle.setPointerCapture(event.pointerId);
      lastPosRef.current = direction === 'vertical' ? event.clientX : event.clientY;
      onResizeStart?.();

      const handlePointerMove = (e: PointerEvent) => {
        if (lastPosRef.current === null) return;
        const current = direction === 'vertical' ? e.clientX : e.clientY;
        const delta = current - lastPosRef.current;
        lastPosRef.current = current;
        if (delta !== 0) onResize(delta);
      };

      const handlePointerUp = (e: PointerEvent) => {
        handle.releasePointerCapture(e.pointerId);
        lastPosRef.current = null;
        onResizeEnd?.();
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    },
    [direction, onResize, onResizeStart, onResizeEnd],
  );

  return (
    <div
      role="separator"
      aria-orientation={direction === 'vertical' ? 'vertical' : 'horizontal'}
      aria-label={ariaLabel ?? 'Resize handle'}
      className={direction === 'vertical' ? styles.splitterVertical : styles.splitterHorizontal}
      onPointerDown={handlePointerDown}
    />
  );
}
