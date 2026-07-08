/**
 * i18n types — locales, bundles, interpolation vars.
 *
 * `Locale` is a closed union. New locales are added by extending the
 * union AND registering a bundle in `./bundles/index.ts` AND adding a
 * native name to `NATIVE_NAMES` below.
 *
 * `Bundle` is a flat `{ key: translatedString }` record. Keys are
 * dot-separated to keep them grep-friendly and cheap to lazy-load by
 * prefix later.
 *
 * `Vars` accepts strings and numbers (status bar uses `{n} cells`).
 */

export type Locale = 'en' | 'zh-CN';

export const DEFAULT_LOCALE: Locale = 'en';

export const AVAILABLE_LOCALES = ['en', 'zh-CN'] as const satisfies readonly Locale[];

export const NATIVE_NAMES: Readonly<Record<Locale, string>> = {
  en: 'English',
  'zh-CN': '简体中文',
};

export type Bundle = Readonly<Record<string, string>>;

export type Vars = Readonly<Record<string, string | number>>;
