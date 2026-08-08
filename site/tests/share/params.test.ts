// The shared board link. What is under test is the wire format itself: a link
// a reader sends today has to open the same board when it is opened, so the
// rules that decide what appears in it — non-defaults only, sets for
// multiselects, a separator that a value can never impersonate — are pinned
// here rather than left to the board to demonstrate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { adopt, isDefault, parse, serialize, splitHash, type ShareState } from '../../src/lib/dashboards/share.ts';

/** A two-desk board in the shape client.ts hands over. */
const board = (over: Partial<ShareState> = {}): ShareState => ({
  hoisted: {
    controls: [{ id: 'range', default: '24' }],
    ctrl: { range: '24' },
  },
  desks: [
    {
      anchor: 'long-run',
      controls: [
        { id: 'metric', type: 'toggle', default: 'yoy' },
        { id: 'range', default: '24' },
      ],
      ctrl: { metric: 'yoy', range: '24' },
    },
    {
      anchor: 'states',
      controls: [
        { id: 'state', type: 'select', default: 'KERALA' },
        { id: 'items', type: 'multiselect', default: ['a', 'b'] },
      ],
      ctrl: { state: 'KERALA', items: ['a', 'b'] },
    },
  ],
  ...over,
});

test('a board at rest serializes to nothing at all', () => {
  assert.equal(serialize(board()), '');
  assert.deepEqual(parse(''), { hoisted: {}, desks: {} });
  assert.deepEqual(parse('?'), { hoisted: {}, desks: {} });
});

test('only the values that are not the default appear', () => {
  const s = board();
  s.desks[1].ctrl.state = 'NAGALAND';
  assert.equal(serialize(s), '?states.state=NAGALAND');
  // The desks that did not move contribute nothing, however many they are.
  assert.equal(parse(serialize(s)).desks.states.state[0], 'NAGALAND');
});

test('a hoisted control serializes bare, and only once', () => {
  const s = board();
  s.hoisted!.ctrl.range = '0';
  // The long-run desk carries a 'range' of its own; it is the SAME control,
  // hoisted, so the desk-scoped copy must not be written beside the bare one.
  s.desks[0].ctrl.range = '0';
  assert.equal(serialize(s), '?range=0');
  assert.deepEqual(parse(serialize(s)), { hoisted: { range: ['0'] }, desks: {} });
});

test('a desk-scoped control is written under its own anchor', () => {
  const s = board();
  s.desks[0].ctrl.metric = 'mom';
  s.desks[1].ctrl.state = 'NAGALAND';
  assert.equal(serialize(s), '?long-run.metric=mom&states.state=NAGALAND');
});

test('range tokens go on the wire verbatim, custom windows included', () => {
  const s = board();
  s.hoisted!.ctrl.range = '2019-01~2024-06';
  assert.equal(serialize(s), '?range=2019-01~2024-06');
  assert.equal(parse(serialize(s)).hoisted.range[0], '2019-01~2024-06');
});

test('a multiselect is a comma-joined list of encoded values', () => {
  const s = board();
  s.desks[1].ctrl.items = ['a', 'c'];
  assert.equal(serialize(s), '?states.items=a,c');
  assert.deepEqual(parse(serialize(s)).desks.states.items, ['a', 'c']);
});

test('a comma inside a value cannot be mistaken for the separator', () => {
  const s = board();
  // The item names this scheme has to survive: "Milk, liquid" and its kin.
  s.desks[1].ctrl.items = ['Milk, liquid', 'Rice'];
  assert.equal(serialize(s), '?states.items=Milk%2C%20liquid,Rice');
  assert.deepEqual(parse(serialize(s)).desks.states.items, ['Milk, liquid', 'Rice']);
});

test('a single value carrying a comma survives the same way', () => {
  const s = board();
  s.desks[1].ctrl.state = 'DADRA, NAGAR HAVELI';
  assert.deepEqual(parse(serialize(s)).desks.states.state, ['DADRA, NAGAR HAVELI']);
});

test('a multiselect default compares as a set, not as a list', () => {
  const s = board();
  // Same two values, other way round: nothing has changed.
  s.desks[1].ctrl.items = ['b', 'a'];
  assert.equal(serialize(s), '');
  assert.ok(isDefault(['b', 'a'], ['a', 'b']));
  assert.ok(!isDefault(['a'], ['a', 'b']));
  assert.ok(!isDefault(['a', 'b', 'c'], ['a', 'b']));
});

test('a value the board worked out rather than offered never serializes', () => {
  const s = board();
  // `derived` writes ids no control declares (see DashboardSpec.derived).
  s.desks[1].ctrl.code_name = 'ITEM.01.1.1';
  assert.equal(serialize(s), '');
});

test('the whole state round-trips through the query string', () => {
  const s = board();
  s.hoisted!.ctrl.range = '60';
  s.desks[0].ctrl.metric = 'mom';
  s.desks[1].ctrl.state = 'NAGALAND';
  s.desks[1].ctrl.items = ['b', 'c'];
  const q = serialize(s);
  const back = parse(q);
  assert.equal(back.hoisted.range[0], '60');
  assert.equal(back.desks['long-run'].metric[0], 'mom');
  assert.equal(back.desks.states.state[0], 'NAGALAND');
  assert.deepEqual(back.desks.states.items, ['b', 'c']);
  // Feeding the parsed values back into the same board reproduces the link.
  const rebuilt = board();
  rebuilt.hoisted!.ctrl.range = back.hoisted.range[0];
  rebuilt.desks[0].ctrl.metric = back.desks['long-run'].metric[0];
  rebuilt.desks[1].ctrl.state = back.desks.states.state[0];
  rebuilt.desks[1].ctrl.items = back.desks.states.items;
  assert.equal(serialize(rebuilt), q);
});

test('a parameter nothing on the board answers to is carried, never fatal', () => {
  const p = parse('?utm_source=whatsapp&states.state=NAGALAND&ghost.metric=x&novalue');
  assert.equal(p.desks.states.state[0], 'NAGALAND');
  // A desk that no longer exists, and a bare parameter that is not a control:
  // both land in their own bucket, where the board simply never looks for them.
  assert.deepEqual(p.desks.ghost, { metric: ['x'] });
  assert.deepEqual(p.hoisted.utm_source, ['whatsapp']);
  assert.deepEqual(p.hoisted.novalue, ['']);
});

test('a repeated parameter takes the first value, not the last', () => {
  assert.deepEqual(parse('?range=12&range=60').hoisted.range, ['12']);
  assert.deepEqual(parse('?a.b=1&a.b=2').desks.a.b, ['1']);
});

test('a percent sequence that decodes to nothing is left as written', () => {
  // Hand-mangled links reach the board; they must not throw on the way in.
  assert.deepEqual(parse('?states.state=%E0%A4').desks.states.state, ['%E0%A4']);
});

test('the first dot splits a key, however many follow', () => {
  const p = parse('?items.item.code=x');
  assert.deepEqual(p.desks.items, { 'item.code': ['x'] });
});

test('adopt gives a multiselect the list and everything else the first value', () => {
  assert.deepEqual(adopt({ id: 'items', type: 'multiselect', default: [] }, ['a', 'b']), ['a', 'b']);
  assert.equal(adopt({ id: 'state', type: 'select', default: '' }, ['a', 'b']), 'a');
  assert.equal(adopt({ id: 'state', type: 'select', default: '' }, undefined), undefined);
  assert.equal(adopt({ id: 'state', type: 'select', default: '' }, []), undefined);
});

test('a fragment names a desk, or a panel on it', () => {
  assert.deepEqual(splitHash('#states'), { anchor: 'states', panel: null });
  assert.deepEqual(splitHash('states'), { anchor: 'states', panel: null });
  assert.deepEqual(splitHash('#states.map'), { anchor: 'states', panel: 'map' });
  // Only the first dot is the separator; the rest belongs to the panel id.
  assert.deepEqual(splitHash('#states.map.wide'), { anchor: 'states', panel: 'map.wide' });
  assert.deepEqual(splitHash('#states.'), { anchor: 'states', panel: null });
  assert.deepEqual(splitHash(''), { anchor: '', panel: null });
  assert.deepEqual(splitHash('#'), { anchor: '', panel: null });
});
