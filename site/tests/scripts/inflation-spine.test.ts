// The long spine's pure pieces: the era arithmetic, the sources line, and the
// month math the splice rests on. The DB-reading half (buildSpine) is verified
// by running the generators — its gates print the numbers they measured — but
// everything below can break without a database and without a screenshot.
//
// The April/May 2020 correction is what most of this file is about. Those two
// months were interpolated until 2026-08-01, on the belief that MoSPI had
// withheld them. MoSPI had not: it published limited-collection indices and
// withheld only the rates. A test that pins the corrected values would need a
// database, so what is pinned here is the property that made the old code
// wrong — the sources line must never again describe those months as
// interpolated or withheld — plus the arithmetic that produced the fix.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ERAS, GATE, LANDMARKS, SPINE_START, SPLICE_IW_TO_CPIC, RECAST_2024,
  buildEras, spineSources, ymIndex, ymFrom, prevYear, prevMonth, longMonth,
} from '../../scripts/lib/inflation-spine.mjs';

// ── month arithmetic ──────────────────────────────────────────────────────

test('month indexing round-trips and crosses year boundaries', () => {
  for (const ym of ['1969-08', '1988-10', '2006-01', '2014-01', '2020-04', '2026-06']) {
    assert.equal(ymFrom(ymIndex(ym)), ym);
  }
  assert.equal(prevMonth('2020-01'), '2019-12');
  assert.equal(prevYear('2020-04'), '2019-04');
  assert.equal(prevYear('2026-01'), '2025-01');
  // December is month 12, not month 0 — the off-by-one that would shift the
  // whole series by a month and still look plausible.
  assert.equal(ymFrom(ymIndex('2025-12')), '2025-12');
  assert.equal(longMonth('2020-04'), 'April 2020');
  assert.equal(longMonth('1974-09'), 'September 1974');
});

test('a year is exactly twelve steps, everywhere in the series', () => {
  for (const ym of ['1969-08', '2020-04', '2026-06']) {
    assert.equal(ymIndex(ym) - ymIndex(prevYear(ym)), 12);
  }
});

// ── the sources line ──────────────────────────────────────────────────────

test('the sources line never calls the 2020 months interpolated or withheld', () => {
  // The regression this file exists for. The months are computed from indices
  // MoSPI published; describing them any other way is a factual error about
  // what the ministry did.
  const line = spineSources({ limitedCollection: ['2020-04', '2020-05'] });
  for (const banned of ['interpolat', 'withheld', 'withhold', 'never collected', 'not observed', 'estimated']) {
    assert.ok(!line.toLowerCase().includes(banned),
      `the sources line says "${banned}": ${line}`);
  }
  assert.match(line, /April 2020 and May 2020/);
  assert.match(line, /computed from MOSPI's published limited-collection indices/);
});

test('the sources line names both instruments, the handover and the linking factors', () => {
  const line = spineSources({ limitedCollection: [] });
  assert.match(line, /Labour Bureau CPI-IW/);
  assert.match(line, /MOSPI CPI Combined/);
  // Pre-2014 is a different population, and omitting that misleads by silence.
  assert.match(line, /industrial-worker households/);
  assert.match(line, new RegExp(longMonth(SPLICE_IW_TO_CPIC)));
  assert.match(line, new RegExp(longMonth(RECAST_2024)));
  assert.match(line, /4\.93 and 4\.63/);
});

test('the sources line follows the data, not a hardcoded pair of months', () => {
  // If MoSPI ever publishes a rate for one of them, or limits collection in
  // some future month, the citation has to move with it.
  assert.match(spineSources({ limitedCollection: ['2020-05'] }), /May 2020 carry rates computed/);
  assert.match(spineSources({ limitedCollection: [] }), /Every month carries a rate as published/);
  // and it must not crash when called with nothing at all
  assert.equal(typeof spineSources(), 'string');
});

// ── the eras ──────────────────────────────────────────────────────────────

/* A synthetic spine covering exactly the six eras' span, so buildEras can be
   tested without a database. Every month reads 5.00 except a single 10.00 in
   the 2020s, which gives E6 all the movement and the other five none. */
const syntheticPoints = (last = '2026-06', spike = '2020-04') => {
  const out = [];
  for (let i = ymIndex(SPINE_START); i <= ymIndex(last); i++) {
    const ym = ymFrom(i);
    out.push({ ym, yoy: ym === spike ? 10 : 5 });
  }
  return out;
};

test('the six eras tile the spine with no gap and no overlap', () => {
  const points = syntheticPoints();
  const eras = buildEras({ points, first: SPINE_START, last: '2026-06' });
  assert.equal(eras.length, 6);
  assert.equal(eras[0].from, SPINE_START);
  assert.equal(eras.at(-1)!.to, '2026-06');
  for (let i = 1; i < eras.length; i++) {
    assert.equal(ymIndex(eras[i].from), ymIndex(eras[i - 1].to) + 1,
      `${eras[i - 1].id} ends ${eras[i - 1].to}, ${eras[i].id} starts ${eras[i].from}`);
  }
  assert.equal(eras.reduce((a, e) => a + e.months, 0), points.length);
});

test('era weights sum to exactly one', () => {
  const eras = buildEras({ points: syntheticPoints(), first: SPINE_START, last: '2026-06' });
  const sum = eras.reduce((a, e) => a + e.weight, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9, `weights sum to ${sum}`);
  // The last era absorbs the rounding, so the six can add to 1.0000 exactly.
  assert.equal(+sum.toFixed(4), 1);
});

test('the weight is travel, not altitude: a flat era weighs nothing', () => {
  // Five eras sit at a constant 5% and one has the only movement in the series.
  // Under a mean-absolute-level weighting all six would weigh the same; under
  // travel, only the era that moved carries any weight. This is the property
  // the weighting was changed to have in Jul 2026, and it is invisible on the
  // real series unless you go looking.
  const eras = buildEras({ points: syntheticPoints(), first: SPINE_START, last: '2026-06' });
  const byId = Object.fromEntries(eras.map((e) => [e.id, e]));
  for (const id of ['E1', 'E2', 'E3', 'E4', 'E5']) {
    assert.equal(byId[id].climbPerMonth, 0, `${id} should be flat`);
    assert.equal(byId[id].weight, 0, `${id} should carry no weight`);
  }
  assert.ok(byId.E6.climbPerMonth > 0);
  assert.equal(byId.E6.weight, 1);
});

test('a change at 2020-04 moves the 2020s era stats and leaves the rest alone', () => {
  // Exactly what the April/May 2020 correction did to the peaks JSON: E6's
  // climbPerMonth and mean move, every era's weight renormalises, and no era's
  // span or month count changes.
  const before = buildEras({ points: syntheticPoints('2026-06', '1995-01'), first: SPINE_START, last: '2026-06' });
  const after = buildEras({ points: syntheticPoints('2026-06', '2020-04'), first: SPINE_START, last: '2026-06' });
  const byId = (es: typeof before) => Object.fromEntries(es.map((e) => [e.id, e]));
  const [b, a] = [byId(before), byId(after)];

  assert.notEqual(b.E6.climbPerMonth, a.E6.climbPerMonth);
  assert.notEqual(b.E6.weight, a.E6.weight);
  for (const id of ['E1', 'E2', 'E3', 'E4', 'E5', 'E6']) {
    assert.equal(b[id].months, a[id].months, `${id} month count moved`);
    assert.equal(b[id].from, a[id].from);
    assert.equal(b[id].to, a[id].to);
  }
});

test('an era covering no months stops the build', () => {
  // A spine that ends before a later era begins would otherwise ship eras with
  // a silent hole in them. Ending in 1999 leaves E4 (the 2000s) with nothing.
  //
  // `fail()` sets process.exitCode as well as throwing, because in a generator
  // the throw may be caught by a caller and the build must still exit non-zero.
  // Here the throw is the expected outcome, so the flag is put back — otherwise
  // a fully passing test run reports failure to CI.
  const before = process.exitCode;
  assert.throws(
    () => buildEras({ points: syntheticPoints('1999-12'), first: SPINE_START, last: '1999-12' }),
    /covers no months/,
  );
  process.exitCode = before;
});

// ── the constants the gates rest on ───────────────────────────────────────

test('the era table is the six decades, in order, with one open end', () => {
  assert.equal(ERAS.length, 6);
  assert.equal(ERAS[0].from, SPINE_START);
  assert.equal(ERAS.at(-1)!.to, null, 'the last era must run to the latest month');
  for (let i = 1; i < ERAS.length; i++) {
    assert.equal(ymIndex(ERAS[i].from), ymIndex(ERAS[i - 1].to!) + 1);
  }
});

test('the exit-seam gate leaves room for the measured steps but not for a doubling', () => {
  // Measured 2026-08-01: −2.263 pt at 1989-10 and −0.188 pt at 2007-01. The
  // limit has to clear the first comfortably and still catch a link that has
  // gone twice as wrong.
  assert.ok(GATE.exitSeam > 2.263, 'the gate would fail on current data');
  assert.ok(GATE.exitSeam < 2 * 2.263, 'the gate would not catch a doubled error');
});

test('the overlap gate baselines sit above the measured values with modest headroom', () => {
  // Measured 2026-08-01 over 95 months: mean +0.605 pp, sd 1.643, max 5.601.
  const measured = { mean: 0.605, sd: 1.643, max: 5.601, months: 95 };
  assert.ok(GATE.overlapMeanAbs > measured.mean);
  assert.ok(GATE.overlapSd > measured.sd);
  assert.ok(GATE.overlapMax > measured.max);
  assert.ok(GATE.overlapMinMonths <= measured.months);
  // Headroom, not a blank cheque: each limit is under twice what it measures.
  assert.ok(GATE.overlapMeanAbs < 2 * measured.mean);
  assert.ok(GATE.overlapSd < 2 * measured.sd);
  assert.ok(GATE.overlapMax < 2 * measured.max);
});

test('the landmarks are inside the spine and the seams are in order', () => {
  for (const l of LANDMARKS) {
    assert.ok(l.ym >= SPINE_START, `${l.ym} is before the spine starts`);
  }
  assert.ok(SPINE_START < SPLICE_IW_TO_CPIC);
  assert.ok(SPLICE_IW_TO_CPIC < RECAST_2024);
});
