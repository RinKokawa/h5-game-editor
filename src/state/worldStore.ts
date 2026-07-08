/**
 * World view configuration — display-only settings.
 *
 * Holds purely cosmetic configuration the Grid uses. Document-level
 * values (tileSize, mapSize) live in `documentStore` because they are
 * project data, not display config.
 */

import { create } from 'zustand';

export const DEFAULT_GRID_COLOR = 0x3a3a3a;

export interface WorldState {
  readonly showGrid: boolean;
  readonly gridColor: number;

  readonly setShowGrid: (show: boolean) => void;
  readonly setGridColor: (color: number) => void;
}

export const useWorldStore = create<WorldState>((set) => ({
  showGrid: true,
  gridColor: DEFAULT_GRID_COLOR,

  setShowGrid: (show) => set({ showGrid: show }),
  setGridColor: (color) => set({ gridColor: color }),
}));
