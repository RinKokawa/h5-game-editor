/**
 * StatusBar — bottom strip showing transient editor info.
 *
 * Subscribes to viewStore (camera + cursor) and documentStore (tile
 * size, for the tile-coord readout). Each field uses an individual
 * selector so React only re-renders the changed span.
 */

import { useT } from '@core/i18n';
import { useDocumentStore } from '@state/documentStore';
import { useHistoryStore } from '@state/historyStore';
import { useSelectionStore } from '@state/selectionStore';
import { useToolStore } from '@state/toolStore';
import { useViewStore } from '@state/viewStore';

import styles from './StatusBar.module.css';

import type { ToolId } from '@state/toolStore';

const fmt = (n: number): string => {
  return Number.isInteger(n) ? n.toFixed(0) : n.toFixed(2).replace(/\.?0+$/, '');
};

const TOOL_LABEL_KEY: Record<ToolId, string> = {
  select: 'statusbar.tool.select',
  pan: 'statusbar.tool.pan',
  brush: 'statusbar.tool.brush',
  eraser: 'statusbar.tool.eraser',
  entity: 'statusbar.tool.entity',
  collider: 'statusbar.tool.collider',
  rect: 'statusbar.tool.rect',
};

export function StatusBar() {
  const t = useT();
  const zoom = useViewStore((s) => s.zoom);
  const cursorScreen = useViewStore((s) => s.cursorScreen);
  const cursorWorld = useViewStore((s) => s.cursorWorld);
  const tileSize = useDocumentStore((s) => s.meta.tileSize);
  const mapSize = useDocumentStore((s) => s.meta.mapSize);
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
  const toolLabel = t(TOOL_LABEL_KEY[activeToolId] ?? activeToolId);
  const canUndo = useHistoryStore((s) => s.canUndo);
  const canRedo = useHistoryStore((s) => s.canRedo);
  const historyLabel = `${canUndo ? t('toolbar.undo') : t('statusbar.selection.empty')} / ${
    canRedo ? t('toolbar.redo') : t('statusbar.selection.empty')
  }`;
  const selectionSize = useSelectionStore((s) => {
    const sel = s.selection;
    if (sel === null) return 0;
    if (sel.kind === 'tiles') return sel.cells.size;
    return 1;
  });
  const selectionLabel =
    selectionSize === 0
      ? t('statusbar.selection.empty')
      : selectionSize === 1
        ? t('statusbar.selection.one')
        : t('statusbar.selection.other', { n: selectionSize });

  return (
    <footer className={styles.statusBar} role="status">
      <span className={styles.item} data-kind="muted">
        {toolLabel}
      </span>
      <span className={styles.separator} aria-hidden="true">
        |
      </span>
      <span className={styles.item} title={t('statusbar.row.screen.title')}>
        {t('statusbar.abbr.screen')} {screen}
      </span>
      <span className={styles.separator} aria-hidden="true">
        |
      </span>
      <span className={styles.item} title={t('statusbar.row.world.title')}>
        {t('statusbar.abbr.world')} {world}
      </span>
      <span className={styles.separator} aria-hidden="true">
        |
      </span>
      <span className={styles.item} title={t('statusbar.row.tile.title')}>
        {t('statusbar.abbr.tile')} {tile}
      </span>
      <span className={styles.spacer} />
      <span className={styles.item}>
        {t('statusbar.row.zoom')} {zoomLabel}
      </span>
      <span className={styles.separator} aria-hidden="true">
        |
      </span>
      <span
        className={styles.item}
        title={t('statusbar.row.history.title')}
        data-kind={canUndo || canRedo ? 'ok' : 'muted'}
      >
        {historyLabel}
      </span>
      <span className={styles.separator} aria-hidden="true">
        |
      </span>
      <span
        className={styles.item}
        title={t('statusbar.row.selection.title')}
        data-kind={selectionSize > 0 ? 'ok' : 'muted'}
      >
        {t('statusbar.abbr.selection')} {selectionLabel}
      </span>
      <span className={styles.separator} aria-hidden="true">
        |
      </span>
      <span className={styles.item} data-kind="ok">
        {t('statusbar.row.ready')}
      </span>
    </footer>
  );
}
