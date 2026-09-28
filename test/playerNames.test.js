import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeNames, DEFAULT_NAMES } from '../playerNames.js';

test('normalizeNames falls back to defaults for null/undefined', () => {
  assert.deepEqual(normalizeNames(null), { ...DEFAULT_NAMES });
  assert.deepEqual(normalizeNames(undefined), { ...DEFAULT_NAMES });
});

test('normalizeNames falls back to defaults for empty or whitespace-only names', () => {
  assert.deepEqual(normalizeNames({ p1: '', p2: '   ' }), { ...DEFAULT_NAMES });
});

test('normalizeNames trims surrounding whitespace', () => {
  assert.deepEqual(normalizeNames({ p1: '  Alice ', p2: ' Bob' }), { p1: 'Alice', p2: 'Bob' });
});

test('normalizeNames keeps valid custom names', () => {
  assert.deepEqual(normalizeNames({ p1: 'Alice', p2: 'Bob' }), { p1: 'Alice', p2: 'Bob' });
});

test('normalizeNames falls back per-field when only one is invalid', () => {
  assert.deepEqual(normalizeNames({ p1: 'Alice', p2: '' }), { p1: 'Alice', p2: DEFAULT_NAMES.p2 });
  assert.deepEqual(normalizeNames({ p1: 123, p2: 'Bob' }), { p1: DEFAULT_NAMES.p1, p2: 'Bob' });
});
