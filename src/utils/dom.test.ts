/**
 * isEditableTarget — central DOM helper.
 *
 * Step 24 lifts the helper out of four shortcut files. The contract
 * is: an INPUT of a text-like type, a TEXTAREA, a SELECT, or any
 * contentEditable element returns true. Everything else (including
 * non-text INPUTs and the canvas itself) returns false so shortcut
 * handlers don't swallow letters the user is typing.
 */

import { describe, expect, it } from 'vitest';

import { isEditableTarget } from './dom';

const fireTarget = (el: EventTarget | null): boolean => isEditableTarget(el);

describe('isEditableTarget', () => {
  it('returns true for a plain INPUT element (no type attr)', () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    try {
      expect(fireTarget(input)).toBe(true);
    } finally {
      input.remove();
    }
  });

  it('returns true for a text-like INPUT[type]', () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'text');
    document.body.appendChild(input);
    try {
      expect(fireTarget(input)).toBe(true);
    } finally {
      input.remove();
    }
  });

  it('returns false for INPUT[type=button]', () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'button');
    document.body.appendChild(input);
    try {
      expect(fireTarget(input)).toBe(false);
    } finally {
      input.remove();
    }
  });

  it('returns true for TEXTAREA', () => {
    const ta = document.createElement('textarea');
    document.body.appendChild(ta);
    try {
      expect(fireTarget(ta)).toBe(true);
    } finally {
      ta.remove();
    }
  });

  it('returns true for SELECT', () => {
    const sel = document.createElement('select');
    document.body.appendChild(sel);
    try {
      expect(fireTarget(sel)).toBe(true);
    } finally {
      sel.remove();
    }
  });

  it('returns true for any contentEditable element', () => {
    const div = document.createElement('div');
    div.contentEditable = 'true';
    document.body.appendChild(div);
    try {
      expect(fireTarget(div)).toBe(true);
    } finally {
      div.remove();
    }
  });

  it('returns false for a DIV (no contentEditable)', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    try {
      expect(fireTarget(div)).toBe(false);
    } finally {
      div.remove();
    }
  });

  it('returns false for null / non-HTMLEventTarget', () => {
    expect(fireTarget(null)).toBe(false);
    expect(fireTarget({} as EventTarget)).toBe(false);
  });
});