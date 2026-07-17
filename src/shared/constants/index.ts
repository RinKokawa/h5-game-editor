/**
 * Shared: Constants.
 *
 * App-wide constants that have no business logic — grid color,
 * default tile size, minimum drag extent, etc. Anything that
 * depends on Document or runtime state does NOT live here.
 *
 * Step 24 lifts `MIN_BOX_SIZE` out of `ColliderTool.ts` into this
 * canonical home so other shape-placement tools (future circle,
 * polygon) can share the threshold without re-declaring it.
 */

export const MIN_BOX_SIZE = 4;

/** Default camera padding (world units) when no map size is set. */
export const DEFAULT_CANVAS_PADDING = 64;

/** Default grid color used by GridView when no theme overrides. */
export const DEFAULT_GRID_COLOR = 0x4a4a52;