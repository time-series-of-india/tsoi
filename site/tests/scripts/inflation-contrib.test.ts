// The Inflation board's contribution arithmetic — the only number on that board
// TSOI derives rather than quotes. Spec: docs/explore-inflation-board-spec.md
// § Methodology. Implementation: scripts/lib/inflation-contrib.mjs.
//
// Three things are worth a test here, and each has a way of breaking silently:
// the formula itself (a wrong denominator still produces plausible bars), the
// Σ-contrib gate (a decomposition that does not add up to the published
// headline is the definition of a wrong decomposition), and the Σw denominator,
// which is 99.999 and not 100 — the kind of constant somebody "tidies up" and
// nothing visibly breaks.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  divisionContributions, reconstructIndex, yearAgoIndex,
} from '../../scripts/lib/inflation-contrib.mjs';

/* Index arithmetic is division, so the exact answers below are exact only in
   decimal: 110/1.1 is 99.99999999999999 in binary floating point. `close`
   asserts to a tolerance far tighter than any number this board rounds to
   (contributions ship at four decimals) while staying honest about the last
   bit. */
const close = (got: number, want: number, eps = 1e-9, what = '') =>
  assert.ok(Math.abs(got - want) < eps,
    `${what || 'value'} was ${got}, expected ${want} ± ${eps}`);

/* ── Fixtures ─────────────────────────────────────────────────────────────
   `TOY` is arithmetic anyone can check on paper: the General index is 110 on a
   published 10% rate, so a year ago it read exactly 100. Division A doubled the
   distance, B stood still, and half the basket each means A owns the whole ten
   points. Nothing about it is realistic; that is the point.

   `JUNE_2026` is the real thing, All India / Combined / June 2026 as MoSPI
   published it (economy_dev, read 2026-08-01): index levels and year-on-year
   rates for the twelve divisions plus the General row, with the 2024 basket's
   combined weights. If MoSPI revises any of these, this fixture is stale — it
   is a fixed snapshot on purpose, not a live read. */
const TOY = {
  gen: { idx: 110, infl: 10 },
  divisions: [
    { code: 'A', weight: 50, idx: 120, infl: 20 },
    { code: 'B', weight: 50, idx: 100, infl: 0 },
  ],
  weightSum: 100,
};

const JUNE_2026 = {
  gen: { idx: 107.0, infl: 4.38 },
  divisions: [
    { code: '01', weight: 36.753, idx: 106.98, infl: 5.05 },
    { code: '02', weight: 2.989, idx: 107.94, infl: 4.83 },
    { code: '03', weight: 6.383, idx: 107.97, infl: 3.23 },
    { code: '04', weight: 17.665, idx: 103.54, infl: 1.99 },
    { code: '05', weight: 4.469, idx: 104.8, infl: 2.19 },
    { code: '06', weight: 6.1, idx: 104.51, infl: 1.42 },
    { code: '07', weight: 8.796, idx: 105.45, infl: 4.31 },
    { code: '08', weight: 3.609, idx: 104.02, infl: 0.43 },
    { code: '09', weight: 1.516, idx: 104.36, infl: 1.75 },
    { code: '10', weight: 3.333, idx: 107.52, infl: 3.34 },
    { code: '11', weight: 3.348, idx: 111.46, infl: 6.91 },
    { code: '13', weight: 5.038, idx: 124.71, infl: 16.72 },
  ],
  weightSum: 99.999,
};

// ── the formula ───────────────────────────────────────────────────────────

test('the year-ago index is backed out of the published rate, not the other way round', () => {
  // 110 on a published +10% means 100 twelve months earlier, exactly.
  close(yearAgoIndex(110, 10), 100, 1e-9, 'year-ago of 110 at +10%');
  // A published fall backs out to a HIGHER year-ago level.
  close(yearAgoIndex(90, -10), 100, 1e-9, 'year-ago of 90 at −10%');
  // And the round trip returns the published rate untouched, which is the
  // property that lets the board quote MoSPI rather than recompute it.
  const idx = 124.71;
  const infl = 16.72;
  assert.ok(Math.abs((idx / yearAgoIndex(idx, infl) - 1) * 100 - infl) < 1e-12);
});

test('contribution on the toy basket is the whole headline for the one division that moved', () => {
  const { divisions, sum, residual } = divisionContributions(TOY);
  close(divisions[0].contrib, 10, 1e-9, 'division A');
  assert.equal(divisions[1].contrib, 0);
  close(sum, 10, 1e-9, 'Σ contrib');
  close(residual, 0, 1e-9, 'residual');
});

test('a division that fell contributes negatively and the parts still sum to the whole', () => {
  const { divisions, sum } = divisionContributions({
    ...TOY,
    divisions: [
      { code: 'A', weight: 50, idx: 130, infl: 30 }, // 100 → 130
      { code: 'B', weight: 50, idx: 90, infl: -10 }, // 100 → 90
    ],
  });
  close(divisions[0].contrib, 15, 1e-9, 'the division that rose');
  close(divisions[1].contrib, -5, 1e-9, 'the division that fell');
  close(sum, 10, 1e-9, 'Σ contrib');
});

test('contribution on June 2026 reproduces the published decomposition', () => {
  const { divisions } = divisionContributions({ ...JUNE_2026, decimals: 4 });
  const got = Object.fromEntries(divisions.map((d) => [d.code, d.contrib]));
  assert.deepEqual(got, {
    '01': 1.8439, // food, 36.75 of the hundred and 5.05% of its own
    '02': 0.145,
    '03': 0.2104,
    '04': 0.3481,
    '05': 0.0979,
    '06': 0.0871,
    '07': 0.3739,
    '08': 0.0157,
    '09': 0.0265,
    10: 0.113,
    11: 0.2353,
    13: 0.878, // personal care and the jewellery inside it
  });
});

test('published weight and rate pass through the arithmetic untouched', () => {
  // The board's tooltip reads these back. If the function ever "cleaned" a rate
  // (rounded it, recomputed it from the indices) the desk would be quoting a
  // number MoSPI never published.
  const { divisions } = divisionContributions(JUNE_2026);
  for (const [i, d] of divisions.entries()) {
    assert.equal(d.infl, JUNE_2026.divisions[i].infl);
    assert.equal(d.weight, JUNE_2026.divisions[i].weight);
    assert.equal(d.code, JUNE_2026.divisions[i].code);
  }
});

// ── the Σ-contrib gate ────────────────────────────────────────────────────

test('Σ contrib lands on the published headline within the 0.02pp gate', () => {
  const { sum, residual } = divisionContributions(JUNE_2026);
  assert.ok(Math.abs(residual) <= 0.02,
    `residual ${residual} exceeds the 0.02pp gate`);
  // Not zero, and disclosed rather than absorbed: MoSPI rounds its published
  // rates to two decimals, and backing year-ago levels out of rounded rates
  // carries that rounding into the sum.
  assert.notEqual(residual, 0);
  assert.equal(+residual.toFixed(4), -0.0053);
  assert.equal(+sum.toFixed(4), 4.3747);
  assert.equal(+(sum - JUNE_2026.gen.infl).toFixed(4), +residual.toFixed(4));
});

test('the residual is the gap left by the numbers that actually ship', () => {
  // The board ships contributions at four decimals, so the residual has to be
  // computed from the ROUNDED bars: a reader who adds up the twelve numbers on
  // screen must land on gen + residual with nothing left over. Rounding the
  // exact sum instead put June 2026 out by 0.0001 — arithmetically defensible,
  // and wrong about the chart.
  const shipped = divisionContributions({ ...JUNE_2026, decimals: 4 });
  const stack = +shipped.divisions.reduce((a, d) => a + d.contrib, 0).toFixed(4);

  assert.equal(shipped.residual, -0.0052);
  assert.equal(shipped.sum, 4.3748);
  assert.equal(stack, +(JUNE_2026.gen.infl + shipped.residual).toFixed(4));

  // Every shipped contribution is already at four decimals — the generator
  // rounds nothing further on the way out.
  for (const d of shipped.divisions) assert.equal(d.contrib, +d.contrib.toFixed(4));

  // And this is the bug the change fixes: rounding after summing disagrees.
  const exact = divisionContributions(JUNE_2026);
  assert.notEqual(+exact.residual.toFixed(4), shipped.residual);
});

test('the Σ-contrib gate catches a basket that no longer adds up', () => {
  // A plausible break: one division's weight goes stale by a couple of points
  // after a revision and nobody reloads the weight table. Every bar still
  // renders; only the sum gives it away.
  const broken = {
    ...JUNE_2026,
    divisions: JUNE_2026.divisions.map((d) => (d.code === '01' ? { ...d, weight: 34.5 } : d)),
  };
  const { residual } = divisionContributions(broken);
  assert.ok(Math.abs(residual) > 0.02,
    `a 2.25-point weight error should trip the gate, residual was ${residual}`);
  assert.equal(+residual.toFixed(3), -0.118);
});

// ── the Σw denominator ────────────────────────────────────────────────────

test('the 2024 combined basket sums to 99.999, not 100', () => {
  const sum = JUNE_2026.divisions.reduce((a, d) => a + d.weight, 0);
  assert.equal(+sum.toFixed(3), 99.999);
  assert.notEqual(+sum.toFixed(3), 100);
  assert.equal(+sum.toFixed(3), JUNE_2026.weightSum);
});

test('the denominator is Σw, and swapping in a hardcoded 100 moves every contribution', () => {
  const real = divisionContributions(JUNE_2026);
  const hardcoded = divisionContributions({ ...JUNE_2026, weightSum: 100 });
  // Every contribution scales by exactly Σw/100 — small, systematic, and in one
  // direction, which is precisely why it would never look like a bug on screen.
  for (const [i, d] of real.divisions.entries()) {
    const ratio = d.contrib / hardcoded.divisions[i].contrib;
    assert.ok(Math.abs(ratio - 100 / 99.999) < 1e-12,
      `division ${d.code} scaled by ${ratio}, expected ${100 / 99.999}`);
  }
  assert.notEqual(+real.sum.toFixed(5), +hardcoded.sum.toFixed(5));
  assert.equal(+real.sum.toFixed(6), 4.374727);
  assert.equal(+hardcoded.sum.toFixed(6), 4.374683);
});

test('a missing or nonsense Σw fails loudly rather than dividing by zero', () => {
  assert.throws(() => divisionContributions({ ...JUNE_2026, weightSum: 0 }), /weightSum/);
  // `as never`: the types already forbid this, and the assertion is that the
  // JavaScript refuses it too — the generators are .mjs and get no type check.
  assert.throws(() => divisionContributions({ ...JUNE_2026, weightSum: undefined } as never), /weightSum/);
  assert.throws(() => reconstructIndex({ divisions: JUNE_2026.divisions, weightSum: 0 }), /weightSum/);
});

test('a division missing an index, a rate or a weight stops the build', () => {
  const holed = {
    ...JUNE_2026,
    divisions: JUNE_2026.divisions.map((d) => (d.code === '07' ? { ...d, weight: null } : d)),
  };
  assert.throws(() => divisionContributions(holed as never), /division 07/);
  assert.throws(
    () => divisionContributions({ ...JUNE_2026, gen: { idx: 107, infl: null } } as never),
    /published General/,
  );
});

// ── reconstruction, the gate that never ships a number ────────────────────

test('reconstruction returns the published index within the 0.05-point gate', () => {
  const recon = reconstructIndex(JUNE_2026);
  assert.ok(Math.abs(recon - JUNE_2026.gen.idx) <= 0.05,
    `reconstruction ${recon} vs published ${JUNE_2026.gen.idx}`);
  assert.equal(+recon.toFixed(4), 106.9962);
  // The published index is what ships; this one is only ever a check.
  assert.notEqual(recon, JUNE_2026.gen.idx);
});

test('reconstruction uses Σw as its denominator too', () => {
  const real = reconstructIndex(JUNE_2026);
  const hardcoded = reconstructIndex({ ...JUNE_2026, weightSum: 100 });
  assert.ok(Math.abs(real / hardcoded - 100 / 99.999) < 1e-12);
});
