/**
 * Document change events.
 *
 * Every mutation dispatched through the Command Bus emits exactly one
 * {@link DocumentChange}. The Renderer subscribes and applies incremental
 * updates without re-querying the Document for adjacent state.
 *
 * Adding a new event kind is additive: existing subscribers ignore it.
 * Removing or renaming an event kind is a breaking change.
 */

import type { Collider } from './collider';
import type { Entity } from './entity';
import type { TileCoord } from './geometry';
import type { ColliderId, EntityId, LayerId, MapId, TilesetId } from './ids';
import type { PlacedTile } from './tile';
import type { Tileset } from './tileset';

export type DocumentChange =
  // ── Document-level ──────────────────────────────────────────────────────
  | { readonly type: 'document-replaced' }
  | { readonly type: 'document-cleared' }

  // ── Map-level ───────────────────────────────────────────────────────────
  | { readonly type: 'map-meta-changed'; readonly mapId: MapId }
  | {
      readonly type: 'map-resized';
      readonly mapId: MapId;
      readonly prevWidth: number;
      readonly prevHeight: number;
      readonly nextWidth: number;
      readonly nextHeight: number;
    }

  // ── Tilesets ────────────────────────────────────────────────────────────
  | { readonly type: 'tileset-added'; readonly mapId: MapId; readonly tileset: Tileset }
  | { readonly type: 'tileset-removed'; readonly mapId: MapId; readonly tilesetId: TilesetId }
  | { readonly type: 'tileset-updated'; readonly mapId: MapId; readonly tilesetId: TilesetId }

  // ── Layers ──────────────────────────────────────────────────────────────
  | {
      readonly type: 'layer-added';
      readonly mapId: MapId;
      readonly layerId: LayerId;
      readonly index: number;
    }
  | { readonly type: 'layer-removed'; readonly mapId: MapId; readonly layerId: LayerId }
  | {
      readonly type: 'layer-reordered';
      readonly mapId: MapId;
      readonly layerId: LayerId;
      readonly prevIndex: number;
      readonly nextIndex: number;
    }
  | { readonly type: 'layer-updated'; readonly mapId: MapId; readonly layerId: LayerId }

  // ── Tiles ───────────────────────────────────────────────────────────────
  | {
      readonly type: 'tile-set';
      readonly mapId: MapId;
      readonly layerId: LayerId;
      readonly coord: TileCoord;
      readonly prev: PlacedTile | null;
      readonly next: PlacedTile | null;
    }

  // ── Entities ────────────────────────────────────────────────────────────
  | { readonly type: 'entity-added'; readonly mapId: MapId; readonly entity: Entity }
  | { readonly type: 'entity-removed'; readonly mapId: MapId; readonly entityId: EntityId }
  | { readonly type: 'entity-updated'; readonly mapId: MapId; readonly entityId: EntityId }

  // ── Colliders ───────────────────────────────────────────────────────────
  | { readonly type: 'collider-added'; readonly mapId: MapId; readonly collider: Collider }
  | {
      readonly type: 'collider-removed';
      readonly mapId: MapId;
      readonly colliderId: ColliderId;
    }
  | {
      readonly type: 'collider-updated';
      readonly mapId: MapId;
      readonly colliderId: ColliderId;
    };
