/**
 * Map editor: Tools.
 *
 * Each tool owns its own DOM listeners and only acts when its id
 * matches `toolStore.activeToolId`. Tools never mutate the
 * Document directly — they build Commands and dispatch them via the
 * CommandBus.
 *
 * Step 24: every concrete tool implements {@link Tool} (re-exported
 * from `@shared/tool`); the constructor is parameterless and the
 * canvas reference is supplied via `attach(canvas)`.
 */

export type { Tool } from '@shared/tool/Tool';
export { BrushTool } from './BrushTool';
export { EraserTool } from './EraserTool';
export { PanTool } from './PanTool';
export { RectTool } from './RectTool';
export { SelectTool } from './SelectTool';
export { EntityTool } from './EntityTool';
export { ColliderTool } from './ColliderTool';