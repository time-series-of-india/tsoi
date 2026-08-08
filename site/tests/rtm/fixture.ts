// Synthetic price lines for the Rupee Time Machine's tests.
//
// The real dataset is generated from the database and is not committed, so
// nothing under tests/rtm reads it. What these fixtures buy instead is
// arithmetic a reader can check by hand: a line that doubles every twelve
// months makes "prices multiplied 2× in a year, an average of 100.0% a year"
// a fact about the fixture rather than a number the code agreed with itself
// about.
import { longMonth, ymFrom, ymIndex, type RtmData, type RtmYear } from '../../src/lib/rtm.ts';

/** The year block the generator ships, rebuilt from a fixture's own months so
 *  the year pages are tested against the same rule the dataset is gated on:
 *  full years only, except a trailing part-year that says how far it runs. */
export function yearBlock(months: string[], idx: number[], asOf: string): RtmYear[] {
  const byYear = new Map<number, number[]>();
  months.forEach((ym, i) => {
    const y = +ym.slice(0, 4);
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push(idx[i]);
  });
  const asOfYear = +asOf.slice(0, 4);
  const round6 = (v: number) => Number(v.toPrecision(6));
  const out: RtmYear[] = [];
  for (const [y, vals] of [...byYear].sort((a, b) => a[0] - b[0])) {
    if (vals.length < 12 && y !== asOfYear) continue; // a short first year is dropped
    const avg = round6(vals.reduce((s, v) => s + v, 0) / vals.length);
    const e: RtmYear = { y, avg, infl: null };
    if (vals.length < 12) e.partial = `to ${longMonth(asOf).split(' ')[0]}`;
    const prev = out[out.length - 1];
    if (prev && !e.partial && !prev.partial && prev.y === y - 1) {
      e.infl = Number(((avg / prev.avg - 1) * 100).toFixed(2));
    }
    out.push(e);
  }
  return out;
}

/** Every month from `start` to `asOf`, inclusive. */
export function span(start: string, asOf: string): string[] {
  const out: string[] = [];
  for (let i = ymIndex(start); i <= ymIndex(asOf); i++) out.push(ymFrom(i));
  return out;
}

/** Wrap a month axis and a level series in the dataset shape the module reads.
 *  Levels are renormalized so the last month is 100, the way the generator
 *  ships them. */
export function build(start: string, asOf: string, level: (i: number) => number): RtmData {
  const months = span(start, asOf);
  const raw = months.map((_, i) => level(i));
  const last = raw[raw.length - 1];
  const idx = raw.map((v) => 100 * v / last);
  return {
    asOf,
    asOfLabel: longMonth(asOf),
    start,
    months,
    idx,
    years: yearBlock(months, idx, asOf),
    segments: [{ series: 'synthetic', from: start, to: asOf, basis: 'a test fixture' }],
    seams: [],
    sources: { spine: 'A synthetic line, for tests.' },
    generated: '2026-08-02T00:00:00.000Z',
  };
}

/** Eleven years of steady half-a-percent months, 2000-01 → 2010-12. */
export const synthetic = (): RtmData => build('2000-01', '2010-12', (i) => 1.005 ** i);

/** A line that doubles every twelve months, 2000-01 → 2005-12. Every span in
 *  whole years has an exact multiplier and an exact rate. */
export const doubling = (): RtmData => build('2000-01', '2005-12', (i) => 2 ** (i / 12));

/** A line that never moves: the machine's degenerate terrain. */
export const flat = (): RtmData => build('2000-01', '2002-12', () => 100);

/** The year pages' terrain: a staircase that holds one level all through a
 *  calendar year and doubles at every January, 2000-01 → 2006-06. Every year
 *  average is therefore exact and every year-on-year is exactly 100%, so the
 *  table's ₹100 → ₹200 → ₹400 is a fact about the fixture rather than a number
 *  the code agreed with itself about. It stops in June, so the block ends on a
 *  part-year the way the shipped one does. */
export const yearly = (): RtmData => build('2000-01', '2006-06', (i) => 2 ** Math.floor(i / 12));
