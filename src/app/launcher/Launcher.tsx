/**
 * Launcher — the workspace picker shown before the editor mounts.
 *
 * Two halves:
 *   - Left: brand + primary actions (`New Workspace`, `Open Folder…`).
 *   - Right: a vertical list of recent workspaces (most-recent-first),
 *     with a per-row remove button.
 *
 * New workspace flow:
 *   1. User clicks `New Workspace` → in-page modal asks for a name.
 *   2. Confirm → `createNewWorkspace(name)` prompts the OS for a
 *      (currently empty) folder, writes the workspace skeleton, and
 *      returns the new ref + active doc id.
 *   3. `loadActiveDocument` hydrates the document store. The recents
 *      list is updated and persisted, then `workspaceStore.enter()`
 *      flips to `phase: 'editor'` — `<EditorShell/>` mounts.
 *
 * Existing-workspace flow (Open Folder or recent click):
 *   1. We end up with a folder path.
 *   2. `openExistingWorkspace(path)` verifies it via `statWorkspace`.
 *   3. `loadActiveDocument(path, docId)` hydrates the document store.
 *   4. Same recents-update + phase flip.
 *
 * Errors stay in the page (transient banner under the action buttons
 * or in the modal) — they never throw.
 */

import { useCallback, useEffect, useState } from 'react';

import { useT } from '@core/i18n';
import { useWorkspaceStore } from '@state/workspaceStore';
import { log } from '@systems/diagnostics';
import { isElectron } from '@systems/persistence/electronBridge';
import {
  createNewWorkspace,
  loadActiveDocument,
  loadRecents,
  openExistingWorkspace,
  pickFolder,
  pushRecent,
  removeRecent,
  saveRecents,
} from '@systems/persistence/index';

import styles from './Launcher.module.css';

import type { RecentEntry, WorkspaceRef } from '@core/workspace/schema';
import type { DocumentId } from '@editor/map/schema/ids';

interface NewModalProps {
  readonly onCancel: () => void;
  readonly onCreated: (
    name: string,
    ref: WorkspaceRef,
    activeDocId: DocumentId,
  ) => Promise<void> | void;
}

function NewModal({ onCancel, onCreated }: NewModalProps): React.ReactElement {
  const t = useT();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const trimmed = name.trim();
  const canConfirm = trimmed.length > 0 && !busy;

  const submit = useCallback(async () => {
    if (!canConfirm) return;
    setBusy(true);
    setError(null);
    const result = await createNewWorkspace(trimmed);
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    await onCreated(trimmed, result.ref, result.activeDocId);
  }, [canConfirm, onCreated, trimmed]);

  return (
    <div
      className={styles.modalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label={t('launcher.new')}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className={styles.modal}>
        <div className={styles.modalTitle}>{t('launcher.new')}</div>
        <div className={styles.modalHint}>{t('launcher.pathHint')}</div>
        <label>
          <span style={{ display: 'block', marginBottom: 4 }}>{t('launcher.nameLabel')}</span>
          <input
            className={styles.modalInput}
            type="text"
            value={name}
            placeholder={t('launcher.namePlaceholder')}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submit();
              if (e.key === 'Escape') onCancel();
            }}
            style={{ width: '100%' }}
          />
        </label>
        {error ? <div className={styles.modalError}>{error}</div> : null}
        <div className={styles.modalButtons}>
          <button type="button" className={styles.modalButton} onClick={onCancel}>
            {t('launcher.cancel')}
          </button>
          <button
            type="button"
            className={`${styles.modalButton} ${styles.primary}`}
            disabled={!canConfirm}
            onClick={() => {
              void submit();
            }}
          >
            {t('launcher.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Launcher(): React.ReactElement {
  const t = useT();
  const recents = useWorkspaceStore((s) => s.recents);
  const setRecents = useWorkspaceStore((s) => s.setRecents);
  const enter = useWorkspaceStore((s) => s.enter);

  const [showNewModal, setShowNewModal] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  // Resolved once on mount. The renderer only sees `window.h5` when
  // it was loaded by the Electron preload script — `npm run dev`
  // (Vite-only) never installs it, and the user is then stuck on the
  // Launcher with no feedback. Surfacing this early is the difference
  // between "the buttons silently do nothing" and "I know why".
  const [electronAvailable, setElectronAvailable] = useState(true);

  // Pull recents once on mount. Each setState replaces the list, so
  // a StrictMode double-mount produces one extra IPC call but no
  // visible UI flicker (the recents list is the same content).
  useEffect(() => {
    setElectronAvailable(isElectron());
    void loadRecents().then(setRecents);
  }, [setRecents]);

  /**
   * Open an existing workspace: stat → load → push recents → enter.
   * Returns the success flag so callers can keep their UI hints in
   * sync if they want to.
   */
  const openPath = useCallback(
    async (path: string, friendlyName?: string): Promise<boolean> => {
      setOpening(true);
      setOpenError(null);

      const stat = await openExistingWorkspace(path);
      if (!stat.ok) {
        setOpenError(stat.error);
        setOpening(false);
        return false;
      }

      const load = await loadActiveDocument(stat.ref.path, stat.activeDocId);
      if (!load.ok) {
        setOpenError(load.error);
        setOpening(false);
        return false;
      }

      // Push to recents AFTER stat succeeds so we don't pollute the
      // recent list with a folder we just verified non-workspace.
      const nextRecents = pushRecent(recents, stat.ref);
      setRecents(nextRecents);
      void saveRecents(nextRecents);

      enter(stat.ref, stat.activeDocId);
      log.info(t('launcher.workspace.opened', { name: friendlyName ?? stat.ref.name }));
      return true;
    },
    [recents, setRecents, enter, t],
  );

  const handleOpen = useCallback(async () => {
    if (!electronAvailable) {
      // The OS folder picker requires the Electron preload. Mirror
      // the bridge-detected error so the user sees the same banner
      // both via the persistent hint above and the inline error
      // here.
      setOpenError(t('launcher.error.noElectron'));
      return;
    }
    const folder = await pickFolder();
    if (!folder) return;
    await openPath(folder);
  }, [electronAvailable, openPath, t]);

  const handleNew = useCallback(() => {
    setShowNewModal(true);
  }, []);

  /**
   * New-workspace finalize: the modal already created the files via
   * `createNewWorkspace`. Hydrate the document, push recents, log,
   * flip to editor. Mirrors the second half of `openPath`.
   */
  const handleCreated = useCallback(
    async (displayName: string, ref: WorkspaceRef, activeDocId: DocumentId) => {
      setShowNewModal(false);

      const load = await loadActiveDocument(ref.path, activeDocId);
      if (!load.ok) {
        setOpenError(load.error);
        return;
      }

      const nextRecents = pushRecent(recents, ref);
      setRecents(nextRecents);
      void saveRecents(nextRecents);

      enter(ref, activeDocId);
      log.info(t('launcher.workspace.created', { name: displayName }));
    },
    [recents, setRecents, enter, t],
  );

  const handleForget = useCallback(
    async (path: string) => {
      const next = removeRecent(recents, path);
      setRecents(next);
      await saveRecents(next);
    },
    [recents, setRecents],
  );

  return (
    <div className={styles.launcher}>
      {!electronAvailable ? (
        <div className={styles.electronBanner} role="status">
          {t('launcher.error.noElectron')}
        </div>
      ) : null}
      <div className={styles.body}>
        <section className={styles.left}>
          <header className={styles.brand}>
            <div className={styles.brandTitle}>{t('launcher.appName')}</div>
            <div className={styles.brandTagline}>{t('launcher.tagline')}</div>
          </header>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.action}
              onClick={handleNew}
              disabled={opening || !electronAvailable}
            >
              <span className={styles.actionLabel}>{t('launcher.new')}</span>
              <span className={styles.actionHint}>{t('launcher.pathHint')}</span>
            </button>
            <button
              type="button"
              className={styles.action}
              onClick={() => {
                void handleOpen();
              }}
              disabled={opening || !electronAvailable}
            >
              <span className={styles.actionLabel}>{t('launcher.open')}</span>
            </button>
            {openError ? <div className={styles.modalError}>{openError}</div> : null}
          </div>
        </section>

        <aside className={styles.right}>
          <div className={styles.recentHeading}>{t('launcher.recent')}</div>
          {recents.length === 0 ? (
            <div className={styles.recentEmpty}>{t('launcher.empty')}</div>
          ) : (
            <div className={styles.recentList}>
              {recents.map((entry: RecentEntry) => (
                <div
                  key={entry.path}
                  className={styles.recentItem}
                  role="button"
                  tabIndex={0}
                  onClick={() => void openPath(entry.path, entry.name)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      void openPath(entry.path, entry.name);
                    }
                  }}
                >
                  <span className={styles.recentName}>{entry.name}</span>
                  <span className={styles.recentPath}>{entry.path}</span>
                  <button
                    type="button"
                    className={styles.recentRemove}
                    title={t('launcher.remove')}
                    aria-label={t('launcher.remove')}
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleForget(entry.path);
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
      {showNewModal ? (
        <NewModal onCancel={() => setShowNewModal(false)} onCreated={handleCreated} />
      ) : null}
    </div>
  );
}
