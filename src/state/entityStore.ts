/**
 * Entity tool state — currently selected entity type.
 *
 * Mirrors `brushStore` for the entity world: the entity palette
 * (built on `DEFAULT_ENTITY_TYPES`) is separate from the tile
 * palette, so they live in different stores.
 */

import { create } from 'zustand';

import type { EntityTypeId } from '@editor/map/palette/defaultEntityTypes';

export interface EntityState {
  readonly activeEntityType: EntityTypeId;
  readonly setActiveEntityType: (id: EntityTypeId) => void;
}

export const useEntityStore = create<EntityState>((set) => ({
  activeEntityType: 'sprite',
  setActiveEntityType: (id) => set({ activeEntityType: id }),
}));
