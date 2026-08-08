// The inflation board's pure blocks: the sentences the desks print and the
// arithmetic behind the figures they cannot get from a chart kind. Every one
// of these is a place where a silent break reads as plausible data — a release
// date a month out, a rebased line that does not start at 100, an event marker
// labelled "the peak" that is not one — so they are tested rather than left to
// the screenshot loop.
import test from 'node:test';
import assert from 'node:assert/strict';
import { bandNote, bandStats, bandStatsNote, checkEvent, decadeMeans, extremesBothWays, nextPrint, overlapNote, rebaseOverlap }
  from '../../scripts/lib/inflation-board-blocks.mjs';

// ── the release-calendar sentence ────────────────────────────────────────
test('nextPrint names the month after asOf and the twelfth of the one after that', () => {
  const p = nextPrint('2026-06');
  assert.equal(p.month, '2026-07');
  assert.equal(p.due, '2026-08-12');
  assert.match(p.note, /^The July 2026 print is expected around 12 August, 4 pm\./);
});

test('nextPrint rolls the year over at December', () => {
  const p = nextPrint('2026-11');
  assert.equal(p.month, '2026-12');
  assert.equal(p.due, '2027-01-12');
  assert.match(p.note, /The December 2026 print is expected around 12 January/);
});

test('nextPrint never states a firm date', () => {
  assert.match(nextPrint('2026-06').note, /expected around/);
  assert.match(nextPrint('2026-06').note, /habit rather than a commitment/);
});

// ── the band's one claim ─────────────────────────────────────────────────
test('bandNote states the target, the tolerance and the date, and nothing else', () => {
  const s = bandNote({ lo: 2, hi: 6, mid: 4, from: '2016-08' });
  assert.equal(s, "The shaded band is India's inflation target: 4% year-on-year, "
    + 'with a tolerance range of 2 to 6%, in force since August 2016.');
});

test('bandNote takes its numbers from the band it is given', () => {
  assert.match(bandNote({ lo: 1, hi: 3, mid: 2, from: '2020-01' }), /2% year-on-year/);
  assert.match(bandNote({ lo: 1, hi: 3, mid: 2, from: '2020-01' }), /1 to 3%/);
});

// ── the overlap year, two rulers ─────────────────────────────────────────
const months = ['2025-01', '2025-02', '2025-03'];

test('rebaseOverlap starts both lines at exactly 100', () => {
  const o = rebaseOverlap(months, [180, 189, 198], [101, 102.01, 103.03]);
  assert.equal(o.b2012[0], 100);
  assert.equal(o.b2024[0], 100);
});

test('rebaseOverlap reproduces from the raws it kept', () => {
  const raw2012 = [180, 189, 198], raw2024 = [101, 102.01, 103.03];
  const o = rebaseOverlap(months, raw2012, raw2024);
  assert.deepEqual(o.raw2012, raw2012);
  assert.deepEqual(o.raw2024, raw2024);
  for (let i = 1; i < months.length; i++) {
    assert.ok(Math.abs(o.b2012[i] - (raw2012[i] / raw2012[0]) * 100) < 1e-9);
    assert.ok(Math.abs(o.b2024[i] - (raw2024[i] / raw2024[0]) * 100) < 1e-9);
  }
});

test('rebaseOverlap keeps the two paths apart where the raws diverge', () => {
  const o = rebaseOverlap(months, [180, 189, 198], [101, 101, 101]);
  assert.ok(o.b2012[1] > o.b2024[1]);
});

test('rebaseOverlap refuses mismatched arrays and an unusable base', () => {
  assert.throws(() => rebaseOverlap(months, [1, 2], [1, 2, 3]), /disagree/);
  assert.throws(() => rebaseOverlap(months, [0, 1, 2], [1, 2, 3]), /cannot rebase/);
  assert.throws(() => rebaseOverlap([], [], []), /no months/);
});

test('overlapNote says the lines are levels and that the rate comparison does not exist', () => {
  const o = rebaseOverlap(months, [180, 189, 198], [101, 102, 103]);
  const s = overlapNote(o, '2026-01');
  assert.match(s, /published index levels/);
  assert.match(s, /January 2025/);
  assert.match(s, /not inflation rates/);
  assert.match(s, /January 2026/);
  assert.match(s, /does not exist/);
});

// ── event markers, defensible or not ─────────────────────────────────────
const spine = [
  { date: '2020-01', infl: 4 },
  { date: '2020-02', infl: 11 },
  { date: '2020-03', infl: 9 },
  { date: '2020-04', infl: 12 },
  { date: '2020-05', infl: 5 },
  { date: '2020-06', infl: 3 },
];

test('checkEvent passes a month that leads its window', () => {
  const r = checkEvent({ date: '2020-04', label: 'the peak' }, spine, 2);
  assert.equal(r.ok, true);
  assert.match(r.why, /maximum/);
});

test('checkEvent fails a month a neighbour beats', () => {
  const r = checkEvent({ date: '2020-03', label: 'the peak' }, spine, 2);
  assert.equal(r.ok, false);
  assert.match(r.why, /2020-04/);
});

test('checkEvent fails a month that is not on the axis at all', () => {
  assert.equal(checkEvent({ date: '1999-01', label: 'x' }, spine).ok, false);
});

test('checkEvent takes the threshold rule for a last-crossing marker', () => {
  assert.equal(checkEvent({ date: '2020-04', label: 'x', rule: 'lastAtOrAbove', at: 10 }, spine).ok, true);
  assert.equal(checkEvent({ date: '2020-02', label: 'x', rule: 'lastAtOrAbove', at: 10 }, spine).ok, false);
});

test('a window maximum can still fail the threshold rule, and the reverse', () => {
  // 2020-02 leads its own ±1 window but is not the LAST month in double digits.
  assert.equal(checkEvent({ date: '2020-02', label: 'x' }, spine, 1).ok, true);
  assert.equal(checkEvent({ date: '2020-02', label: 'x', rule: 'lastAtOrAbove', at: 10 }, spine).ok, false);
});

// ── the month's movers ───────────────────────────────────────────────────
const recs = [
  { name: 'a', value: 9 }, { name: 'b', value: -4 }, { name: 'c', value: 3 },
  { name: 'd', value: -8 }, { name: 'e', value: 1 }, { name: 'f', value: null },
];

test('extremesBothWays takes n from each end, risers first', () => {
  const out = extremesBothWays(recs, 2);
  assert.deepEqual(out.map((r: { name: string }) => r.name), ['a', 'c', 'b', 'd']);
});

test('extremesBothWays leaves an unpublished reading out rather than reading it as zero', () => {
  assert.ok(!extremesBothWays(recs, 3).some((r: { name: string }) => r.name === 'f'));
  assert.equal(extremesBothWays(recs, 3).length, 5);
});

test('extremesBothWays returns everything when there is not enough to trim', () => {
  const out = extremesBothWays(recs, 5);
  assert.equal(out.length, 5);
  assert.deepEqual(out.map((r: { name: string }) => r.name), ['a', 'c', 'e', 'b', 'd']);
});

// ── the decade averages ──────────────────────────────────────────────────
// Handmade fixtures rather than the real spine: what is being tested is which
// months land in which bucket, and a fixture is the only way to put a known
// answer on both sides of a boundary.
const decadeFixture = [
  { date: '1969-11', infl: 1 }, { date: '1969-12', infl: 3 },   // 1960s → 2
  { date: '1970-01', infl: 10 }, { date: '1979-12', infl: 20 }, // 1970s → 15
  { date: '1980-01', infl: 5 },                                  // 1980s → 5
];

test('a decade is the mean of the months whose YEAR falls in it', () => {
  assert.deepEqual(decadeMeans(decadeFixture), [
    { decade: '1960s', infl_pct: 2 },
    { decade: '1970s', infl_pct: 15 },
    { decade: '1980s', infl_pct: 5 },
  ]);
});

test('December and the January after it fall on opposite sides of the boundary', () => {
  const out = decadeMeans([{ date: '1979-12', infl: 20 }, { date: '1980-01', infl: 4 }]);
  assert.deepEqual(out, [{ decade: '1970s', infl_pct: 20 }, { decade: '1980s', infl_pct: 4 }]);
});

test('a decade the line only partly covers is still the mean of what it has', () => {
  // The first bar covers 1969 alone, which is the panel copy's own claim.
  assert.deepEqual(decadeMeans(decadeFixture)[0], { decade: '1960s', infl_pct: 2 });
});

test('decades come out in chronological order whatever order the points arrive in', () => {
  const shuffled = [decadeFixture[4], decadeFixture[0], decadeFixture[2]];
  assert.deepEqual(decadeMeans(shuffled).map((d) => d.decade), ['1960s', '1970s', '1980s']);
});

test('a month with no reading is left out rather than averaged in as zero', () => {
  const out = decadeMeans([{ date: '1970-01', infl: 10 }, { date: '1970-02', infl: null as never }]);
  assert.deepEqual(out, [{ decade: '1970s', infl_pct: 10 }]);
});

// ── the targeting-era band stats ─────────────────────────────────────────
const band = { lo: 2, hi: 6, mid: 4, from: '2016-08' };

test('the band window counts only the months at or after it began', () => {
  const s = bandStats([
    { date: '2016-07', infl: 20 },   // before the target: not counted at all
    { date: '2016-08', infl: 4 },
    { date: '2016-09', infl: 7 },
  ], band);
  assert.equal(s.total, 2);
  assert.equal(s.inside, 1);
  assert.equal(s.outside, 1);
  assert.equal(s.since, '2016-08');
});

test('a rate exactly on either edge counts as inside', () => {
  const s = bandStats([
    { date: '2016-08', infl: 2 }, { date: '2016-09', infl: 6 }, { date: '2016-10', infl: 6.01 },
  ], band);
  assert.equal(s.inside, 2);
  assert.equal(s.outside, 1);
  assert.equal(s.lastBreach?.month, '2016-10');
});

test('inside and outside always add up to the total', () => {
  const pts = Array.from({ length: 30 }, (_, i) => ({
    date: `20${17 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`,
    infl: i % 5,
  }));
  const s = bandStats(pts, band);
  assert.equal(s.inside + s.outside, s.total);
});

test('the last breach is the most recent month outside, not the first', () => {
  const s = bandStats([
    { date: '2016-08', infl: 9 }, { date: '2016-09', infl: 1 }, { date: '2016-10', infl: 4 },
  ], band);
  assert.deepEqual(s.lastBreach, { month: '2016-09', infl_pct: 1 });
  assert.equal(s.elapsed, 1);
});

test('a breach at the latest month is nought months ago', () => {
  const s = bandStats([
    { date: '2016-08', infl: 4 }, { date: '2016-09', infl: 8 },
  ], band);
  assert.equal(s.elapsed, 0);
  assert.equal(s.lastBreach?.month, '2016-09');
});

test('a window that never left the band has no breach and no elapsed count', () => {
  const s = bandStats([{ date: '2016-08', infl: 4 }, { date: '2016-09', infl: 5 }], band);
  assert.equal(s.lastBreach, null);
  assert.equal(s.elapsed, null);
  assert.match(bandStatsNote(s, band), /has not been outside it/);
});

test('the band-stats sentence quotes the numbers it was given', () => {
  const s = bandStats([
    { date: '2016-08', infl: 4 }, { date: '2016-09', infl: 9 },
  ], band);
  const note = bandStatsNote(s, band);
  assert.match(note, /Of the 2 months since August 2016/);
  assert.match(note, /1 have landed inside the 2 to 6% tolerance range/);
  assert.match(note, /last outside it in September 2016, at 9%/);
});

test('a band window with no months at all fails loudly rather than dividing by nothing', () => {
  assert.throws(() => bandStats([{ date: '2015-01', infl: 4 }], band), /no spine months/);
});
