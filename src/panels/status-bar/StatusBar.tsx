/**
 * StatusBar — bottom strip showing transient editor info.
 *
 * Subscribes to viewStore (camera + cursor) and documentStore (tile
 * size, for the tile-coord readout). Each field uses an individual
 * selector so React only re-renders the changed span.
 */

import { useDocumentStore } from '@state/documentStore';
import { useHistoryStore } from '@state/historyStore';
import { useToolStore } from '@state/toolStore';
import { useViewStore } from '@state/viewStore';

import styles from './StatusBar.module.css';

const fmt = (n: number): string => {
  return Number.isInteger(n) ? n.toFixed(0) : n.toFixed(2).replace(/\.?0+$/, '');
};

const TOOL_LABEL: Record<string, string> = {
  select: 'Select',
  pan: 'Pan',
  brush: 'Brush',
  eraser: 'Eraser',
};

export function StatusBar() {
  const zoom = useViewStore((s) => s.zoom);
  const cursorScreen = useViewStore((s) => s.cursorScreen);
  const cursorWorld = useViewStore((s) => s.cursorWorld);
  const tileSize = useDocumentStore((s) => s.tileSize);
  const mapSize = useDocumentStore((s) => s.mapSize);
  const activeToolId = useToolStore((s) => s.activeToolId);

  const screen = cursorScreen ? `${fmt(cursorScreen.x)}, ${fmt(cursorScreen.y)}` : '—, —';
  const world = cursorWorld ? `${fmt(cursorWorld.x)}, ${fmt(cursorWorld.y)}` : '—, —';

  let tile = '—, —';
  if (
    cursorWorld &&
    cursorWorld.x >= 0 &&
    cursorWorld.y >= 0 &&
    cursorWorld.x < mapSize.width &&
    cursorWorld.y < mapSize.height &&
    tileSize > 0
  ) {
    const tx = Math.floor(cursorWorld.x / tileSize);
    const ty = Math.floor(cursorWorld.y / tileSize);
    tile = `${tx}, ${ty}`;
  }

  const zoomLabel = `${Math.round(zoom * 100)}%`;
  const toolLabel = TOOL_LABEL[activeToolId] ?? activeToolId;
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const historyLabel = `${canUndo ? 'Undo' : '—'} / ${canRedo ? 'Redo' : '—'}`;

  return (
    <footer className={styles.statusBar} role="status">
      <span className={styles.item} data-kind="muted">
        {toolLabel}
      </span>
      <span className={styles.separator} aria-hidden="true">
        |
      </span>
      <span className={styles.item} title="Screen (canvas pixels)">
        Scr {screen}
      </span>
      <span className={styles.separator} aria-hidden="true">
        |
      </span>
      <span className={styles.item} title="World">
        Wld {world}
      </span>
      <span className={styles.separator} aria-hidden="true">
        |
      </span>
      <span className={styles.item} title="Tile">
        Tle {tile}
      </span>
      <span className={styles.spacer} />
      <span className={styles.item}>Zoom {zoomLabel}</span>
      <span className={styles.separator} aria-hidden="true">
        |
      </span>
      <span className={styles.item} title="History" data-kind={canUndo || canRedo ? 'ok' : 'muted'}>
        {historyLabel}
      </span>
      <span className={styles.separator} aria-hidden="true">
        |
      </span>
      <span className={styles.item} data-kind="ok">
        Ready
      </span>
    </footer>
  );
}
