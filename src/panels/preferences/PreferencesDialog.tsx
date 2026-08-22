/**
 * PreferencesDialog — modal opened from Edit → Preferences (Blender
 * convention).
 *
 * Holds application-wide settings. v0.1 ships only the language
 * picker; future sections (Appearance, Keyboard shortcuts, …) plug
 * in below the same backdrop / esc-close / click-outside pattern.
 *
 * Lifecycle:
 *   - `open` prop controls visibility; `null` short-circuits the
 *     render so the dialog isn't in the DOM when closed.
 *   - Backdrop click closes; clicking inside the dialog stops
 *     propagation so the dialog itself isn't a click target.
 *   - Escape key closes via a document-level listener that only
 *     attaches while the dialog is open.
 *
 * `setLocale` / `useLocale` come from `@core/i18n`, which panels
 * can import directly per the ESLint boundary — no need to route
 * through EditorShell props for this.
 */

import { useEffect } from 'react';

import { AVAILABLE_LOCALES, NATIVE_NAMES, setLocale, useLocale, useT } from '@core/i18n';

import styles from './PreferencesDialog.module.css';

import type { Locale } from '@core/i18n';

export interface PreferencesDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function PreferencesDialog({ open, onClose }: PreferencesDialogProps) {
  const t = useT();
  const currentLocale = useLocale();

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
        aria-labelledby="preferences-title"
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <header className={styles.header}>
          <h2 id="preferences-title" className={styles.title}>
            {t('preferences.title')}
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
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>{t('preferences.language')}</h3>
            <p className={styles.sectionHint}>{t('preferences.languageHint')}</p>
            <div className={styles.localeList} role="radiogroup" aria-label={t('preferences.language')}>
              {AVAILABLE_LOCALES.map((localeId: Locale) => {
                const isActive = localeId === currentLocale;
                return (
                  <label
                    key={localeId}
                    className={isActive ? `${styles.localeOption} ${styles.localeOptionActive}` : styles.localeOption}
                  >
                    <input
                      type="radio"
                      name="locale"
                      value={localeId}
                      checked={isActive}
                      onChange={() => {
                        setLocale(localeId);
                      }}
                      className={styles.localeRadio}
                    />
                    <span className={styles.localeLabel}>{NATIVE_NAMES[localeId]}</span>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Future sections slot in here, same border / padding rhythm. */}
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