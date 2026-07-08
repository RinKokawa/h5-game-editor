/**
 * i18n store + hooks — thin Zustand wrapper around the pure
 * `translate()` function.
 *
 * The current locale lives in a small store inside this module
 * (`core/i18n/`), NOT in `state/`. Reason: `core/` cannot import
 * from `state/` per the ESLint boundary rule, so any store that
 * `core/i18n/` needs must live in `core/i18n/` itself. Zustand is a
 * library, not a layer — it's used the same way `state/` uses it.
 *
 * Side effects on locale change:
 *   - `<html lang>` is updated for screen-reader a11y
 *   - choice is persisted to `localStorage`
 *   - missing-key warnings are deduplicated per session
 */

import { useSyncExternalStore } from 'react';
import { createStore } from 'zustand/vanilla';

import { loadBundle } from './bundles/index';
import { loadPersistedLocale, persistLocale } from './localeStorage';
import { translate } from './translate';
import { type Bundle, type Locale, type Vars } from './types';

const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV === true;

interface LocaleState {
  readonly locale: Locale;
}

interface LocaleActions {
  readonly setLocale: (next: Locale) => void;
}

type LocaleStore = LocaleState & LocaleActions;

const initial = loadPersistedLocale();
syncHtmlLang(initial);

const store = createStore<LocaleStore>((set) => ({
  locale: initial,
  setLocale: (next) => {
    syncHtmlLang(next);
    persistLocale(next);
    set({ locale: next });
  },
}));

function syncHtmlLang(locale: Locale): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
}

const warned = new Set<string>();
const warnMissing = (key: string): void => {
  if (!isDev) return;
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[i18n] missing key: ${key}`);
};

const selectLocale = (s: LocaleStore): Locale => s.locale;

/** Current locale. Re-renders the caller when it changes. */
export const useLocale = (): Locale => {
  return useSyncExternalStore(
    store.subscribe,
    () => selectLocale(store.getState()),
    () => selectLocale(store.getState()),
  );
};

/** Imperative setter — used by the language switcher in MenuBar. */
export const setLocale = (next: Locale): void => {
  store.getState().setLocale(next);
};

/**
 * Resolve a translated string in the current locale.
 *
 * In React components, prefer `useT()` so the component re-renders
 * when the locale flips. This imperative variant is for non-React
 * callers (console log strings, etc.).
 */
export const t = (key: string, vars?: Vars): string => {
  const locale = store.getState().locale;
  const bundle: Bundle = loadBundle(locale);
  const result = translate(bundle, key, vars);
  if (result === key) warnMissing(key);
  return result;
};

/**
 * React hook — returns a stable `t(key, vars?)` bound to the current
 * locale. Re-renders the caller when the locale flips.
 */
export const useT = (): ((key: string, vars?: Vars) => string) => {
  const locale = useLocale();
  // Bundle lookup is cheap (object ref); no need to memoise the
  // returned function — React's render closure is fine.
  return (key, vars) => {
    const bundle = loadBundle(locale);
    const result = translate(bundle, key, vars);
    if (result === key) warnMissing(key);
    return result;
  };
};
