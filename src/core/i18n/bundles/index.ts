/**
 * Bundle registry — maps each `Locale` to its `Bundle`.
 *
 * Static imports for v1; the `loadBundle(locale)` seam lets v2 swap
 * in network-loaded bundles without changing call sites.
 */

import en from './en';
import jaJP from './ja-JP';
import zhCN from './zh-CN';

import type { Bundle, Locale } from '../types';

export const bundles: Readonly<Record<Locale, Bundle>> = {
  en,
  'zh-CN': zhCN,
  'ja-JP': jaJP,
};

/** Returns the bundle for a given locale. v1 is synchronous. */
export const loadBundle = (locale: Locale): Bundle => bundles[locale];
