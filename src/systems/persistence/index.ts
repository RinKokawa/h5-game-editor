/**
 * Systems: Persistence.
 *
 * localStorage-backed document save / load. Pure function surface
 * (`saveDocument`, `loadDocument`) plus a keyboard-shortcut helper.
 */

export { saveDocument, loadDocument, hasSavedDocument } from './documentIO';
export type { SaveOutcome, LoadOutcome } from './documentIO';
export { DocumentIOShortcuts } from './DocumentIOShortcuts';
