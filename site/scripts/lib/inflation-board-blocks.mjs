// Pure blocks of the inflation board's dataset — the arithmetic and the
// sentences, with no database and no console in sight.
//
// The generator (build-inflation-board-data.mjs) is mostly SQL and gates, and
// what SQL cannot be tested for, a test here can: the release-calendar
// sentence, the band's one claim, the rebasing of two index paths onto a
// shared 100, and the checks that decide whether an event marker is defensible
// from the spine it is drawn on. Everything in this file takes plain values and
// returns plain values, so tests/scripts/inflation-board-blocks.test.ts can run
// it with no TimescaleDB anywhere.
import { longMonth, MONTH_NAMES, ymFrom, ymIndex } from './inflation-spine.mjs';

/**
 * When the month after `asOfMonth` is expected, and the sentence that says so.
 *
 * MoSPI publishes a month's CPI around the twelfth of the month after it, at
 * 4 pm. "Around" is load-bearing: the date moves for holidays, and the release
 * calendar is not in this database, so the sentence states a habit rather than
 * a commitment. Everything in it is derived, so it cannot go stale in copy.
 *
 * @param {string} asOfMonth  'YYYY-MM', the latest month the dataset carries
 */
export function nextPrint(asOfMonth) {
  const month = ymFrom(ymIndex(asOfMonth) + 1);     // the month not yet printed
  const dueMonth = ymFrom(ymIndex(asOfMonth) + 2);  // when its print lands
  return {
    month,
    due: `${dueMonth}-12`,
    note: `The ${longMonth(month)} print is expected around 12 ${MONTH_NAMES[+dueMonth.slice(5) - 1]}, 4 pm. `
      + 'MoSPI moves the date around holidays, so it is a habit rather than a commitment.',
  };
}

/**
 * The one sentence the target band is allowed to make: what the target is, how
 * wide the tolerance runs, and since when. Nothing about whether it has been
 * met — the line on the chart says that for itself.
 */
export const bandNote = ({ lo, hi, mid, from }) =>
  `The shaded band is India's inflation target: ${mid}% year-on-year, `
  + `with a tolerance range of ${lo} to ${hi}%, in force since ${longMonth(from)}.`;

/**
 * The mean of the spine's monthly prints inside each decade it touches.
 *
 * Derived arithmetic on published rates, and disclosed as such in the panel's
 * own copy ("the average of the monthly prints"). Nothing is weighted and
 * nothing is annualised: a decade with four months in it (the first, which
 * starts wherever the series does) is the average of those four, and the label
 * on the bar is the decade rather than a claim about a full ten years.
 *
 * Rounded to one decimal, which is the precision the bars are read at; the gate
 * that recomputes this from the same points compares at the same rounding, so
 * it catches a row-selection bug rather than float noise.
 *
 * @param {{date: string, infl: number}[]} points  the spine, ascending
 * @returns {{decade: string, infl_pct: number}[]}
 */
export function decadeMeans(points) {
  const buckets = new Map();
  for (const p of points) {
    // `Number(null)` is 0 and finite, so absence has to be caught before the
    // cast or an unpublished month joins the average as a reading of nil.
    if (p?.infl == null || p.infl === '') continue;
    const v = Number(p.infl);
    if (!Number.isFinite(v)) continue;
    // The decade a month belongs to is its YEAR's decade: December 1979 is the
    // 1970s and January 1980 is the 1980s, with nothing straddling.
    const key = `${String(p.date).slice(0, 3)}0s`;
    const b = buckets.get(key) ?? buckets.set(key, { sum: 0, n: 0 }).get(key);
    b.sum += v;
    b.n += 1;
  }
  return [...buckets.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([decade, b]) => ({ decade, infl_pct: +(b.sum / b.n).toFixed(1) }));
}

/**
 * How the inflation-targeting era has actually gone, counted off the spine.
 *
 * Three facts and no interpretation: how many months since the target took
 * effect, how many of them landed inside the tolerance range, and when the rate
 * was last outside it. The band's own numbers come in rather than being written
 * again here, so the two can never disagree about where the edges are.
 *
 * A rate exactly on an edge counts as INSIDE. The band is a tolerance range and
 * its endpoints are part of it; treating 6.00 as a breach would make the count
 * depend on the second decimal of a published rounding.
 *
 * @param {{date: string, infl: number}[]} points  the spine, ascending
 * @param {{lo: number, hi: number, from: string}} band
 */
export function bandStats(points, band) {
  const inWindow = points.filter((p) => String(p.date) >= band.from
    && p?.infl != null && p.infl !== '' && Number.isFinite(Number(p.infl)));
  if (!inWindow.length) throw new Error(`no spine months at or after ${band.from}`);
  const inside = inWindow.filter((p) => Number(p.infl) >= band.lo && Number(p.infl) <= band.hi);
  const outside = inWindow.filter((p) => Number(p.infl) < band.lo || Number(p.infl) > band.hi);
  const last = outside.at(-1);
  return {
    since: band.from,
    total: inWindow.length,
    inside: inside.length,
    outside: outside.length,
    // Months ELAPSED since that breach, counted on the same axis: zero means
    // the latest print is itself outside the band.
    elapsed: last ? ymIndex(String(inWindow.at(-1).date)) - ymIndex(String(last.date)) : null,
    lastBreach: last ? { month: String(last.date), infl_pct: Number(last.infl) } : null,
  };
}

/**
 * The sentence those three numbers support, and nothing beyond them. Not
 * displayed yet — the three tiles say it in figures — but carried in the
 * dataset so a foot that wants it later takes the numbers from the same place
 * the tiles do rather than from a paragraph someone typed.
 */
export const bandStatsNote = (stats, band) =>
  `Of the ${stats.total} months since ${longMonth(stats.since)}, when flexible inflation targeting began, `
  + `${stats.inside} have landed inside the ${band.lo} to ${band.hi}% tolerance range. `
  + (stats.lastBreach
    ? `The rate was last outside it in ${longMonth(stats.lastBreach.month)}, at ${stats.lastBreach.infl_pct}%.`
    : 'The rate has not been outside it.');

/**
 * Two published index paths across one overlap year, each restated so its first
 * month reads 100.
 *
 * This is the ONLY honest way to put the retiring base and the incoming one on
 * one chart: the 2024 base's first year-on-year is January 2026, so a rate
 * comparison across the two over 2025 does not exist and must not be
 * synthesised. Rebasing a published level series to its own first month is
 * arithmetic on published numbers, disclosed rather than hidden — which is why
 * the raws travel alongside the rebased arrays.
 *
 * @param {string[]} months   the overlap months, ascending
 * @param {number[]} raw2012  published 2012-base General index, aligned to months
 * @param {number[]} raw2024  published 2024-base General index, aligned to months
 */
export function rebaseOverlap(months, raw2012, raw2024) {
  if (months.length !== raw2012.length || months.length !== raw2024.length) {
    throw new Error(`overlap arrays disagree: ${months.length} months, ${raw2012.length} 2012, ${raw2024.length} 2024`);
  }
  if (!months.length) throw new Error('overlap has no months');
  const to100 = (arr) => {
    const base = arr[0];
    if (!(base > 0)) throw new Error(`cannot rebase on a first value of ${base}`);
    // Element 0 is set to exactly 100 rather than computed, because base/base
    // is not always exactly 1 in floating point and a chart whose first point
    // reads 99.99999999999999 is a chart inviting a question about its own
    // arithmetic. Every other element is the honest ratio.
    return arr.map((v, i) => (i === 0 ? 100 : (v / base) * 100));
  };
  return { months, raw2012, raw2024, b2012: to100(raw2012), b2024: to100(raw2024) };
}

/**
 * The sentence the overlap panel's foot carries: what was done to the two
 * published series, and why the comparison a reader expects — one rate against
 * the other — is not on the chart.
 */
export const overlapNote = (overlap, firstYoY2024) =>
  `Both lines are published index levels, each divided by its own ${longMonth(overlap.months[0])} `
  + `reading and multiplied by 100, so the two bases share a starting point. They are not inflation rates: `
  + `the 2024 base's first year-on-year is ${longMonth(firstYoY2024)}, so a rate comparison across the two bases `
  + 'over this year does not exist.';

/**
 * Whether an event marker is defensible from the spine it is drawn on.
 *
 * Two rules, and a marker satisfies exactly one of them. Most markers are a
 * local MAXIMUM: the highest month within a window either side, so the label
 * "the peak" is a fact about the line rather than a memory of the news. One
 * is a THRESHOLD crossing — the last month at or above a level — because "the
 * last double-digit month" is a claim about where a line stopped, not where it
 * topped out.
 *
 * @param {{date: string, label: string, rule?: string, at?: number}} ev
 * @param {{date: string, infl: number}[]} points  the spine, ascending
 * @param {number} window  months either side a maximum must lead, default 24
 * @returns {{ok: boolean, why: string}}
 */
export function checkEvent(ev, points, window = 24) {
  const i = points.findIndex((p) => p.date === ev.date);
  if (i < 0) return { ok: false, why: `${ev.date} is not on the spine axis` };
  if (ev.rule === 'lastAtOrAbove') {
    const level = ev.at;
    const last = [...points].reverse().find((p) => p.infl >= level);
    return last && last.date === ev.date
      ? { ok: true, why: `last month at or above ${level}% (${points[i].infl})` }
      : { ok: false, why: `${ev.date} is not the last month at or above ${level}%; ${last?.date ?? 'none'} is` };
  }
  const lo = Math.max(0, i - window);
  const hi = Math.min(points.length - 1, i + window);
  let at = lo;
  for (let k = lo; k <= hi; k++) if (points[k].infl > points[at].infl) at = k;
  return at === i
    ? { ok: true, why: `maximum of ±${window} months (${points[i].infl})` }
    : { ok: false, why: `${ev.date} (${points[i].infl}) is not the ±${window}-month maximum; ${points[at].date} (${points[at].infl}) is` };
}

/**
 * The n biggest risers and n biggest fallers of a keyed set of readings.
 *
 * Readings with no value are LEFT OUT rather than read as zero: an item MoSPI
 * did not publish a rate for this month has not held still, it has not been
 * measured. Returns them in one list, risers first, ready for a diverging bar.
 */
export function extremesBothWays(records, n, valueOf = (r) => r.value) {
  // `Number(null)` is 0 and `Number('')` is 0, so absence has to be caught
  // before the cast or every unpublished item joins the middle of the pack as
  // a reading of nil.
  const live = records.filter((r) => {
    const v = valueOf(r);
    return v != null && v !== '' && Number.isFinite(Number(v));
  });
  const sorted = live.slice().sort((a, b) => Number(valueOf(b)) - Number(valueOf(a)));
  if (sorted.length <= 2 * n) return sorted;
  return [...sorted.slice(0, n), ...sorted.slice(-n)];
}
