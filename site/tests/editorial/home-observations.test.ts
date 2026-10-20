import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildMonsoonSnapshot } from '../../scripts/build-home-monsoon.mjs';
import { homeObservations } from '../../src/lib/home-observations';

const csv = readFileSync(new URL('../../../data/monsoon/seasonal-rainfall.csv', import.meta.url), 'utf8');
const monsoon = buildMonsoonSnapshot(csv);
const monthlyRows = Array.from({ length: 12 }, (_, i) => ({ key: 'UPI', date: new Date(Date.UTC(2025, 9 + i, 1)).toISOString().slice(0, 10), volume_cr: i === 11 ? 2406.84 : 2000 + 25 * i }));
const fixtures: Record<string, any> = {
  'environment/home-monsoon.json': monsoon,
  'economy/inflation-board.json': { headline: { modern: { combined: [{ date: '2026-08-01', infl: 4.83 }, { date: '2026-09-01', infl: 5.54 }] } } },
  'economy/reads.json': { rows: [...monthlyRows, { key: 'IMPS', date: '2026-09-01', volume_cr: 1000 }] },
};
const observationsWithPayments = (rows: unknown[]) => homeObservations(name => name === 'economy/reads.json' ? { rows } : fixtures[name]);

test('national rainfall totals, period and normal trace to the verified IMD table', () => {
  assert.equal(monsoon.actualMm, 759.4);
  assert.equal(monsoon.normalMm, 868.6);
  assert.equal(monsoon.departurePct, -12.6);
  assert.deepEqual(monsoon.period, { start: '2026-06-01', end: '2026-09-30' });
  assert.deepEqual(monsoon.normalPeriod, { start: 1971, end: 2020 });
  assert.equal(monsoon.source.released, '2026-09-30');
  assert.equal(monsoon.source.url, 'https://internal.imd.gov.in/press_release/20260930_pr_5361.pdf');
});

test('source validation rejects incomplete seasons, invalid totals, dates and attribution', () => {
  for (const [before, after] of [
    ['2026-09-30', '2026-08-31'], ['2026-06-01', '2026-06-31'],
    ['759.4', ''], ['759.4', 'NaN'], ['868.6', '0'],
    ['1971,2020', '2021,2020'], ['1971,2020', '1971,2026'],
    ['https://internal.imd.gov.in/', 'https://imd.gov.in.example.com/'],
    ['https://internal.imd.gov.in/', 'http://internal.imd.gov.in/'],
  ]) assert.throws(() => buildMonsoonSnapshot(csv.replaceAll(before, after)), `${before} -> ${after}`);
  assert.throws(() => buildMonsoonSnapshot(csv + csv.split('\n')[1]));
  assert.throws(() => buildMonsoonSnapshot(csv.replace(',2026-09-30,https:', ',2026-09-29,https:')));
});

test('Monsoon stays first/default, followed by Inflation and monthly UPI Payments', () => {
  const requested: string[] = [];
  const items = homeObservations(name => { requested.push(name); return fixtures[name]; });
  assert.deepEqual(items.map(item => item.short), ['Monsoon', 'Inflation', 'Payments']);
  assert.deepEqual(requested.sort(), Object.keys(fixtures).sort());
  assert.equal(items[0].metric, '12.6%');
  assert.equal(items[0].period, 'June–September 2026');
  assert.equal(items[0].graphic, 'rainfall-gap');
  assert.equal(items[1].metric, '5.54%');
  assert.equal(items[1].href, '/economy/explore/inflation#headline');
  assert.equal(items[2].title, 'Monthly UPI payments');
  assert.equal(items[2].count, 24_068_400_000);
  assert.equal(items[2].graphic, 'columns');
  assert.equal(items[2].period, 'September 2026');
  assert.equal(items[2].href, '/economy/explore/payments#product');
});

test('the single normal-rainfall track uses the unrounded received/shortfall split', () => {
  const rain = homeObservations(name => fixtures[name])[0].rainfall!;
  assert.ok(Math.abs(rain.receivedPct - 759.4 / 868.6 * 100) < 1e-12);
  assert.equal(rain.receivedPct + rain.shortfallPct, 100);
  assert.equal(rain.shortfallPct.toFixed(1), '12.6');
  assert.equal(rain.normalPeriod, '1971–2020');
});

test('UPI columns show twelve consecutive monthly totals, starting at zero', () => {
  const payment = homeObservations(name => fixtures[name])[2];
  assert.equal(payment.columns?.length, 12);
  assert.equal(payment.columns?.[0].date, 'October 2025');
  assert.equal(payment.columns?.at(-1)?.date, 'September 2026');
  assert.equal(payment.columns?.at(-1)?.count, payment.count);
  assert.equal(payment.columnMax, 25_000_000_000);
  for (const column of payment.columns!) {
    assert.ok(column.height >= 0 && column.height <= 80);
    assert.equal(column.y + column.height, 90);
    assert.ok(Math.abs(column.height / 80 - column.count / payment.columnMax!) < 1e-12);
  }
});

test('monthly source order does not affect UPI chart order', () => {
  assert.deepEqual(observationsWithPayments([...monthlyRows].reverse())[2].columns, observationsWithPayments(monthlyRows)[2].columns);
});

test('current incomplete month and future months never enter the UPI series', () => {
  const now = new Date();
  const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const future = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1)).toISOString().slice(0, 10);
  const items = observationsWithPayments([...monthlyRows, { key: 'UPI', date: current, volume_cr: 9999 }, { key: 'UPI', date: future, volume_cr: 9999 }]);
  assert.equal(items[2].count, 24_068_400_000);
  assert.equal(items[2].period, 'September 2026');
});

test('missing, duplicate and invalid monthly UPI data omit only Payments', () => {
  for (const rows of [
    monthlyRows.slice(1),
    [...monthlyRows, monthlyRows.at(-1)!],
    monthlyRows.map((row, i) => i === 11 ? { ...row, volume_cr: NaN } : row),
    monthlyRows.map((row, i) => i === 11 ? { ...row, volume_cr: -1 } : row),
  ]) assert.deepEqual(observationsWithPayments(rows).map(item => item.short), ['Monsoon', 'Inflation']);
});

test('a reported zero is a valid monthly count and renders a zero-height column', () => {
  const items = observationsWithPayments(monthlyRows.map((row, i) => i === 0 ? { ...row, volume_cr: 0 } : row));
  assert.equal(items[2].columns?.[0].height, 0);
  assert.equal(items[2].columns?.[0].y, 90);
});

test('missing snapshots omit only their own observation', () => {
  for (const missing of Object.keys(fixtures)) {
    const items = homeObservations(name => {
      if (name === missing) throw new Error('Snapshot missing');
      return fixtures[name];
    });
    assert.equal(items.length, 2, missing);
    if (missing === 'environment/home-monsoon.json') assert.deepEqual(items.map(item => item.short), ['Inflation', 'Payments']);
    else assert.equal(items[0].short, 'Monsoon');
  }
  assert.deepEqual(homeObservations(() => { throw new Error('Missing'); }), []);
});

test('bad or superseded state rainfall snapshots preserve the economic observations', () => {
  for (const data of [{ states: [] }, { ...monsoon, normalMm: 0 }, { ...monsoon, actualMm: 1000 }]) {
    assert.deepEqual(homeObservations(name => name === 'environment/home-monsoon.json' ? data : fixtures[name]).map(item => item.short), ['Inflation', 'Payments']);
  }
});

test('a single inflation point has finite chart coordinates', () => {
  const items = homeObservations(name => name === 'economy/inflation-board.json' ? { headline: { modern: { combined: [{ date: '2026-09-01', infl: 5.54 }] } } } : fixtures[name]);
  assert.ok(items.find(item => item.short === 'Inflation')?.series?.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)));
});
