/**
 * Active tool state.
 *
 * The currently selected tool id. Tools subscribe to this and only act
 * on input events when `activeToolId === <their id>`. New tools are
 * additive: add a ToolId variant and a Toolbar button.
 */

import { create } from 'zustand';

export type ToolId = 'select' | 'pan' | 'brush' | 'eraser' | 'entity' | 'collider';

export interface ToolState {
  readonly activeToolId: ToolId;

  readonly setActiveTool: (id: ToolId) => void;
}

export const useToolStore = create<ToolState>((set) => ({
  activeToolId: 'brush',
  setActiveTool: (id) => set({ activeToolId: id }),
}));
