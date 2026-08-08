// Two pieces of control-and-resolver machinery the board leans on hardest, and
// neither shows up in a screenshot as anything but plausible: which options a
// picker files under which heading, which of them the data can currently
// answer, and the two-ended slice that turns a 358-row ranking into a chart.
import test from 'node:test';
import assert from 'node:assert/strict';
import { liveOptionValues, optionGroups, resolve } from '../../src/lib/dashboards/runtime.ts';
import type { Control, Row } from '../../src/lib/dashboards/runtime.ts';

// ── option groups ────────────────────────────────────────────────────────
const picker: Control = {
  id: 'code_name', type: 'select', label: 'Series', field: 'code_name', default: 'CPI (General)',
  groupBy: 'level', groupLabels: { series: 'CPI series', item: 'Items' },
  options: [
    { value: 'CPI (General)', label: 'CPI (General)', group: 'series' },
    { value: 'Tomato', label: 'Tomato', group: 'item' },
    { value: 'Transport', label: 'Transport', group: 'series' },
  ],
};

test('options are filed under the groups the spec names, in that order', () => {
  const g = optionGroups(picker);
  assert.deepEqual(g.map((x) => x.label), ['CPI series', 'Items']);
  assert.deepEqual(g[0].options.map((o) => o.value), ['CPI (General)', 'Transport']);
  assert.deepEqual(g[1].options.map((o) => o.value), ['Tomato']);
});

test('a group the data has and the spec did not name still appears, last', () => {
  const c: Control = { ...picker, options: [...picker.options!, { value: 'X', label: 'X', group: 'later' }] };
  assert.deepEqual(optionGroups(c).map((x) => x.label), ['CPI series', 'Items', 'later']);
});

test('an empty group is not rendered as a heading with nothing under it', () => {
  const c: Control = { ...picker, options: picker.options!.filter((o) => o.group === 'series') };
  assert.deepEqual(optionGroups(c).map((x) => x.label), ['CPI series']);
});

test('a control with no grouping gets one unlabelled group', () => {
  const c: Control = { id: 'a', type: 'select', label: 'A', default: 'x',
    options: [{ value: 'x', label: 'X' }] };
  assert.deepEqual(optionGroups(c), [{ options: [{ value: 'x', label: 'X' }] }]);
});

// ── live options ─────────────────────────────────────────────────────────
const rows: Row[] = [
  { kind: 'map', code_name: 'CPI (General)', sector: 'Combined', infl_pct: 4, idx_pts: 107 },
  { kind: 'map', code_name: 'CPI (General)', sector: 'Rural', infl_pct: 4.2, idx_pts: 108 },
  { kind: 'map', code_name: 'CPI (General)', sector: 'Urban', infl_pct: 3.8, idx_pts: 106 },
  { kind: 'map', code_name: 'Tomato', sector: 'Combined', infl_pct: 72 },
];
const sector: Control = {
  id: 'sector', type: 'toggle', label: 'Sector', field: 'sector', default: 'Combined',
  options: [{ value: 'Combined', label: 'Combined' }, { value: 'Rural', label: 'Rural' }, { value: 'Urban', label: 'Urban' }],
  liveOptions: { where: { kind: 'map' }, filters: ['code_name'] },
};

test('a series published for every sector keeps every sector on offer', () => {
  const live = liveOptionValues(sector, rows, { code_name: 'CPI (General)' })!;
  assert.deepEqual([...live].sort(), ['Combined', 'Rural', 'Urban']);
});

test('a series published combined-only leaves one sector standing', () => {
  const live = liveOptionValues(sector, rows, { code_name: 'Tomato' })!;
  assert.deepEqual([...live], ['Combined']);
});

test('a control never narrows the rows by its own current value', () => {
  // Sector is in its own filter list here; if it filtered on itself, only the
  // sector already chosen would ever come back live and the switch would jam.
  const self: Control = { ...sector, liveOptions: { where: { kind: 'map' }, filters: ['code_name', 'sector'] } };
  const live = liveOptionValues(self, rows, { code_name: 'CPI (General)', sector: 'Rural' })!;
  assert.deepEqual([...live].sort(), ['Combined', 'Rural', 'Urban']);
});

test('a measure toggle asks whether the rows carry the FIELD, not the value', () => {
  const measure: Control = {
    id: 'measure', type: 'toggle', label: 'Measure', default: 'idx_pts',
    options: [{ value: 'idx_pts', label: 'Index' }, { value: 'infl_pct', label: 'Year-on-year' }],
    liveOptions: { where: { kind: 'map' }, filters: ['code_name'], by: 'field' },
  };
  assert.deepEqual([...liveOptionValues(measure, rows, { code_name: 'CPI (General)' })!].sort(),
    ['idx_pts', 'infl_pct']);
  // Tomato ships a rate and no level, so the Index half has nothing to draw.
  assert.deepEqual([...liveOptionValues(measure, rows, { code_name: 'Tomato' })!], ['infl_pct']);
});

test('a control declaring no rule is left alone', () => {
  assert.equal(liveOptionValues({ id: 'x', type: 'toggle', label: 'X', default: 'a',
    options: [{ value: 'a', label: 'A' }] }, rows, {}), undefined);
});

// ── extremes ─────────────────────────────────────────────────────────────
const items: Row[] = [
  { kind: 'item', item_name: 'a', infl_pct: 9 },
  { kind: 'item', item_name: 'b', infl_pct: 7 },
  { kind: 'item', item_name: 'c', infl_pct: 3 },
  { kind: 'item', item_name: 'd', infl_pct: 1 },
  { kind: 'item', item_name: 'e', infl_pct: -4 },
  { kind: 'item', item_name: 'f', infl_pct: -8 },
];

test('extremes keeps both ends and drops the middle', () => {
  const { pairs } = resolve(items, { x: 'item_name', y: 'infl_pct', where: { kind: 'item' }, extremes: 2 }, {});
  assert.deepEqual(pairs.map((p) => p.key), ['a', 'b', 'e', 'f']);
});

test('extremes leaves a short list alone rather than duplicating it', () => {
  const { pairs } = resolve(items, { x: 'item_name', y: 'infl_pct', where: { kind: 'item' }, extremes: 4 }, {});
  assert.equal(pairs.length, 6);
  assert.equal(new Set(pairs.map((p) => p.key)).size, 6);
});

test('a reading nobody published is not one end of the ranking', () => {
  const withHole: Row[] = [...items, { kind: 'item', item_name: 'g' }];
  const { pairs } = resolve(withHole, { x: 'item_name', y: 'infl_pct', where: { kind: 'item' }, extremes: 3 }, {});
  assert.ok(!pairs.some((p) => p.key === 'g'));
});

test('resolve hands back the row behind each key, for the fields the pivot dropped', () => {
  const { sources } = resolve(items, { x: 'item_name', y: 'infl_pct', where: { kind: 'item' }, extremes: 2 }, {});
  assert.equal(sources.get('a')!.infl_pct, 9);
});
