/**
 * LayerPanel — interactive list of Document layers.
 *
 * Every mutation is dispatched as a Command via the CommandBus:
 *
 *   click row         → setActiveLayer (view-only)
 *   + button          → AddTileLayerCommand
 *   − button          → RemoveLayerCommand
 *   visibility toggle → SetLayerVisibleCommand
 *   lock toggle       → SetLayerLockedCommand
 *   ↑ / ↓ buttons     → MoveLayerCommand
 *
 * `layers[0]` is the visual top of the stack — also the top row of
 * the panel. "Move up" shifts a row toward index 0.
 */

import { commandBus } from '@core/command/commandBusSingleton';
import { useT } from '@core/i18n';
import {
  AddTileLayerCommand,
  MoveLayerCommand,
  RemoveLayerCommand,
  SetLayerLockedCommand,
  SetLayerVisibleCommand,
  createTileLayer,
} from '@editor/map/commands/index';
import { useDocumentStore } from '@state/documentStore';

import styles from './LayerPanel.module.css';

import type { Layer } from '@editor/map/schema/layer';

export function LayerPanel() {
  const t = useT();
  const layers = useDocumentStore((s) => s.layers);
  const activeLayerId = useDocumentStore((s) => s.activeLayerId);

  const setActiveLayer = useDocumentStore((s) => s.setActiveLayer);

  const activeIndex = layers.findIndex((l) => l.id === activeLayerId);
  const canMoveUp = activeIndex > 0;
  const canMoveDown = activeIndex >= 0 && activeIndex < layers.length - 1;

  const handleAddLayer = (): void => {
    const layer = createTileLayer(layers);
    commandBus.execute(new AddTileLayerCommand(layer, true));
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

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={handleAddLayer}
          title={t('layer.add')}
        >
          +
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => handleRemoveLayer(activeLayerId)}
          disabled={layers.length <= 1}
          title={t('layer.delete')}
        >
          −
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
          ↑
        </button>
        <button
          type="button"
          className={styles.toolbarButton}
          onClick={() => handleMove(activeLayerId, 'down')}
          disabled={!canMoveDown}
          title={t('layer.moveDown')}
          aria-label={t('layer.moveDown')}
        >
          ↓
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
                {layer.visible ? '◉' : '○'}
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
                {layer.locked ? '🔒' : '🔓'}
              </button>
              <span className={styles.name}>{layer.name}</span>
              <span className={styles.kind}>{t(`layer.kind.${layer.type}`)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
