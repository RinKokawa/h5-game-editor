/**
 * LayerPanel — interactive list of Document layers.
 *
 * Every mutation is dispatched as a Command via the CommandBus:
 *
 *   click row         → setActiveLayer (view-only)
 *   + button          → AddTileLayerCommand | AddObjectLayerCommand
 *   − button          → RemoveLayerCommand
 *   visibility toggle → SetLayerVisibleCommand
 *   lock toggle       → SetLayerLockedCommand
 *   ↑ / ↓ buttons     → MoveLayerCommand
 *
 * The "+" button opens a small menu with the two layer kinds
 * available in v0.1 (tile, object). Step 14 adds collision; Step 19
 * adds a real layer-kind picker; this popover is the v0.1 stop-gap.
 *
 * `layers[0]` is the visual top of the stack — also the top row of
 * the panel. "Move up" shifts a row toward index 0.
 */

import { useState } from 'react';

import { commandBus } from '@core/command/commandBusSingleton';
import { useT } from '@core/i18n';
import {
  AddCollisionLayerCommand,
  AddObjectLayerCommand,
  AddTileLayerCommand,
  MoveLayerCommand,
  RemoveLayerCommand,
  SetLayerLockedCommand,
  SetLayerVisibleCommand,
  createCollisionLayer,
  createObjectLayer,
  createTileLayer,
} from '@editor/map/commands/index';
import { useDocumentStore } from '@state/documentStore';

import styles from './LayerPanel.module.css';

import type { Layer, LayerType } from '@editor/map/schema/layer';

type LayerKind = 'tile' | 'object' | 'collision';

export function LayerPanel() {
  const t = useT();
  const layers = useDocumentStore((s) => s.layers);
  const activeLayerId = useDocumentStore((s) => s.activeLayerId);
  const [menuOpen, setMenuOpen] = useState(false);

  const setActiveLayer = useDocumentStore((s) => s.setActiveLayer);

  const activeIndex = layers.findIndex((l) => l.id === activeLayerId);
  const canMoveUp = activeIndex > 0;
  const canMoveDown = activeIndex >= 0 && activeIndex < layers.length - 1;

  const handleAddLayer = (kind: LayerKind): void => {
    setMenuOpen(false);
    if (kind === 'tile') {
      const layer = createTileLayer(layers);
      commandBus.execute(new AddTileLayerCommand(layer, true));
    } else if (kind === 'object') {
      const layer = createObjectLayer(layers);
      commandBus.execute(new AddObjectLayerCommand(layer, true));
    } else {
      const layer = createCollisionLayer(layers);
      commandBus.execute(new AddCollisionLayerCommand(layer, true));
    }
  };

  const handleRemoveLayer = (id: Layer['id']): void => {
    if (!id) return;
    if (layers.length <= 1) return;
    commandBus.execute(new RemoveLayerCommand(id, activeLayerId));
  };

  const handleToggleVisible = (layer: Layer): void => {
    commandBus.execute(new SetLayerVisibleCommand(layer.id, layer.visible, !layer.visible));
  };

  const handleToggleLocked = (layer: Layer): void => {
    commandBus.execute(new SetLayerLockedCommand(layer.id, layer.locked, !layer.locked));
  };

  const handleMove = (id: Layer['id'], direction: 'up' | 'down'): void => {
    if (!id) return;
    commandBus.execute(new MoveLayerCommand(id, direction));
  };

  const kindLabel = (type: LayerType): string => t(`layer.kind.${type}`);

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <div className={styles.menuWrap}>
          <button
            type="button"
            className={styles.toolbarButton}
            onClick={() => setMenuOpen((v) => !v)}
            title={t('layer.add')}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          {menuOpen && (
            <ul className={styles.menu} role="menu">
              <li>
                <button
                  type="button"
                  role="menuitem"
                  className={styles.menuItem}
                  onClick={() => handleAddLayer('tile')}
                >
                  {kindLabel('tile')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  role="menuitem"
                  className={styles.menuItem}
                  onClick={() => handleAddLayer('object')}
                >
                  {kindLabel('object')}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  role="menuitem"
                  className={styles.menuItem}
                  onClick={() => handleAddLayer('collision')}
                >
                  {kindLabel('collision')}
                </button>
              </li>
            </ul>
          )}
        </div>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => handleRemoveLayer(activeLayerId)}
          disabled={layers.length <= 1}
          title={t('layer.delete')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
          </svg>
        </button>
        <div className={styles.spacer} />
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => handleMove(activeLayerId, 'up')}
          disabled={!canMoveUp}
          title={t('layer.moveUp')}
          aria-label={t('layer.moveUp')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M6 11l6-6 6 6" />
          </svg>
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => handleMove(activeLayerId, 'down')}
          disabled={!canMoveDown}
          title={t('layer.moveDown')}
          aria-label={t('layer.moveDown')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M6 13l6 6 6-6" />
          </svg>
        </button>
      </div>
      <ul className={styles.list}>
        {layers.map((layer) => {
          const isActive = layer.id === activeLayerId;
          return (
            <li
              key={layer.id}
              className={styles.row}
              data-active={isActive}
              onClick={() => setActiveLayer(layer.id)}
            >
              <button
                type="button"
                className={styles.toggle}
                data-on={layer.visible}
                aria-label={layer.visible ? t('layer.hide') : t('layer.show')}
                aria-pressed={layer.visible}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleVisible(layer);
                }}
              >
                {layer.visible ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A11 11 0 0 1 12 5c6.5 0 10 7 10 7a13.2 13.2 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.39-1.61" />
                    <path d="M2 2l20 20" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                className={styles.toggle}
                data-on={!layer.locked}
                aria-label={layer.locked ? t('layer.unlock') : t('layer.lock')}
                aria-pressed={!layer.locked}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleLocked(layer);
                }}
              >
                {layer.locked ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 13a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
                    <path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0-2 0" />
                    <path d="M8 11V7a4 4 0 1 1 8 0v4" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 13a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" />
                    <path d="M11 16a1 1 0 1 0 2 0a1 1 0 1 0-2 0" />
                    <path d="M8 11V6a4 4 0 0 1 8 0" />
                  </svg>
                )}
              </button>
              <span className={styles.name}>{layer.name}</span>
              <span className={styles.kind}>{kindLabel(layer.type)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
