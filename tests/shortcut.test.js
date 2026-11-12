import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ALT,
  CONTROL,
  DEFAULT_KEYVAL,
  DEFAULT_MODS,
  MODIFIER_MASK,
  SHIFT,
  SUPER,
  matchesShortcut,
  modifiersFromState,
  modifiersToGdk,
} from '../lib/shortcut.js';

test('default shortcut is Alt+F4', () => {
  assert.equal(DEFAULT_KEYVAL, 65473);
  assert.equal(DEFAULT_MODS, ALT);
});

test('modifiersFromState maps modifiers and ignores locks', () => {
  assert.equal(modifiersFromState(1), SHIFT);
  assert.equal(modifiersFromState(4), CONTROL);
  assert.equal(modifiersFromState(8), ALT);
  assert.equal(modifiersFromState(64), SUPER);
  assert.equal(modifiersFromState(1 << 26), SUPER);
  assert.equal(modifiersFromState(1 | 4 | 8 | 64), MODIFIER_MASK);
  assert.equal(modifiersFromState(2 | 16 | 32 | 128), 0);
});

test('modifiersToGdk maps the stored bits back to GTK values', () => {
  assert.equal(modifiersToGdk(ALT), 8);
  assert.equal(modifiersToGdk(SHIFT | CONTROL | ALT | SUPER),
    1 | 4 | 8 | (1 << 26));
});

test('matchesShortcut requires the exact key and modifiers', () => {
  assert.equal(matchesShortcut(DEFAULT_KEYVAL, 8, DEFAULT_KEYVAL, ALT), true);
  assert.equal(matchesShortcut(DEFAULT_KEYVAL, 8 | 2 | 16,
    DEFAULT_KEYVAL, ALT), true);
  assert.equal(matchesShortcut(DEFAULT_KEYVAL, 8 | 4, DEFAULT_KEYVAL, ALT),
    false);
  assert.equal(matchesShortcut(DEFAULT_KEYVAL, 0, DEFAULT_KEYVAL, ALT), false);
  assert.equal(matchesShortcut(0x71, 8, DEFAULT_KEYVAL, ALT), false);
});
