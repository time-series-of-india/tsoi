// The Rupee Time Machine's month arithmetic, its clamping and its ordering.
//
// Everything the calculator does starts by turning two 'YYYY-MM' strings into
// two positions on one array, so an off-by-one here is not a wrong pixel — it
// is a rupee carried to the wrong month with a straight face.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  annualized, answer, clampMonth, costSeries, longMonth, monthsBetween, multiplier,
  order, ymFrom, ymIndex, isYm,
} from '../../src/lib/rtm.ts';
import { doubling, synthetic } from './fixture.ts';

test('month indexing round-trips across year boundaries', () => {
  for (const ym of ['1969-08', '1988-10', '2000-01', '2013-12', '2026-06']) {
    assert.equal(ymFrom(ymIndex(ym)), ym);
  }
  // December is month 12, not month 0 — the off-by-one that shifts the whole
  // series by a month and still looks plausible.
  assert.equal(ymFrom(ymIndex('2025-12')), '2025-12');
  assert.equal(ymIndex('2000-02') - ymIndex('2000-01'), 1);
  assert.equal(monthsBetween('2000-01', '2026-06'), 317);
  assert.equal(monthsBetween('2026-06', '2000-01'), -317);
});

test('a year is exactly twelve steps', () => {
  for (const ym of ['1969-08', '2020-04', '2026-06']) {
    assert.equal(ymIndex(ym) - ymIndex(ymFrom(ymIndex(ym) - 12)), 12);
  }
});

test('longMonth writes a month out, in English, without a Date', () => {
  assert.equal(longMonth('2000-01'), 'January 2000');
  assert.equal(longMonth('1969-08'), 'August 1969');
  assert.equal(longMonth('2026-12'), 'December 2026');
});

test('isYm accepts only a real month', () => {
  for (const good of ['1969-08', '2026-06', '2000-12']) assert.ok(isYm(good));
  for (const bad of ['2026-13', '2026-00', '26-06', '2026-6', '2026', 'June 2026', '', null, 7]) {
    assert.ok(!isYm(bad as unknown), `${String(bad)} should not parse as a month`);
  }
});

test('clampMonth pulls a stranded month back into the series', () => {
  const d = synthetic();
  assert.equal(clampMonth('1900-01', d), d.start);
  assert.equal(clampMonth('2099-12', d), d.asOf);
  assert.equal(clampMonth('2005-06', d), '2005-06');
  assert.equal(clampMonth(d.start, d), d.start);
  assert.equal(clampMonth(d.asOf, d), d.asOf);
});

test('order puts the older month first, whichever way the reader picked', () => {
  assert.deepEqual(order('2000-01', '2010-01'), { from: '2000-01', to: '2010-01' });
  assert.deepEqual(order('2010-01', '2000-01'), { from: '2000-01', to: '2010-01' });
  // Equal months come back untouched rather than swapped into a new object
  // with the arguments reversed.
  assert.deepEqual(order('2005-05', '2005-05'), { from: '2005-05', to: '2005-05' });
});

test('multiplier is the ratio of two levels, in the direction it is asked for', () => {
  const idx = [100, 110, 121];
  assert.equal(multiplier(idx, 0, 2), 1.21);
  assert.equal(multiplier(idx, 2, 0), 1 / 1.21);
  assert.equal(multiplier(idx, 1, 1), 1);
});

test('twelve months apart, the annualized rate IS the year-on-year change', () => {
  // The identity that makes the "average of x% a year" line honest: over
  // exactly one year there is no averaging left to do.
  for (const mult of [1.06, 1.347, 0.889, 1]) {
    assert.ok(Math.abs(annualized(mult, 12) - (mult - 1) * 100) < 1e-9,
      `annualized(${mult}, 12) = ${annualized(mult, 12)}`);
  }
});

test('annualized compounds, and a zero span is a zero rate', () => {
  // 1.06^2 over 24 months has to come back as 6% a year, not 12.36%.
  assert.ok(Math.abs(annualized(1.06 ** 2, 24) - 6) < 1e-9);
  assert.ok(Math.abs(annualized(1.06 ** 10, 120) - 6) < 1e-9);
  // Six months at a doubling is a much larger annual rate, not a smaller one.
  assert.ok(annualized(2, 6) > 100);
  assert.equal(annualized(1.5, 0), 0);
});

test('the cost line runs from the chosen month THROUGH the other one, not to the end', () => {
  const d = synthetic();
  const { months, values } = costSeries(d, 1000, '2005-01', '2008-07');
  assert.equal(months[0], '2005-01');
  assert.equal(months.at(-1), '2008-07');
  // The trap this pins: a series that runs to asOf instead of to `to`, which
  // looks right on the default view because `to` IS asOf there.
  assert.notEqual(months.at(-1), d.asOf);
  assert.equal(months.length, values.length);
  assert.equal(values.length, d.months.indexOf('2008-07') - d.months.indexOf('2005-01') + 1);
  // It starts at the amount itself and only ever rises on a rising price line.
  assert.ok(Math.abs(values[0] - 1000) < 1e-9);
  for (let i = 1; i < values.length; i++) assert.ok(values[i] > values[i - 1]);
});

test('the cost line ends on exactly the answer\'s result', () => {
  // The whole point of R2.3: the saffron figure in the sentence and the saffron
  // number at the end of the line are one number, not two roundings of one.
  for (const p of [
    { amount: 100, from: '2000-01', to: '2005-12' },
    { amount: 5000, from: '2001-07', to: '2003-02' },
    { amount: 1, from: '2000-01', to: '2000-02' },
    { amount: 1234567, from: '2002-11', to: '2004-04' },
  ]) {
    const d = doubling();
    const a = answer(d, p);
    const { values } = costSeries(d, p.amount, p.from, p.to);
    assert.equal(values.at(-1), a.result, `${JSON.stringify(p)}`);
    assert.equal(values[0], p.amount);
  }
});

test('the cost line orders a backwards pair rather than returning nothing', () => {
  const d = doubling();
  const forward = costSeries(d, 100, '2001-01', '2003-01');
  const backward = costSeries(d, 100, '2003-01', '2001-01');
  assert.deepEqual(backward.months, forward.months);
  assert.deepEqual(backward.values, forward.values);
});

test('the cost line clamps months the series does not reach', () => {
  const d = synthetic();
  assert.equal(costSeries(d, 100, '1800-01', '2099-01').months.length, d.months.length);
  // The degenerate pair is one labelled point, not an empty chart.
  const same = costSeries(d, 100, '2005-06', '2005-06');
  assert.deepEqual(same.months, ['2005-06']);
  assert.deepEqual(same.values, [100]);
});
