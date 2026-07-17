/**
 * DOM helpers used across the shortcut and input subsystems.
 *
 * `isEditableTarget` returns true when `target` is an HTML element
 * that should consume keystrokes (text inputs, textareas, content-
 * editable elements, selects). Used by every shortcut handler to
 * avoid swallowing letters the user is typing into a field.
 *
 * Step 24 lifts this from four copy-pasted definitions in the
 * shortcut files (History/Selection/Tool/DocumentIO) into a single
 * canonical home. Step 25's central shortcut registry imports it
 * here.
 */

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (EDITABLE_TAGS.has(target.tagName)) {
    // INPUT[type=button|submit|...] is still not "editable" in the
    // sense the shortcuts care about. Only treat text-like INPUTs
    // as editable.
    if (target.tagName === 'INPUT') {
      const type = target.getAttribute('type');
      return type === null || EDITABLE_INPUT_TYPES.has(type);
    }
    return true;
  }
  if (target.isContentEditable) return true;
  return false;
};

const EDITABLE_INPUT_TYPES = new Set([
  'text',
  'search',
  'email',
  'url',
  'tel',
  'password',
  'number',
]);