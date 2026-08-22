/**
 * AboutDialog — modal version / copyright / repo dialog opened from
 * Help → About.
 *
 * Lifecycle:
 *   - `open` prop controls visibility; `null` short-circuits the
 *     render so the dialog isn't in the DOM when closed (cheaper
 *     than display:none + lets `useEffect` skip the listener setup).
 *   - Backdrop click closes; clicking inside the dialog stops
 *     propagation so the dialog itself isn't a click target.
 *   - Escape key closes via a document-level listener that only
 *     attaches while the dialog is open.
 *
 * Wiring:
 *   - `onClose` and `onOpenExternal` are props, not direct bridge
 *     calls — `panels/` cannot import from `systems/` per the
 *     ESLint boundary, so the parent (`app/EditorShell`) owns
 *     those callbacks.
 */

import { useEffect } from 'react';

import { useT } from '@core/i18n';

import styles from './AboutDialog.module.css';

export interface AboutDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  /**
   * Open a URL in the OS default browser. Caller (EditorShell)
   * routes this through `shell.openExternal` on the main process.
   */
  readonly onOpenExternal: (url: string) => void;
}

const REPO_URL = 'https://github.com/RinKokawa/h5-game-editor';
const APP_VERSION = '0.1.0';
const AUTHOR = '泠泠子川';
const LICENSE = 'Apache 2.0';

export function AboutDialog({ open, onClose, onOpenExternal }: AboutDialogProps) {
  const t = useT();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} onMouseDown={onClose} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        onMouseDown={(e) => {
          // Keep clicks inside the dialog from bubbling to the
          // backdrop (which would otherwise close).
          e.stopPropagation();
        }}
      >
        <header className={styles.header}>
          <h2 id="about-title" className={styles.title}>
            H5 Game Editor
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label={t('about.close')}
          >
            ×
          </button>
        </header>

        <div className={styles.content}>
          <div className={styles.versionRow}>
            <span className={styles.version}>v{APP_VERSION}</span>
          </div>
          <p className={styles.description}>{t('about.projectDescription')}</p>

          <hr className={styles.divider} />

          <dl className={styles.fields}>
            <div className={styles.field}>
              <dt className={styles.label}>{t('about.author')}</dt>
              <dd className={styles.value}>{AUTHOR}</dd>
            </div>
            <div className={styles.field}>
              <dt className={styles.label}>{t('about.repository')}</dt>
              <dd>
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => {
                    onOpenExternal(REPO_URL);
                  }}
                >
                  github.com/RinKokawa/h5-game-editor
                </button>
              </dd>
            </div>
            <div className={styles.field}>
              <dt className={styles.label}>{t('about.license')}</dt>
              <dd className={styles.value}>{LICENSE}</dd>
            </div>
          </dl>

          <hr className={styles.divider} />

          <div className={styles.builtWith}>
            <div className={styles.label}>{t('about.builtWith')}</div>
            <div className={styles.builtList}>
              React 19 · PixiJS 8 · Zustand 5 · Vite 6 · TypeScript 5.6
            </div>
          </div>
        </div>

        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.closeFooterButton}
            onClick={onClose}
          >
            {t('about.close')}
          </button>
        </footer>
      </div>
    </div>
  );
}