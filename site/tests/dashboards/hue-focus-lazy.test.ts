// Four pieces of revision-2 machinery that a screenshot can only ever show as
// plausible: which colour a division gets on two different panels, whether the
// item a desk is threaded to is picked out of a ranking, which picker a desk is
// currently reading, and what a desk is left holding when the document it asked
// for arrives late, twice, or not at all.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cascadeRows, derivedValues, divisionLine, divisionLineOf, resolve, splitFilter,
} from '../../src/lib/dashboards/runtime.ts';
import { createLazyRows, lazyUrl } from '../../src/lib/dashboards/lazy.ts';
import { shapeInflationItem } from '../../src/lib/dashboards/shapes.ts';
import type { Control, Row, Tokens } from '../../src/lib/dashboards/runtime.ts';

// Six distinguishable stand-ins for the six chart steps; the real palette is
// read off :root at runtime and is not this file's business.
const t = {
  text: 'ink', subtle: 'grey', line: 'rule', surfaceDim: 'dim', surface: 'paper',
  mono: 'mono', c1: 'p1', c6: 'p6', c3text: 'item-text',
  palette: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'],
} as Tokens;

// The twelve COICOP divisions: 01..11 and 13. There is no 12 — insurance and
// financial services sits outside India's CPI.
const CODES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '13'];
const DEFAULTS = ['01', '04', '07', '13'];

// ── the division hue lock ────────────────────────────────────────────────
test('every division code resolves to a style', () => {
  for (const code of CODES) {
    const s = divisionLine(code, t);
    assert.ok(t.palette.includes(s.color), `${code} took ${s.color}`);
    assert.ok(['solid', 'dashed', 'dotted'].includes(s.type));
  }
});

test('the four divisions a reader opens on are four distinct hues', () => {
  const hues = DEFAULTS.map((c) => divisionLine(c, t).color);
  assert.equal(new Set(hues).size, 4);
});

test('no two divisions share a hue AND a dash', () => {
  const seen = CODES.map((c) => { const s = divisionLine(c, t); return `${s.color}|${s.type}`; });
  assert.equal(new Set(seen).size, CODES.length);
});

test('an unmapped code still gets a stable style rather than none', () => {
  assert.deepEqual(divisionLine('99', t), divisionLine('99', t));
  assert.ok(t.palette.includes(divisionLine('99', t).color));
});

// The stack colours by the division's own name and the lines by its series
// name. Two spellings, one division: without the lock the same division wore
// two colours on one desk.
const divisionRows: Row[] = [
  { kind: 'contrib', code: '01', division: 'Food and beverages' },
  { kind: 'contrib', code: '04', division: 'Housing, water, electricity' },
  { kind: 'contrib', code: '07', division: 'Transport' },
  { kind: 'contrib', code: '13', division: 'Personal care' },
  { kind: 'series', code: '01', code_name: 'Food and beverages' },
  { kind: 'series', code: '04', code_name: 'Housing, water, electricity' },
  { kind: 'series', code: '07', code_name: 'Transport' },
  { kind: 'series', code: '13', code_name: 'Personal care' },
  { kind: 'series', code: 'GEN', code_name: 'CPI (General)' },
];

test('the stack and the lines give one division one colour', () => {
  const lineOf = divisionLineOf(divisionRows, t);
  for (const code of DEFAULTS) {
    const name = String(divisionRows.find((r) => r.kind === 'contrib' && r.code === code)!.division);
    const seriesName = String(divisionRows.find((r) => r.kind === 'series' && r.code === code)!.code_name);
    assert.equal(lineOf(name).color, divisionLine(code, t).color);
    assert.equal(lineOf(seriesName).color, lineOf(name).color);
  }
});

test('the headline is not in the map and never takes a division hue slot', () => {
  const lineOf = divisionLineOf(divisionRows, t);
  const gen = lineOf('CPI (General)');
  // It falls through to the stable hash rather than to a laid-out slot, and the
  // chart draws it as a dashed ink benchmark regardless (referenceSeries).
  assert.notEqual(gen.color, undefined);
  assert.deepEqual(gen, lineOf('CPI (General)'));
});

// ── the chosen-item emphasis ─────────────────────────────────────────────
// Resolved rather than rendered: the question is which bars are in the set, not
// what ECharts does with them.
const moverRows: Row[] = [
  { kind: 'item', month: '2026-06', item_name: 'Ginger', code: 'g', infl_pct: 50 },
  { kind: 'item', month: '2026-06', item_name: 'Tomato', code: 'tom', infl_pct: 32 },
  { kind: 'item', month: '2026-06', item_name: 'Potato', code: 'pot', infl_pct: -20 },
  { kind: 'item', month: '2026-05', item_name: 'Ginger', code: 'g', infl_pct: 5 },
];
const moversEnc = {
  x: 'item_name', y: 'infl_pct', where: { kind: 'item' }, filters: ['month'],
  emphasis: '@item', emphasisKey: 'code',
};
// The same two lines divbars runs: which bars carry the picked item.
const emphasised = (ctrl: Record<string, string>) => {
  const { pairs, sources } = resolve(moverRows, moversEnc, ctrl);
  const key = moversEnc.emphasisKey;
  const want = ctrl.item;
  return pairs.filter((p) => String(sources.get(p.key)?.[key] ?? '') === want).map((p) => p.key);
};

test('the picked item is emphasised when it is among the bars', () => {
  assert.deepEqual(emphasised({ month: '2026-06', item: 'tom' }), ['Tomato']);
});

test('an item that is not among the bars emphasises nothing', () => {
  assert.deepEqual(emphasised({ month: '2026-06', item: 'kerosene' }), []);
});

test('the emphasis follows the month, not just the item', () => {
  assert.deepEqual(emphasised({ month: '2026-05', item: 'g' }), ['Ginger']);
  assert.deepEqual(emphasised({ month: '2026-05', item: 'tom' }), []);
});

test('the match is on the CODE, so two items sharing a name prefix do not collide', () => {
  const rows: Row[] = [
    { kind: 'item', month: '2026-06', item_name: 'Milk', code: 'm1', infl_pct: 4 },
    { kind: 'item', month: '2026-06', item_name: 'Milk: liquid', code: 'm2', infl_pct: 6 },
  ];
  const { pairs, sources } = resolve(rows, moversEnc, { month: '2026-06', item: 'm2' });
  const hit = pairs.filter((p) => String(sources.get(p.key)?.code ?? '') === 'm2');
  assert.deepEqual(hit.map((p) => p.key), ['Milk: liquid']);
});

// ── the focus switch ─────────────────────────────────────────────────────
const derived = [{ id: 'sel', from: 'focus', cases: { Series: 'code_name', Item: 'sitem' } }];
const stateRows: Row[] = [
  { kind: 'map', level: 'series', code_name: 'CPI (General)', state: 'Kerala', month: '2026-06', sector: 'Combined', infl_pct: 4 },
  { kind: 'map', level: 'series', code_name: 'Transport', state: 'Kerala', month: '2026-06', sector: 'Combined', infl_pct: 2 },
  { kind: 'map', level: 'item', code_name: 'Ginger', state: 'Kerala', month: '2026-06', sector: 'Combined', infl_pct: 50 },
];
const mapEnc = { region: 'state', y: 'infl_pct', where: { kind: 'map' }, filters: ['month', 'sector', 'sel>code_name'] };

test("a filter token names the control and the field it is matched on", () => {
  assert.deepEqual(splitFilter('sel>code_name'), { ctl: 'sel', field: 'code_name' });
  assert.deepEqual(splitFilter('sector'), { ctl: 'sector', field: 'sector' });
});

test('the derived control holds whichever picker the switch is on', () => {
  const base = { code_name: 'Transport', sitem: 'Ginger' };
  assert.equal(derivedValues(derived, { ...base, focus: 'Series' }).sel, 'Transport');
  assert.equal(derivedValues(derived, { ...base, focus: 'Item' }).sel, 'Ginger');
});

test('a switch value the spec never named resolves to nothing, not to a stale answer', () => {
  assert.equal(derivedValues(derived, { focus: 'Nonsense', code_name: 'Transport' }).sel, '');
});

test('the map reads the series picker under Series and the item picker under Item', () => {
  const ctrl: Record<string, string> = {
    focus: 'Series', code_name: 'Transport', sitem: 'Ginger', month: '2026-06', sector: 'Combined',
  };
  Object.assign(ctrl, derivedValues(derived, ctrl));
  assert.deepEqual(resolve(stateRows, mapEnc, ctrl).pairs, [{ key: 'Kerala', value: 2 }]);

  ctrl.focus = 'Item';
  Object.assign(ctrl, derivedValues(derived, ctrl));
  assert.deepEqual(resolve(stateRows, mapEnc, ctrl).pairs, [{ key: 'Kerala', value: 50 }]);
});

// ── the item picker's cascade ────────────────────────────────────────────
const treeRows: Row[] = [
  { kind: 'tree', level: 'item', node: 'Tomato', division: 'Food and beverages' },
  { kind: 'tree', level: 'item', node: 'Ginger', division: 'Food and beverages' },
  { kind: 'tree', level: 'item', node: 'Petrol', division: 'Transport' },
  { kind: 'tree', level: 'group', node: 'Vegetables', division: 'Food and beverages' },
];
const sitem: Control = {
  id: 'sitem', type: 'select', label: 'Item', field: 'node', default: 'Tomato',
  where: { kind: 'tree', level: 'item' },
  groupBy: 'division', dependsOn: ['code_name>division'], cascadeOrAll: true,
};
const offered = (ctrl: Record<string, string>) =>
  cascadeRows(sitem, treeRows, ctrl).map((r) => String(r.node));

test('the item list narrows to the division the series picker is on', () => {
  assert.deepEqual(offered({ code_name: 'Transport' }), ['Petrol']);
});

test('under the headline, which is not a division, the list is every item', () => {
  assert.deepEqual(offered({ code_name: 'CPI (General)' }), ['Tomato', 'Ginger', 'Petrol']);
});

test('without cascadeOrAll a parent that is no parent empties the list', () => {
  const strict: Control = { ...sitem, cascadeOrAll: false };
  assert.deepEqual(cascadeRows(strict, treeRows, { code_name: 'CPI (General)' }), []);
});

test('the constant scope still holds: only item nodes are offered', () => {
  assert.ok(!offered({ code_name: 'Food and beverages' }).includes('Vegetables'));
});

// ── rows that arrive when they are asked for ─────────────────────────────
const lazySpec = {
  control: 'sitem', where: { kind: 'item' }, match: 'item_name', file: 'file',
  base: '/data/economy/inflation-items/', shape: 'inflationItem',
};
const baseRows: Row[] = [
  { kind: 'item', item_name: 'Tomato', code: 'tom', file: 'tom.aaaaaaaa.json' },
  { kind: 'item', item_name: 'Ginger', code: 'gin', file: 'gin.bbbbbbbb.json' },
  { kind: 'tree', item_name: 'Tomato', file: 'wrong.json' },
];

test('the shard URL comes off the dataset, hash and all, never from a pattern', () => {
  assert.equal(lazyUrl(lazySpec, baseRows, 'Tomato'), '/data/economy/inflation-items/tom.aaaaaaaa.json');
  assert.equal(lazyUrl(lazySpec, baseRows, 'Ginger'), '/data/economy/inflation-items/gin.bbbbbbbb.json');
});

test('a value the dataset knows no document for resolves to no URL', () => {
  assert.equal(lazyUrl(lazySpec, baseRows, 'Kerosene'), null);
  assert.equal(lazyUrl(lazySpec, baseRows, ''), null);
});

// A shard, small enough to read: one item, two regions, two sectors, three
// months, with a hole where MoSPI has not published a rate yet.
const shard = {
  code: 'tom', name: 'Tomato', division: 'Food and beverages',
  months: ['2025-12', '2026-01', '2026-02'],
  regions: [
    { region: 'ALL INDIA', state: 'All India', sectors: {
      Combined: { idx: [100, 110, 120], infl: [null, 10, 20] },
      Rural: { idx: [90, 99, null], infl: [null, 10, null] },
    } },
    { region: 'KERALA', state: 'Kerala', sectors: {
      Combined: { idx: [200, 210, 220], infl: [null, 5, 10] },
    } },
  ],
};

test('a shard becomes map rows and series rows the desk already knows how to read', () => {
  const { rows } = shapeInflationItem(shard);
  const maps = rows.filter((r) => r.kind === 'map');
  const series = rows.filter((r) => r.kind === 'series');
  // Map rows need a rate and a region on the map: the national row is neither.
  assert.ok(maps.every((r) => r.region !== 'ALL INDIA' && r.infl_pct != null));
  assert.ok(series.some((r) => r.region === 'ALL INDIA'));
  // Both measures ride along, which is what brings the Index switch alive.
  assert.ok(series.some((r) => r.idx_pts != null && r.infl_pct == null));
  assert.ok(rows.every((r) => r.code_name === 'Tomato' && r.level === 'item'));
  // Sectors survive, so the sector switch has something to switch to.
  assert.deepEqual([...new Set(series.map((r) => r.sector))].sort(), ['Combined', 'Rural']);
});

test('a month with neither measure produces no row at all', () => {
  const { rows } = shapeInflationItem(shard);
  const ruralFeb = rows.filter((r) => r.sector === 'Rural' && r.date === '2026-02');
  assert.equal(ruralFeb.length, 0);
});

const deferred = () => {
  let resolveIt: (v: unknown) => void = () => {};
  const promise = new Promise((r) => { resolveIt = r; });
  return { promise, resolve: resolveIt };
};

test('a fetched document replaces the last one rather than piling on top of it', async () => {
  const seen: Row[][] = [];
  const loader = createLazyRows({
    lazy: lazySpec, baseRows,
    fetchDoc: async (url) => (url.includes('tom') ? shard : { ...shard, code: 'gin', name: 'Ginger' }),
    shape: (doc) => shapeInflationItem(doc).rows,
    onRows: (rows) => seen.push(rows),
  });
  await loader.load('Tomato');
  await loader.load('Ginger');
  assert.equal(seen.length, 2);
  assert.ok(seen[1].every((r) => r.kind !== 'map' || r.code_name === 'Ginger'));
  // The pool is the base rows plus ONE document, never two.
  assert.equal(seen[0].length, seen[1].length);
  assert.equal(loader.loaded, 'Ginger');
});

test('a slow earlier fetch never clobbers a later pick', async () => {
  const slow = deferred();
  const seen: string[] = [];
  const loader = createLazyRows({
    lazy: lazySpec, baseRows,
    fetchDoc: async (url) => (url.includes('tom') ? slow.promise : { ...shard, name: 'Ginger' }),
    shape: (doc) => shapeInflationItem(doc as typeof shard).rows,
    onRows: (rows) => seen.push(String(rows.find((r) => r.kind === 'map')?.code_name ?? '—')),
  });
  const first = loader.load('Tomato');       // in flight
  await loader.load('Ginger');               // overtakes it
  slow.resolve(shard);                       // and only now does the first land
  await first;
  assert.deepEqual(seen, ['Ginger']);
  assert.equal(loader.loaded, 'Ginger');
});

test('a document is fetched once and recalled thereafter', async () => {
  let calls = 0;
  const loader = createLazyRows({
    lazy: lazySpec, baseRows,
    fetchDoc: async () => { calls++; return shard; },
    shape: (doc) => shapeInflationItem(doc as typeof shard).rows,
    onRows: () => {},
  });
  await loader.load('Tomato');
  await loader.load('Ginger');
  await loader.load('Tomato');
  assert.equal(calls, 2);
});

test('a failed fetch leaves the desk alive on its base rows and names the URL', async () => {
  const warned: string[] = [];
  let handed: Row[] = [];
  const loader = createLazyRows({
    lazy: lazySpec, baseRows,
    fetchDoc: async () => { throw new Error('HTTP 404'); },
    shape: (doc) => shapeInflationItem(doc as typeof shard).rows,
    onRows: (rows) => { handed = rows; },
    warn: (m) => warned.push(m),
  });
  await loader.load('Tomato');
  assert.deepEqual(handed, baseRows);
  assert.equal(warned.length, 1);
  assert.match(warned[0], /tom\.aaaaaaaa\.json/);
});

test('a value with no document hands back the base rows without fetching', async () => {
  let calls = 0;
  let handed: Row[] = [];
  const loader = createLazyRows({
    lazy: lazySpec, baseRows,
    fetchDoc: async () => { calls++; return shard; },
    shape: (doc) => shapeInflationItem(doc as typeof shard).rows,
    onRows: (rows) => { handed = rows; },
  });
  await loader.load('Kerosene');
  assert.equal(calls, 0);
  assert.deepEqual(handed, baseRows);
});
