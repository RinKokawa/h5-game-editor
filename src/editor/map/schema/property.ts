/**
 * Extensible property bag.
 *
 * Every persistent object (Map, Layer, Entity, Tile, Collider) carries a
 * {@link PropertyBag} for user-defined metadata. The schema is intentionally
 * a tagged union — new value kinds can be added without breaking old data.
 */

import type { Color } from './geometry';

export type PropertyValue =
  | { readonly type: 'string'; readonly value: string }
  | { readonly type: 'number'; readonly value: number }
  | { readonly type: 'boolean'; readonly value: boolean }
  | { readonly type: 'color'; readonly value: Color }
  | { readonly type: 'enum'; readonly value: string; readonly options: readonly string[] }
  | {
      readonly type: 'ref';
      readonly value: string;
      readonly target: 'entity' | 'layer' | 'tileset';
    };

export interface PropertyBag {
  readonly entries: ReadonlyMap<string, PropertyValue>;
}
