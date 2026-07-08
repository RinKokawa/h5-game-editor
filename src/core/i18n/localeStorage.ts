/**
 * Locale persistence — localStorage-backed read/write of the user's
 * chosen locale.
 *
 * Both helpers are guarded against non-DOM environments (tests under
 * happy-dom are fine, but raw `node` without `--dom` would throw on
 * `localStorage` access; we degrade to `DEFAULT_LOCALE` silently).
 */

import { AVAILABLE_LOCALES, DEFAULT_LOCALE, type Locale } from './types';

const STORAGE_KEY = 'h5-editor:locale:v1';

const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && (AVAILABLE_LOCALES as readonly string[]).includes(value);

export const loadPersistedLocale = (): Locale => {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isLocale(raw) ? raw : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
};

export const persistLocale = (locale: Locale): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Storage may be full or disabled (private mode). Silent: the
    // in-memory locale still works for the current session.
  }
};
