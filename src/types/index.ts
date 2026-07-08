/**
 * Types: Global TypeScript types.
 *
 * Cross-cutting type definitions that any module may consume without
 * introducing an upward dependency. Editor-specific schemas live under
 * editor/<name>/schema and may re-export from here.
 *
 * The `@local-types` alias (path alias) points to this directory.
 */

export type { Point, WorldPoint, ScreenPoint, Size, Rect, Color } from './geometry';
