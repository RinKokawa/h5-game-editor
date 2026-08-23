/**
 * Generic list utilities — pure, framework-free.
 *
 * Lives in `utils/` so both `layout/panelStackMath.ts` and
 * `state/layoutStore.ts` can import without crossing the ESLint
 * boundary that bans `state → layout`. (See CLAUDE.md §4.)
 */

/**
 * Reorder `list` by moving the item at `from` to `to`. Returns a
 * shallow copy — the input is not mutated. Out-of-range indices are
 * a no-op (returns a copy).
 */
export const moveItem = <T>(list: readonly T[], from: number, to: number): T[] => {
  const copy = [...list];
  if (from === to || from < 0 || to < 0 || from >= copy.length || to >= copy.length) {
    return copy;
  }
  const [removed] = copy.splice(from, 1);
  if (removed === undefined) return copy;
  copy.splice(to, 0, removed);
  return copy;
};