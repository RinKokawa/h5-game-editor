/**
 * Document — the root object.
 *
 * The Document is the single source of truth for the project. It is a
 * discriminated union keyed by {@link Document.type}; v0.1 only ships
 * 'map' but the seam is reserved for future editors (Dialogue, Animation,
 * Quest, ...) without changing the architecture.
 *
 * Serialization: the entire Document round-trips through JSON via the
 * core/serialization layer. The {@link Document.version} field is the
 * schema version used to drive migrations.
 *
 * `DocumentMeta` lives on the Document schema (Step 21) so project-
 * level scalars like `tileSize` and `mapSize` are first-class
 * document data — they mutate only through Commands, never directly
 * from view code.
 */

import type { Size } from './geometry';
import type { DocumentId, MapId } from './ids';
import type { MapData } from './map';

export type SchemaVersion = `${number}.${number}.${number}`;

export type DocumentKind = 'map';

/**
 * Project-level scalars that don't belong inside a specific
 * {@link MapData}. `tileSize` and `mapSize` mutate only through
 * Commands dispatched via the CommandBus (see CLAUDE.md §3
 * invariant 1).
 */
export interface DocumentMeta {
  readonly tileSize: number;
  readonly mapSize: Size;
}

export interface Document {
  readonly id: DocumentId;
  readonly version: SchemaVersion;
  readonly type: DocumentKind;
  /** Project-level scalars — Step 21 onwards. */
  readonly meta: DocumentMeta;
  readonly maps: ReadonlyMap<MapId, MapData>;
  readonly activeMapId: MapId;
}
