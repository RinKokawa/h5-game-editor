/**
 * Pure translation function — no Zustand, no DOM, no I/O.
 *
 * Contract:
 *   - hit   → bundle[key] with `{name}` placeholders replaced by vars
 *   - miss  → returns the key itself; caller decides how to surface
 *             (we don't throw, missing keys shouldn't crash the UI)
 *   - missing `vars[name]` → literal `{name}` is kept
 *   - extra `vars` → ignored
 *   - no escape syntax in v1 (YAGNI; revisit if a label needs `{`)
 *
 * Pure so it's unit-testable in isolation. The store-backed wrapper
 * lives in `i18n.ts` and adds the warn-on-miss side effect.
 */

import type { Bundle, Vars } from './types';

const PLACEHOLDER = /\{(\w+)\}/g;

export const translate = (bundle: Bundle, key: string, vars?: Vars): string => {
  const template = bundle[key];
  if (template === undefined) return key;
  if (vars === undefined) return template;

  return template.replace(PLACEHOLDER, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
};
