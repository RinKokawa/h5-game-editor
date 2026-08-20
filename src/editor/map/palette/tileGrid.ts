/**
 * Pure tileset-grid math.
 *
 * A tileset image is a regular grid: equal-sized tiles, an optional uniform
 * gap between them (`spacing`), and an optional inset from the image edge
 * (`margin`) — the Tiled convention. These helpers convert image dimensions
 * plus grid parameters into the derived values the {@link Tileset} schema
 * (see `../schema/tileset`) and the texture slicer (see `src/assets/`) both
 * need. No Pixi imports: the math stays renderer-agnostic and unit-testable.
 */

/** Grid parameters shared by every tile of one tileset image. */
export interface TileGridLayout {
  readonly tileWidth: number;
  readonly tileHeight: number;
  readonly spacing: number;
  readonly margin: number;
}

/**
 * Grid + layout facts, structurally satisfied by {@link Tileset} — callers
 * can pass a schema `Tileset` directly.
 */
export interface TileGridSpec extends TileGridLayout {
  /** Number of tiles per row in the source image. */
  readonly columns: number;
  /** Total number of tiles in the set. */
  readonly tileCount: number;
}

/** Derived grid shape of a tileset image. */
export interface TilesetGridInfo {
  readonly columns: number;
  readonly rows: number;
  readonly tileCount: number;
}

/** Pixel rectangle of one tile inside the source image. */
export interface TileFrameRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Derive the grid shape from image dimensions. Throws when the image does
 * not tile exactly — a partial row/column means the grid parameters do not
 * describe the image, and slicing it would silently produce broken frames.
 */
export const tilesetGrid = (
  layout: TileGridLayout,
  imageWidth: number,
  imageHeight: number,
): TilesetGridInfo => {
  const { tileWidth, tileHeight, spacing, margin } = layout;
  if (tileWidth <= 0 || tileHeight <= 0) {
    throw new Error(`Tile size must be positive (got ${tileWidth}×${tileHeight}).`);
  }
  if (spacing < 0 || margin < 0) {
    throw new Error(`Spacing and margin must be non-negative (got ${spacing}/${margin}).`);
  }
  const usableWidth = imageWidth - margin * 2;
  const usableHeight = imageHeight - margin * 2;
  if (usableWidth <= 0 || usableHeight <= 0) {
    throw new Error(`Image ${imageWidth}×${imageHeight} is smaller than its ${margin}px margins.`);
  }
  // `spacing` trails every tile including the last one on a row/column,
  // so the usable extent covers N tiles + (N - 1) gaps.
  const stepWidth = tileWidth + spacing;
  const stepHeight = tileHeight + spacing;
  const columns = (usableWidth + spacing) / stepWidth;
  const rows = (usableHeight + spacing) / stepHeight;
  if (!Number.isInteger(columns) || !Number.isInteger(rows)) {
    throw new Error(
      `Image ${imageWidth}×${imageHeight} does not tile exactly with ` +
        `${tileWidth}×${tileHeight} tiles (spacing ${spacing}, margin ${margin}).`,
    );
  }
  return { columns, rows, tileCount: columns * rows };
};

/**
 * Pixel rectangle of tile `tileIndex` (row-major from the top-left). Throws
 * on out-of-range indices — slicing beyond the image would hand the renderer
 * an empty frame that renders as nothing.
 */
export const tileFrameRect = (spec: TileGridSpec, tileIndex: number): TileFrameRect => {
  if (!Number.isInteger(tileIndex) || tileIndex < 0 || tileIndex >= spec.tileCount) {
    throw new Error(`Tile index ${tileIndex} is out of range (tileCount ${spec.tileCount}).`);
  }
  const column = tileIndex % spec.columns;
  const row = Math.floor(tileIndex / spec.columns);
  return {
    x: spec.margin + column * (spec.tileWidth + spec.spacing),
    y: spec.margin + row * (spec.tileHeight + spec.spacing),
    width: spec.tileWidth,
    height: spec.tileHeight,
  };
};

/**
 * Full sheet size implied by a grid spec — the inverse of
 * {@link tilesetGrid}. Used by CSS-sprite consumers (the palette
 * thumbnails) that need to scale the whole sheet, not one frame.
 */
export const tilesetImageSize = (spec: TileGridSpec): { width: number; height: number } => {
  const rows = spec.tileCount / spec.columns;
  return {
    width: spec.margin * 2 + spec.columns * spec.tileWidth + (spec.columns - 1) * spec.spacing,
    height: spec.margin * 2 + rows * spec.tileHeight + (rows - 1) * spec.spacing,
  };
};
