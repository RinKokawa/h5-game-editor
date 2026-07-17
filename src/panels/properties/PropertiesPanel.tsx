/**
 * PropertiesPanel — flat key/value view of the current selection.
 *
 * Reads selectionStore + documentStore and renders the live data of
 * whatever is currently selected:
 *
 *   - Entity      → id, type, name, position, size, rotation
 *   - Collider    → id, type, kind, name, position, size (box) / radius
 *                    (circle) / vertices (polygon), rotation (box only)
 *   - Tile cells  → count, per-cell tilesetId/tileId (one row per cell)
 *   - nothing     → empty state with a hint that mirrors the Inspector
 *
 * Distinct from the Inspector: Inspector is the schema-driven editor
 * with field renderers and undoable inputs; Properties is the always-
 * present read-only fallback so plugin authors and debugging get
 * something useful out of the box.
 *
 * Subscribes to selectionStore and documentStore so React re-renders
 * fire on either change.
 */

import { useT } from '@core/i18n';
import { decodeTileCoord } from '@editor/map/schema/tile';
import { useDocumentStore } from '@state/documentStore';
import { useSelectionStore } from '@state/selectionStore';

import styles from './PropertiesPanel.module.css';

import type { Collider } from '@editor/map/schema/collider';
import type { Entity } from '@editor/map/schema/entity';
import type { TileCoord } from '@editor/map/schema/geometry';
import type { LayerId, TileCoordKey } from '@editor/map/schema/ids';

export function PropertiesPanel() {
  const t = useT();
  const selection = useSelectionStore((s) => s.selection);

  if (!selection) {
    return (
      <div className={styles.panel} data-testid="properties-empty">
        <p className={styles.empty}>{t('properties.empty.hint')}</p>
      </div>
    );
  }

  if (selection.kind === 'entity') {
    return <EntityRows entityId={selection.entityId} />;
  }
  if (selection.kind === 'collider') {
    return <ColliderRows colliderId={selection.colliderId} />;
  }
  return <TileRows layerId={selection.layerId} cellKeys={selection.cells} />;
}

const EntityRows = ({ entityId }: { entityId: Entity['id'] }) => {
  const t = useT();
  const entity = useDocumentStore((s) => s.entities.get(entityId));
  if (!entity) {
    return (
      <div className={styles.panel} data-testid="properties-stale">
        <p className={styles.empty}>{t('properties.stale')}</p>
      </div>
    );
  }
  return (
    <div className={styles.panel} data-testid="properties-entity">
      <table className={styles.table}>
        <tbody>
          <Row label={t('properties.id')} value={entity.id} />
          <Row label={t('properties.type')} value={entity.type} />
          <Row label={t('properties.name')} value={entity.name} />
          <Row label={t('properties.position')} value={formatPoint(entity.position)} />
          <Row label={t('properties.size')} value={formatSize(entity.size)} />
          <Row label={t('properties.rotation')} value={`${formatDegrees(entity.rotation)}°`} />
        </tbody>
      </table>
    </div>
  );
};

const ColliderRows = ({ colliderId }: { colliderId: Collider['id'] }) => {
  const t = useT();
  const collider = useDocumentStore((s) => s.colliders.get(colliderId));
  if (!collider) {
    return (
      <div className={styles.panel} data-testid="properties-stale">
        <p className={styles.empty}>{t('properties.stale')}</p>
      </div>
    );
  }
  return (
    <div className={styles.panel} data-testid="properties-collider">
      <table className={styles.table}>
        <tbody>
          <Row label={t('properties.id')} value={collider.id} />
          <Row label={t('properties.type')} value={collider.type} />
          <Row label={t('properties.kind')} value={collider.kind} />
          <Row label={t('properties.name')} value={collider.name} />
          <Row label={t('properties.position')} value={formatPoint(collider.position)} />
          {collider.type === 'box' ? (
            <>
              <Row label={t('properties.size')} value={formatSize(collider.size)} />
              <Row label={t('properties.rotation')} value={`${formatDegrees(collider.rotation)}°`} />
            </>
          ) : collider.type === 'circle' ? (
            <Row label={t('properties.radius')} value={`${Math.round(collider.radius)}px`} />
          ) : (
            <Row label={t('properties.vertices')} value={String(collider.vertices.length)} />
          )}
        </tbody>
      </table>
    </div>
  );
};

const TileRows = ({
  layerId,
  cellKeys,
}: {
  layerId: LayerId;
  cellKeys: ReadonlySet<TileCoordKey>;
}) => {
  const t = useT();
  const layer = useDocumentStore((s) => s.layers.find((l) => l.id === layerId));
  if (!layer || layer.type !== 'tile') {
    return (
      <div className={styles.panel} data-testid="properties-stale">
        <p className={styles.empty}>{t('properties.stale')}</p>
      </div>
    );
  }
  const coords: TileCoord[] = [];
  for (const k of cellKeys) {
    coords.push(decodeTileCoord(k));
  }
  coords.sort((a, b) => (a.y - b.y) * 10000 + (a.x - b.x));
  return (
    <div className={styles.panel} data-testid="properties-tiles">
      <table className={styles.table}>
        <tbody>
          <Row label={t('properties.layer')} value={layer.name} />
          <Row label={t('properties.cells')} value={String(coords.length)} />
          {coords.map((c) => {
            const key: TileCoordKey = `${c.x},${c.y}` as TileCoordKey;
            const placed = layer.data.tiles.get(key);
            return (
              <Row
                key={key}
                label={`(${c.x}, ${c.y})`}
                value={placed ? `${placed.tilesetId} / ${placed.tileId}` : '—'}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <tr className={styles.row}>
    <th className={styles.key}>{label}</th>
    <td className={styles.value}>{value}</td>
  </tr>
);

const formatPoint = (p: { x: number; y: number }): string => `${p.x}, ${p.y}`;
const formatSize = (s: { width: number; height: number }): string => `${s.width} × ${s.height}`;
/** Radians → degrees, 2 decimals, trimmed. */
const formatDegrees = (rad: number): string => {
  const d = (rad * 180) / Math.PI;
  return d.toFixed(2);
};
