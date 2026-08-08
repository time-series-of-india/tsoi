// resolveRange turns a range TOKEN into a concrete {from, to} month window
// against the months a dataset actually has. Every dashboard's time picker and
// every time-windowed panel goes through it, and a wrong window is the kind of
// break that looks like plausible data rather than an error — so it is the
// first thing under test.
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveRange } from '../../src/lib/dashboards/runtime.ts';

// 2024-01 … 2025-06, deliberately unsorted and with a duplicate: callers pass
// `rows.map(monthOf)`, which is neither sorted nor unique.
const months = (() => {
  const out: string[] = [];
  for (let y = 2024; y <= 2025; y++)
    for (let m = 1; m <= 12; m++) {
      if (y === 2025 && m > 6) break;
      out.push(`${y}-${String(m).padStart(2, '0')}`);
    }
  return [...out.slice(6), ...out, '2024-03'];
})();

test('empty domain resolves to no window', () => {
  assert.equal(resolveRange('12', []), null);
});

test('"0" and "" mean all time — a null window, not the full span', () => {
  // Callers treat null as "apply no filter"; returning {min, max} instead would
  // read the same on this dataset but would clamp a panel whose own rows run
  // wider than the months it was handed.
  assert.equal(resolveRange('0', months), null);
  assert.equal(resolveRange('', months), null);
});

test('a month count counts back from the latest month, inclusive', () => {
  assert.deepEqual(resolveRange('6', months), { from: '2025-01', to: '2025-06' });
  assert.deepEqual(resolveRange('1', months), { from: '2025-06', to: '2025-06' });
});

test('a count longer than the domain clamps to its start', () => {
  assert.deepEqual(resolveRange('240', months), { from: '2024-01', to: '2025-06' });
});

test('ytd starts at January of the latest month’s year', () => {
  assert.deepEqual(resolveRange('ytd', months), { from: '2025-01', to: '2025-06' });
});

test('fy starts at the April of the Indian fiscal year the latest month sits in', () => {
  // Latest 2025-06 is month >= 4, so the FY opened this April.
  assert.deepEqual(resolveRange('fy', months), { from: '2025-04', to: '2025-06' });
  // Latest 2025-02 is month < 4, so the FY opened the PREVIOUS April.
  assert.deepEqual(resolveRange('fy', months.filter((m) => m <= '2025-02')),
    { from: '2024-04', to: '2025-02' });
});

test('an absolute window is passed through as given', () => {
  assert.deepEqual(resolveRange('2024-05~2024-09', months), { from: '2024-05', to: '2024-09' });
});

test('either side of an absolute window may be blank to open-end it', () => {
  assert.deepEqual(resolveRange('~2024-09', months), { from: '2024-01', to: '2024-09' });
  assert.deepEqual(resolveRange('2024-05~', months), { from: '2024-05', to: '2025-06' });
});

test('the domain need not arrive sorted or deduplicated', () => {
  const shuffled = ['2025-06', '2024-01', '2024-01', '2024-07'];
  assert.deepEqual(resolveRange('2', shuffled), { from: '2024-07', to: '2025-06' });
});
