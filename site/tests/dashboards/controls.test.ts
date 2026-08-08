// Control-layer helpers the board leans on but a screenshot cannot check: the
// type-ahead's filtering (a reader who types "atta" must be offered "Wheat
// atta", and a reader who types "milk" must be offered the milk before the
// buttermilk) and the target band's resolution off a dataset row.
import test from 'node:test';
import assert from 'node:assert/strict';
import { filterOptions, resolveBand, SEARCH_THRESHOLD } from '../../src/lib/dashboards/runtime.ts';
import type { Row } from '../../src/lib/dashboards/runtime.ts';

const opts = [
  { value: '1', label: 'Butter milk' },
  { value: '2', label: 'Milk: liquid' },
  { value: '3', label: 'Milk: condensed/ powder' },
  { value: '4', label: 'Wheat atta' },
  { value: '5', label: 'Tomato' },
];

test('an empty query changes nothing', () => {
  assert.deepEqual(filterOptions(opts, ''), opts);
  assert.deepEqual(filterOptions(opts, '   '), opts);
});

test('filtering is a substring match, not a prefix one', () => {
  assert.deepEqual(filterOptions(opts, 'atta').map((o) => o.label), ['Wheat atta']);
});

test('labels that START with the query come first', () => {
  assert.deepEqual(filterOptions(opts, 'milk').map((o) => o.value), ['2', '3', '1']);
});

test('matching ignores case', () => {
  assert.deepEqual(filterOptions(opts, 'TOMATO').map((o) => o.value), ['5']);
});

test('a query nothing matches leaves nothing', () => {
  assert.deepEqual(filterOptions(opts, 'zzz'), []);
});

test('the value is searchable too, for a control holding a code', () => {
  assert.deepEqual(filterOptions(opts, '4').map((o) => o.label), ['Wheat atta']);
});

test('the upgrade threshold is a real list, not two options', () => {
  assert.ok(SEARCH_THRESHOLD >= 10);
});

// ── the target band ──────────────────────────────────────────────────────
const rows: Row[] = [
  { kind: 'modern', date: '2026-01', infl_pct: 4 },
  { kind: 'band', lo: 2, hi: 6, mid: 4, from: '2016-08' },
];

test('a declared band is read off its own row', () => {
  assert.deepEqual(resolveBand(rows, { y: 'infl_pct', referenceBand: { kind: 'band' } }),
    { lo: 2, hi: 6, mid: 4, from: '2016-08' });
});

test('a panel that declares no band gets none', () => {
  assert.equal(resolveBand(rows, { y: 'infl_pct' }), undefined);
});

test('a dataset with no band row draws none rather than failing', () => {
  assert.equal(resolveBand([rows[0]], { y: 'infl_pct', referenceBand: { kind: 'band' } }), undefined);
});

test('a band with no middle rule and no start month is still a band', () => {
  const bare: Row[] = [{ kind: 'band', lo: 1, hi: 3 }];
  assert.deepEqual(resolveBand(bare, { y: 'x', referenceBand: { kind: 'band' } }), { lo: 1, hi: 3 });
});
