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
 */

import type { DocumentId, MapId } from './ids';
import type { MapData } from './map';

export type SchemaVersion = `${number}.${number}.${number}`;

export type DocumentKind = 'map';

export interface Document {
  readonly id: DocumentId;
  readonly version: SchemaVersion;
  readonly type: DocumentKind;
  readonly maps: ReadonlyMap<MapId, MapData>;
  readonly activeMapId: MapId;
}
