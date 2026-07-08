import { describe, expect, it } from 'vitest';

import { translate } from './translate';

import type { Bundle } from './types';

const BUNDLE: Bundle = {
  greeting: 'Hello, {name}!',
  plain: 'Static string',
  multi: '{a} + {b} = {a}',
  'unused.var': '{onlyThis} matters',
};

describe('translate', () => {
  it('returns the template unchanged when no vars are passed', () => {
    expect(translate(BUNDLE, 'plain')).toBe('Static string');
  });

  it('substitutes a single variable', () => {
    expect(translate(BUNDLE, 'greeting', { name: 'Ada' })).toBe('Hello, Ada!');
  });

  it('substitutes numbers', () => {
    expect(translate(BUNDLE, 'greeting', { name: 42 })).toBe('Hello, 42!');
  });

  it('keeps the literal {name} when the var is missing', () => {
    expect(translate(BUNDLE, 'greeting')).toBe('Hello, {name}!');
  });

  it('ignores extra vars not referenced in the template', () => {
    expect(translate(BUNDLE, 'plain', { extra: 'ignored' })).toBe('Static string');
  });

  it('handles repeated placeholders', () => {
    expect(translate(BUNDLE, 'multi', { a: 1, b: 2 })).toBe('1 + 2 = 1');
  });

  it('keeps the literal placeholder when only some vars are missing', () => {
    expect(translate(BUNDLE, 'multi', { a: 1 })).toBe('1 + {b} = 1');
  });

  it('returns the key itself when the key is missing', () => {
    expect(translate(BUNDLE, 'does.not.exist')).toBe('does.not.exist');
  });

  it('returns the key itself when the key is missing even with vars', () => {
    expect(translate(BUNDLE, 'does.not.exist', { name: 'X' })).toBe('does.not.exist');
  });
});
