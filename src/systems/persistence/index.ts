/**
 * Systems: Persistence.
 *
 * Workspace-aware document I/O + IPC bridges.
 *
 * After Step 18 the umbrella covers:
 *   - Document I/O   — workspace-scoped save/load (no dialogs in v0.1)
 *   - Workspace I/O  — create / open / list workspaces; load documents
 *   - Recents        — pure list manipulation + on-disk persistence in
 *                      `app.getPath('userData')/recent.json`
 *
 * The legacy free-form file-dialog path (`openDialog` / `saveAsDialog`)
 * is no longer wired to the File menu but the IPC handlers are still
 * available on `window.h5` — useful for a future "Export…" flow.
 */

export { saveDocument, loadDocument } from './documentIO';
export type { SaveOutcome, LoadOutcome } from './documentIO';
export { documentIOShortcuts } from './DocumentIOShortcuts';
export {
  createNewWorkspace,
  loadActiveDocument,
  openExistingWorkspace,
  serializeActiveDocument,
} from './workspaceIO';
export type { WorkspaceOutcome } from './workspaceIO';
export {
  loadRecents,
  saveRecents,
  pushRecent,
  removeRecent,
  MAX_RECENT_ENTRIES,
} from './recentWorkspaces';
export { pickFolder } from './electronBridge';
