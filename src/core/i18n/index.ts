/**
 * Core: i18n — editor UI translation (Step 17).
 *
 * Self-contained module: pure `translate()` function, Zustand-backed
 * locale store, two bundles (en, zh-CN), localStorage persistence.
 *
 * The locale store lives HERE (not in `state/`) because `core/`
 * cannot import from `state/` per the ESLint boundary rule, and the
 * store needs to be observable by code in this module. Zustand is a
 * library, not a layer — using it inside `core/` is fine and follows
 * the same pattern as `state/`.
 *
 * Public surface:
 *   useT()           — React hook, returns a bound `t(key, vars?)`
 *   useLocale()      — current locale (re-renders on change)
 *   setLocale(loc)   — imperative setter (used by the language menu)
 *   t(key, vars?)    — non-React variant
 *   NATIVE_NAMES     — switcher labels (always shown in their own
 *                      language, regardless of current UI language)
 */

export { useLocale, useT, setLocale, t } from './i18n';
export { translate } from './translate';
export { AVAILABLE_LOCALES, DEFAULT_LOCALE, NATIVE_NAMES } from './types';
export type { Bundle, Locale, Vars } from './types';
