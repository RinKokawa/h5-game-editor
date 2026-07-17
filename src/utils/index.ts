/**
 * Utils: Pure utility functions.
 *
 * Stateless helpers — ID generation, debounce/throttle, object deep
 * copy, etc. No imports from core/editor/canvas/panels/state.
 *
 * Step 24 lands two helpers here that were previously copy-pasted in
 * multiple files: `isEditableTarget` (4 call sites) and
 * `generatePrefixedId` (used by tool auto-naming). Both are pure
 * and have no dependencies.
 */

export { generatePrefixedId, generateId } from './ids';
export { debounce, throttle } from './timing';
export { deepFreeze } from './deepFreeze';
export { isEditableTarget } from './dom';