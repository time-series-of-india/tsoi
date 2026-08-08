// The long spine: one continuous monthly series of India's year-on-year
// inflation, August 1969 to the latest published month, plus the era table and
// the gates that keep the splice honest.
//
// This module was lifted out of `build-inflation-peaks.mjs` when a second
// consumer arrived (`build-inflation-board-data.mjs`, the Inflation explore
// board). Both generators now build the same spine through the same gates, so
// the game and the board can never disagree about what India's inflation did.
// The commentary below is the original's, kept where it explains a decision
// rather than a line of code.
//
// India has no single monthly inflation series that runs the whole distance,
// so this one is built from three official segments:
//
//   CPI-IW      Aug 1969 – Dec 2013   Labour Bureau, year-on-year computed
//                                     here from the published monthly index
//   CPI-C 2012  Jan 2014 – Dec 2025   MOSPI's own published inflation
//   CPI-C 2024  Jan 2026 – present    MOSPI's own published inflation, after
//                                     the base recast to 2024=100
//
// Three rules follow from that, and each one is enforced below rather than
// trusted:
//
//  1. MOSPI's inflation is never recomputed. Where MOSPI publishes a figure,
//     that figure is what ships, including the months where an index-based
//     recomputation would differ slightly.
//  2. CPI-IW's four base scales are joined with the Labour Bureau's own
//     linking factors, and the joins are checked against neighbouring
//     year-on-year rather than assumed.
//  3. Nothing in this series is invented. Every month is either a rate MOSPI
//     published or a rate computed from index levels MOSPI published, and the
//     second kind is listed by name in the output. There are exactly two:
//     April and May 2020, where prices were collected in fewer markets under
//     the lockdown. MOSPI published the indices for both months (flagged `F*`
//     in its own release) and held back only the rates. Computing the rate
//     from those two published indices is what MOSPI itself did a year later —
//     the published April and May 2021 rates use these very indices as their
//     denominators — so the spine agrees with the ministry rather than
//     guessing around it.
//
//     This is the one place rule 1 bends, and it bends in the safe direction:
//     a rate is derived only where no published rate exists, never in place of
//     one. There is no interpolation anywhere in this file. If a month ever
//     appears with neither a published rate nor the two indices needed to
//     compute one, the build fails instead of drawing a line through the gap.
//
// Why the handover is January 2014 and not earlier: MOSPI published CPI-C
// inflation for Jan 2012 – May 2013 on the Back series and from Jan 2014 on
// the Current series, and nothing at all for Jun – Dec 2013. Splicing at the
// first published month would open a seven-month hole in the middle of a
// moving period, and filling it would mean either inventing terrain or
// recomputing what MOSPI chose not to publish. January 2014 is where CPI-C
// actually becomes continuous.

/* ── Constants of the splice ─────────────────────────────────────────────
   The linking factors are the Labour Bureau's own, not derived here. Both
   are printed in the Bureau's Indian Labour Journal, Dec 2020, p.1270-71
   (labourbureau.gov.in/uploads/pdf/ILJ_Dec_2020(EH).pdf): 4.63 for the
   1982→2001 general index and 4.93 for 1960→1982. RBI's Handbook of
   Statistics carries the same 4.63 in its CPI footnote. 4.63 also checks
   out at the seam: Dec 2005 reads 550 on the 1982 base, 550/4.63 = 118.8,
   against Jan 2006 = 119 on the 2001 base. 4.93 moves only the twelve
   year-on-year months Oct 1988 – Sep 1989, and the seam gate below is what
   actually keeps it honest.

   The 2016=100 base is deliberately unused. No 2001→2016 linking factor is
   published, and the spine hands over to CPI-C twenty-five years before that
   base begins, so nothing needs it. */
export const LINK_1960_TO_1982 = 4.93;
export const LINK_1982_TO_2001 = 4.63;

export const SPLICE_IW_TO_CPIC = '2014-01'; // first month taken from CPI-C
export const RECAST_2024 = '2026-01'; // first month on the 2024=100 base
export const SPINE_START = '1969-08'; // first month with a twelve-months-earlier reading

/* ── Era table ───────────────────────────────────────────────────────────
   Six decades, cut on the decade and named for it.

   The first pass cut the last two at 2016/2017 instead, on the inflation
   targeting regime change — the RBI's framework was adopted in 2016 and the
   MPC seated that October, which is a real structural break in the series.
   It made for two eras a player could not place from the name ("the double
   digits", "inflation targeting") and one of them was 84 months against
   everyone else's 120. Cutting on the decade instead costs a genuine break
   in the data and buys six labels anybody can locate without being told,
   plus five eras of near-identical length. The break is still in the game:
   it is the annotation on November 2013 and the character line for the
   2010s. A game's level list is not the place to teach monetary policy
   history; the notes under it are.

   Weights are NOT set here — each era's weight is how far its inflation rate
   travelled month to month, normalized across the six, computed below from
   whatever the data says today. The character lines are editorial and
   describe what the player is about to drive. */
export const ERAS = [
  {
    id: 'E1',
    label: 'The seventies',
    from: '1969-08',
    to: '1979-12',
    character: 'Oil shock and drought. The tallest wall in the series, and the deepest canyon right behind it.',
  },
  {
    id: 'E2',
    label: 'The eighties',
    from: '1980-01',
    to: '1989-12',
    character: 'The grind. A second oil shock, then years pinned near nine and ten with no relief.',
  },
  {
    id: 'E3',
    label: 'The nineties',
    from: '1990-01',
    to: '1999-12',
    character: 'The highest average inflation in the series. A balance-of-payments crisis at one end, an onion spike at the other.',
  },
  {
    id: 'E4',
    label: 'The 2000s',
    from: '2000-01',
    to: '2009-12',
    character: 'Flatter country than anything before it, ending in a climb into the food-price surge.',
  },
  {
    id: 'E5',
    label: 'The 2010s',
    from: '2010-01',
    to: '2019-12',
    character: 'Double digits after the crisis, then the long taper into inflation targeting and a decade that ends quiet.',
  },
  {
    id: 'E6',
    label: 'The 2020s',
    from: '2020-01',
    to: null, // to the spine's end — the game's frozen cut, or the board's growing last month
    character: 'The pandemic and then the war, over the lowest hills in the series. This is where you learn the controls.',
  },
];

/* ── Validation gates ────────────────────────────────────────────────────
   A build that cannot prove the seams are sound should not ship the series.
   Tolerances are in percentage points of year-on-year. */
export const GATE = {
  baseSeam: 2.5, // a CPI-IW base change must not move year-on-year more than this
  spliceSeam: 1.5, // CPI-IW → CPI-C
  recastSeam: 2.5, // CPI-C 2012=100 → 2024=100, a base recast like the others
  recastMomMean: 0.25, // mean |difference| in month-on-month across the overlap year
  recastMomMax: 0.6,
  landmark: 0.5, // how far a known month may sit from its known value
  /* A ratio link contaminates a twelve-month WINDOW, not one month: the seam
     month is where the mixed-scale year-on-year starts and seam+11 is where it
     ends, so seam+12 is the month the series steps back onto one scale. Both
     ends of that window are gated. Measured 2026-08-01: −2.263 pt at 1989-10,
     −0.188 pt at 2007-01. The limit is the same ~1.5× margin the entry gates
     carry, and it sits well under the 5.95 pt largest step the series shows
     anywhere (Jan 1999), so a real move is never mistaken for a bad link. */
  exitSeam: 3.5,
  /* CPI-IW and CPI-C both publish year-on-year for 95 months (Jan 2012 – Aug
     2020). They measure different populations with different baskets, so they
     are not expected to agree — but they should not drift apart either, and a
     future reload that widens this quietly would mean the splice at Jan 2014
     is joining two series that no longer describe the same country. Measured
     2026-08-01: mean +0.605 pp, sd 1.643, max |gap| 5.601 pp (May 2019). */
  overlapMeanAbs: 1.0,
  overlapSd: 2.5,
  overlapMax: 8.0,
  overlapMinMonths: 90,
};

export const LANDMARKS = [
  { ym: '1974-09', yoy: 34.7, note: 'series maximum' },
  { ym: '1976-05', yoy: -11.3, note: 'series minimum' },
  { ym: '1998-11', yoy: 19.7, note: 'onion spike' },
  { ym: '2010-01', yoy: 16.2, note: 'food-price surge' },
];

/* ── Month arithmetic ─────────────────────────────────────────────────────
   Months are 'YYYY-MM' strings from first to last, and the queries below use
   to_char rather than returning a date. node-pg turns a DATE into a JS Date
   at local midnight, so reading it back with getUTCMonth in any positive
   offset — IST included — lands in the previous month and quietly shifts the
   entire series by one. Formatting in SQL keeps a month a month. */
export const ymIndex = (ym) => +ym.slice(0, 4) * 12 + (+ym.slice(5) - 1);
export const ymFrom = (i) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;
export const prevYear = (ym) => ymFrom(ymIndex(ym) - 12);
export const prevMonth = (ym) => ymFrom(ymIndex(ym) - 1);
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
export const longMonth = (ym) => `${MONTH_NAMES[+ym.slice(5) - 1]} ${ym.slice(0, 4)}`;

export const fail = (msg) => {
  console.error(`\n  FAIL: ${msg}\n`);
  process.exitCode = 1;
  throw new Error(msg);
};

/** Mean and population standard deviation of an array, in one pass of reading. */
const stats = (xs) => {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return { mean, sd: Math.sqrt(xs.reduce((a, x) => a + (x - mean) ** 2, 0) / xs.length) };
};

/**
 * Build the spine and run every seam gate on it.
 *
 * @param {object} deps
 * @param {(sql: string, params?: any[]) => Promise<any[]>} deps.q  row-returning query (see lib/db.mjs)
 * @param {string} deps.schema  the PostgreSQL schema to read
 * @param {string} [deps.end]  cut the spine at this month instead of the last
 *        published one, and fail if the data has not reached it. The game
 *        passes its frozen survey end (see build-inflation-peaks.mjs,
 *        SPINE_END) so the course never moves; the board passes nothing and
 *        keeps growing. Every gate still runs — a cut spine is not excused
 *        from proving its seams.
 * @param {(msg: string) => void} [deps.log]  where the gate report goes; pass
 *        `() => {}` to run the gates silently.
 * @returns {Promise<object>} points, first, last, limitedCollection, seams, meta
 */
export async function buildSpine({ q, schema, end, log = console.log }) {
  // ── 1. CPI-IW, linked across bases ──────────────────────────────────────
  const iwRows = await q(
    `SELECT to_char(date, 'YYYY-MM') AS ym, base_year, index_value
       FROM ${schema}.cpi_iw_index
      WHERE index_value IS NOT NULL ORDER BY date`,
  );
  if (!iwRows.length) fail(`${schema}.cpi_iw_index is empty — run etl/labourbureau first`);

  /* Everything expressed on the 2001=100 scale. Dividing by a linking factor
     converts an older base up to a newer one, so the 1960 base takes both. */
  const LINK = {
    1960: LINK_1960_TO_1982 * LINK_1982_TO_2001,
    1982: LINK_1982_TO_2001,
    2001: 1,
  };
  const iwIndex = new Map();
  /* The linking factor each month was scaled by, kept alongside the value. The
     Labour Bureau publishes CPI-IW as whole numbers, so one index point is the
     smallest thing it can say — and after scaling, that quantum is 1/factor.
     The quantization block below needs both to state how much of a year-on-year
     reading is rounding rather than prices. */
  const iwFactor = new Map();
  for (const r of iwRows) {
    const factor = LINK[r.base_year];
    if (!factor) continue; // 2016=100: no published link, and the spine ends long before it
    if (iwIndex.has(r.ym)) fail(`two CPI-IW observations for ${r.ym} across bases`);
    iwIndex.set(r.ym, +r.index_value / factor);
    iwFactor.set(r.ym, factor);
  }

  const iwYoy = new Map();
  for (const [ym, v] of iwIndex) {
    const back = iwIndex.get(prevYear(ym));
    if (back != null) iwYoy.set(ym, (v / back - 1) * 100);
  }

  /* ── 2. CPI Combined, both bases, as MOSPI published it ──────────────────
     Index levels come along with the rates. They are not a second opinion on
     the rates — where a rate exists it wins — but they are what makes April and
     May 2020 recoverable rather than a hole, and what the overlap and
     month-on-month gates below measure.

     `ORDER BY date, (series = 'Current')` matters: the Back and Current series
     both publish Jan–May 2013, and without a deterministic tiebreak the Map
     below takes whichever row the planner happened to emit last. Current is the
     series MOSPI carried forward, so it sorts last and wins. */
  const cpicRows = await q(
    `SELECT to_char(date, 'YYYY-MM') AS ym, inflation, index_value
       FROM ${schema}.mospi_cpi_index
      WHERE state = 'All India' AND sector = 'Combined'
        AND cpi_group = 'General' AND subgroup = 'General-Overall'
      ORDER BY date, (series = 'Current')`,
  );
  const coicopRows = await q(
    `SELECT to_char(date, 'YYYY-MM') AS ym, inflation, index_value
       FROM ${schema}.mospi_cpi_coicop
      WHERE state = 'All India' AND sector = 'Combined' AND code = 'GEN'
      ORDER BY date`,
  );
  const cpic = new Map();
  const cpicIdx = new Map();
  for (const r of cpicRows) {
    if (r.inflation != null) cpic.set(r.ym, +r.inflation);
    if (r.index_value != null) cpicIdx.set(r.ym, +r.index_value);
  }
  const coicop = new Map();
  const coicopIdx = new Map();
  for (const r of coicopRows) {
    if (r.inflation != null) coicop.set(r.ym, +r.inflation);
    if (r.index_value != null) coicopIdx.set(r.ym, +r.index_value);
  }
  if (!cpic.size || !coicop.size) fail('MOSPI CPI Combined tables are missing published inflation');

  // ── 3. Assemble the spine ───────────────────────────────────────────────
  const spine = new Map();
  const segmentOf = new Map();
  for (const [ym, v] of iwYoy) {
    if (ym >= SPINE_START && ym < SPLICE_IW_TO_CPIC) { spine.set(ym, v); segmentOf.set(ym, 'CPI-IW'); }
  }
  for (const [ym, v] of cpic) {
    if (ym >= SPLICE_IW_TO_CPIC && ym < RECAST_2024) { spine.set(ym, v); segmentOf.set(ym, 'CPI-C 2012=100'); }
  }
  for (const [ym, v] of coicop) {
    if (ym >= RECAST_2024) { spine.set(ym, v); segmentOf.set(ym, 'CPI-C 2024=100'); }
  }

  const first = SPINE_START;
  const published = [...spine.keys()].sort().pop();
  /* A caller-requested cut that the data has not reached is the one case
     worth stopping for: it would build a shorter course under the same name
     and silently rescore everyone downward. */
  if (end != null && published < end) fail(`spine ends ${published}, before the requested cut ${end}`);
  const last = end ?? published;
  if (end != null) {
    for (const ym of [...spine.keys()]) {
      if (ym > last) { spine.delete(ym); segmentOf.delete(ym); }
    }
  }

  /* Months where MOSPI published an index but held back the rate. April and
     May 2020 are the only two: prices were collected in fewer markets under the
     lockdown, MOSPI flagged both indices `F*` and printed no year-on-year
     beside them. The rate is computed here from those two published indices and
     the published indices twelve months earlier — the same arithmetic MOSPI
     applied a year later, when it used these very indices as the denominators
     of the April and May 2021 rates it did publish. That agreement is asserted
     below rather than assumed.

     Nothing is interpolated. A hole with no published index behind it fails the
     build instead of being drawn through. */
  const limitedCollection = [];
  const computedDetail = [];
  {
    const holes = [];
    for (let i = ymIndex(first); i <= ymIndex(last); i++) {
      if (!spine.has(ymFrom(i))) holes.push(ymFrom(i));
    }
    for (const ym of holes) {
      const src = ym >= RECAST_2024
        ? { idx: coicopIdx, label: 'CPI-C 2024=100' }
        : ym >= SPLICE_IW_TO_CPIC
          ? { idx: cpicIdx, label: 'CPI-C 2012=100' }
          : { idx: iwIndex, label: 'CPI-IW' };
      const ago = prevYear(ym);
      const v = src.idx.get(ym);
      const b = src.idx.get(ago);
      if (v == null || b == null) {
        fail(`${ym} has no published rate and no published index to compute one from `
          + `(${src.label}: ${ym}=${v ?? 'missing'}, ${ago}=${b ?? 'missing'}) — `
          + `the spine will not interpolate across it`);
      }
      spine.set(ym, (v / b - 1) * 100);
      segmentOf.set(ym, `${src.label} (rate computed from published indices)`);
      limitedCollection.push(ym);
      computedDetail.push({ ym, idx: v, agoYm: ago, agoIdx: b, source: src.label });
    }
    limitedCollection.sort();
    computedDetail.sort((a, b2) => (a.ym < b2.ym ? -1 : 1));
  }

  const points = [];
  for (let i = ymIndex(first); i <= ymIndex(last); i++) {
    const ym = ymFrom(i);
    points.push({ ym, yoy: +spine.get(ym).toFixed(2) });
  }

  // ── 4. Gates ────────────────────────────────────────────────────────────
  log(`\n  spine: ${first} .. ${last} (${points.length} months)`);
  log(`  segments: CPI-IW → ${SPLICE_IW_TO_CPIC} → CPI-C 2012=100 → ${RECAST_2024} → CPI-C 2024=100`);

  // Gate 1: continuity.
  for (let i = 1; i < points.length; i++) {
    if (ymIndex(points[i].ym) !== ymIndex(points[i - 1].ym) + 1) {
      fail(`month gap between ${points[i - 1].ym} and ${points[i].ym}`);
    }
  }
  if (points[0].ym !== SPINE_START) fail(`spine starts ${points[0].ym}, expected ${SPINE_START}`);
  log(`  gate 1  continuity: ${points.length} unbroken months`);

  const at = (ym) => spine.get(ym);
  const step = (ym) => at(ym) - at(ymFrom(ymIndex(ym) - 1));

  // Gate 2: the two CPI-IW base seams.
  for (const [seam, factor] of [['1988-10', LINK_1960_TO_1982], ['2006-01', LINK_1982_TO_2001]]) {
    const d = step(seam);
    const verdict = Math.abs(d) <= GATE.baseSeam ? 'ok' : 'FAIL';
    log(`  gate 2  base seam ${seam} (factor ${factor}): ${at(prevMonth(seam)).toFixed(2)} → ${at(seam).toFixed(2)}, step ${d.toFixed(2)} pt [${verdict}]`);
    if (verdict === 'FAIL') fail(`base seam at ${seam} moves ${d.toFixed(2)} pt, limit ${GATE.baseSeam}`);
  }

  // Gate 3: CPI-IW → CPI-C.
  {
    const d = step(SPLICE_IW_TO_CPIC);
    const verdict = Math.abs(d) <= GATE.spliceSeam ? 'ok' : 'FAIL';
    log(`  gate 3  splice seam ${SPLICE_IW_TO_CPIC}: ${at(prevMonth(SPLICE_IW_TO_CPIC)).toFixed(2)} → ${at(SPLICE_IW_TO_CPIC).toFixed(2)}, step ${d.toFixed(2)} pt [${verdict}]`);
    if (verdict === 'FAIL') fail(`splice seam moves ${d.toFixed(2)} pt, limit ${GATE.spliceSeam}`);
  }

  /* Gate 4: the base recast. This seam has no overlapping published
     year-on-year to check against — the old series stops before the new one
     has twelve months to compute from — so the year-on-year step is only half
     the test. The other half uses the twelve months where both bases publish
     an index: if the two baskets are measuring the same thing, their
     month-on-month changes should agree even though their levels cannot. */
  {
    const d = step(RECAST_2024);
    const stepOk = Math.abs(d) <= GATE.recastSeam;
    log(`  gate 4  recast seam ${RECAST_2024}: ${at(prevMonth(RECAST_2024)).toFixed(2)} → ${at(RECAST_2024).toFixed(2)}, step ${d.toFixed(2)} pt [${stepOk ? 'ok' : 'FAIL'}]`);
    if (!stepOk) fail(`recast seam moves ${d.toFixed(2)} pt, limit ${GATE.recastSeam}`);

    const overlap = await q(
      `WITH old AS (
         SELECT date, index_value v FROM ${schema}.mospi_cpi_index
          WHERE state='All India' AND sector='Combined' AND cpi_group='General'
            AND subgroup='General-Overall' AND series='Current' AND index_value IS NOT NULL),
       new AS (
         SELECT date, index_value v FROM ${schema}.mospi_cpi_coicop
          WHERE state='All India' AND sector='Combined' AND code='GEN' AND index_value IS NOT NULL)
       SELECT o.date,
              100*(o.v/lag(o.v) OVER (ORDER BY o.date)-1) AS old_mom,
              100*(n.v/lag(n.v) OVER (ORDER BY n.date)-1) AS new_mom
         FROM old o JOIN new n USING (date) ORDER BY o.date`,
    );
    const diffs = overlap.filter((r) => r.old_mom != null && r.new_mom != null)
      .map((r) => Math.abs(+r.old_mom - +r.new_mom));
    if (diffs.length < 6) fail(`only ${diffs.length} overlap months between the CPI-C bases, need at least 6`);
    const meanDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
    const maxDiff = Math.max(...diffs);
    const momOk = meanDiff <= GATE.recastMomMean && maxDiff <= GATE.recastMomMax;
    log(`  gate 4  recast overlap (${diffs.length} months of month-on-month): mean |diff| ${meanDiff.toFixed(3)} pt, max ${maxDiff.toFixed(3)} pt [${momOk ? 'ok' : 'FAIL'}]`);
    if (!momOk) fail(`the two CPI-C bases disagree month-on-month: mean ${meanDiff.toFixed(3)}, max ${maxDiff.toFixed(3)}`);
  }

  // Gate 5: the landmarks. If these have moved, the splice is wrong somewhere.
  {
    let peak = points[0];
    let trough = points[0];
    for (const p of points) {
      if (p.yoy > peak.yoy) peak = p;
      if (p.yoy < trough.yoy) trough = p;
    }
    for (const l of LANDMARKS) {
      const got = at(l.ym);
      if (got == null) fail(`landmark ${l.ym} is missing from the spine`);
      const off = Math.abs(got - l.yoy);
      const ok = off <= GATE.landmark;
      log(`  gate 5  ${l.ym} (${l.note}): ${got.toFixed(2)} vs ${l.yoy} expected, off by ${off.toFixed(2)} [${ok ? 'ok' : 'FAIL'}]`);
      if (!ok) fail(`landmark ${l.ym} reads ${got.toFixed(2)}, expected ${l.yoy} ± ${GATE.landmark}`);
    }
    if (peak.ym !== '1974-09') fail(`series maximum is ${peak.ym} (${peak.yoy}), expected 1974-09`);
    if (trough.ym !== '1976-05') fail(`series minimum is ${trough.ym} (${trough.yoy}), expected 1976-05`);
    log(`  gate 5  extremes: max ${peak.ym} ${peak.yoy}, min ${trough.ym} ${trough.yoy} [ok]`);
  }

  /* Gate 6: the exit months. A ratio link does not contaminate one month, it
     contaminates a twelve-month window — the seam month is the first
     year-on-year computed across two scales and seam+11 is the last, so seam+12
     is where the series steps back onto a single ruler. Gate 2 watches the
     window open; this watches it close. If a linking factor is wrong, both ends
     move, and checking only the entry has been catching half the evidence. */
  for (const seam of ['1988-10', '2006-01']) {
    const exit = ymFrom(ymIndex(seam) + 12);
    const d = step(exit);
    const verdict = Math.abs(d) <= GATE.exitSeam ? 'ok' : 'FAIL';
    log(`  gate 6  exit month ${exit} (window opened ${seam}): ${at(prevMonth(exit)).toFixed(2)} → ${at(exit).toFixed(2)}, step ${d.toFixed(2)} pt [${verdict}]`);
    if (verdict === 'FAIL') fail(`exit seam at ${exit} moves ${d.toFixed(2)} pt, limit ${GATE.exitSeam}`);
  }

  /* Gate 7: the long overlap. CPI-IW and CPI-C both publish a year-on-year for
     every month from January 2012 to August 2020, and the spine takes CPI-IW
     for the first two years of that and CPI-C for the rest. The two instruments
     measure different populations with different baskets, so they are not
     supposed to agree — the gap is real, not error. What would be a problem is
     the gap CHANGING: if a future reload widens it, the handover at January
     2014 is joining two series that have stopped describing the same country,
     and the splice gate alone would not notice because it only ever looks at
     one month.

     Published rates only. The two computed 2020 months are excluded — including
     them would turn a comparison of two ministries' published series into a
     test of our own arithmetic. */
  {
    const months = [...iwYoy.keys()].filter((m) => cpic.has(m)).sort();
    if (months.length < GATE.overlapMinMonths) {
      fail(`only ${months.length} months where CPI-IW and CPI-C both publish a rate, need at least ${GATE.overlapMinMonths}`);
    }
    const gaps = months.map((m) => iwYoy.get(m) - cpic.get(m));
    const { mean, sd } = stats(gaps);
    const absGaps = gaps.map(Math.abs);
    const max = Math.max(...absGaps);
    const maxAt = months[absGaps.indexOf(max)];
    const ok = Math.abs(mean) <= GATE.overlapMeanAbs && sd <= GATE.overlapSd && max <= GATE.overlapMax;
    log(`  gate 7  CPI-IW vs CPI-C overlap (${months.length} months ${months[0]}–${months.at(-1)}): `
      + `mean gap ${mean >= 0 ? '+' : ''}${mean.toFixed(3)} pp, sd ${sd.toFixed(3)}, max |gap| ${max.toFixed(3)} at ${maxAt} [${ok ? 'ok' : 'FAIL'}]`);
    if (!ok) {
      fail(`the CPI-IW / CPI-C overlap has drifted: mean ${mean.toFixed(3)} (limit ±${GATE.overlapMeanAbs}), `
        + `sd ${sd.toFixed(3)} (limit ${GATE.overlapSd}), max ${max.toFixed(3)} (limit ${GATE.overlapMax})`);
    }
  }

  /* Gate 8: the computed months check out against MOSPI's own later use of the
     same indices. April 2021's published rate is April 2021's index over April
     2020's — the F* one. If our reading of those indices is right, recomputing
     the rate MOSPI DID publish twelve months after each computed month has to
     land on the published figure. It is the strongest available proof that the
     limited-collection indices are the right denominators, and it costs one
     division per computed month. */
  for (const c of computedDetail) {
    const after = ymFrom(ymIndex(c.ym) + 12);
    const src = after >= RECAST_2024 ? coicopIdx : after >= SPLICE_IW_TO_CPIC ? cpicIdx : iwIndex;
    const pubRate = after >= RECAST_2024 ? coicop.get(after) : cpic.get(after);
    const laterIdx = src.get(after);
    if (pubRate == null || laterIdx == null) {
      log(`  gate 8  ${c.ym} computed ${((c.idx / c.agoIdx - 1) * 100).toFixed(2)} from ${c.idx}/${c.agoIdx}; no published rate at ${after} to cross-check [skipped]`);
      continue;
    }
    const implied = (laterIdx / c.idx - 1) * 100;
    const off = Math.abs(implied - pubRate);
    const ok = off <= 0.01;
    log(`  gate 8  ${c.ym} computed ${((c.idx / c.agoIdx - 1) * 100).toFixed(2)} from published ${c.idx}/${c.agoIdx}; `
      + `MOSPI's own ${after} rate off the same index: ${implied.toFixed(4)} vs published ${pubRate}, off by ${off.toFixed(4)} [${ok ? 'ok' : 'FAIL'}]`);
    if (!ok) {
      fail(`${c.ym}'s index ${c.idx} does not reproduce MOSPI's published ${after} rate `
        + `(${implied.toFixed(4)} vs ${pubRate}) — the limited-collection index may be misread`);
    }
  }

  /* How much of a CPI-IW year-on-year is rounding rather than prices. The
     Labour Bureau publishes the index as a whole number, so a reading of 119
     means somewhere in [118.5, 119.5), and a ratio of two of them inherits both
     rounding intervals. The worst case is computed exactly, per month, and the
     mean and maximum go into the output so the board can disclose the width
     rather than draw a line that looks more precise than it is. The scaled
     quantum is 1/factor, which keeps the months that straddle a base change
     honest — there the numerator and denominator carry different quanta. */
  const quantization = (() => {
    const halves = [];
    for (const ym of iwYoy.keys()) {
      const ago = prevYear(ym);
      const v = iwIndex.get(ym);
      const b = iwIndex.get(ago);
      const qv = 0.5 / iwFactor.get(ym);
      const qb = 0.5 / iwFactor.get(ago);
      const base = (v / b - 1) * 100;
      const hi = ((v + qv) / (b - qb) - 1) * 100;
      const lo = ((v - qv) / (b + qb) - 1) * 100;
      halves.push({ ym, h: Math.max(hi - base, base - lo) });
    }
    const hs = halves.map((x) => x.h);
    const max = Math.max(...hs);
    return {
      months: hs.length,
      meanHalfWidth: +(hs.reduce((a, b) => a + b, 0) / hs.length).toFixed(3),
      maxHalfWidth: +max.toFixed(3),
      maxAt: halves[hs.indexOf(max)].ym,
    };
  })();
  log(`  quantization: CPI-IW indices are integers — year-on-year carries ±${quantization.meanHalfWidth} pp on average, `
    + `±${quantization.maxHalfWidth} pp at worst (${quantization.maxAt}), over ${quantization.months} months`);

  /* The four places the ruler changes. The game does not draw them (it has
     annotations instead); the board's long line marks each one, which is why
     they are named here rather than in either caller.

     `factor` is null on the last two on purpose: January 2014 and January 2026
     are handovers, where one series stops and another starts. Nothing is scaled
     across them and no linking factor exists. Only the first two are ratio
     links, and only they have a number to name. */
  const seams = [
    { ym: '1988-10', from: 'CPI-IW 1960=100', to: 'CPI-IW 1982=100', kind: 'link', factor: LINK_1960_TO_1982, exit: ymFrom(ymIndex('1988-10') + 12) },
    { ym: '2006-01', from: 'CPI-IW 1982=100', to: 'CPI-IW 2001=100', kind: 'link', factor: LINK_1982_TO_2001, exit: ymFrom(ymIndex('2006-01') + 12) },
    { ym: SPLICE_IW_TO_CPIC, from: 'CPI-IW', to: 'CPI-C 2012=100', kind: 'handover', factor: null, exit: null },
    { ym: RECAST_2024, from: 'CPI-C 2012=100', to: 'CPI-C 2024=100', kind: 'handover', factor: null, exit: null },
  ];

  /* Written from the data rather than typed out, so the sentence cannot outlive
     the months it describes. */
  /* A hover, not a footnote: it fires on a single dot under the reader's
     cursor, so it says what happened and what was done about it in two short
     sentences. The full account — which indices, against which year-ago
     indices, and MOSPI's own later use of them — is the desk's own copy and
     the sources block, where there is room to read it. */
  const lcNote = computedDetail.length
    ? `Priced under the ${new Set(computedDetail.map((c) => c.ym.slice(0, 4))).size === 1 ? computedDetail[0].ym.slice(0, 4) : 'lockdown-year'} lockdown collection limits. `
      + `MOSPI published the index (${computedDetail.map((c) => c.idx).join(' and ')}) but not the rate, so this rate is computed from it.`
    : '';

  return {
    spine,
    segmentOf,
    points,
    first,
    last,
    limitedCollection,
    limitedCollectionDetail: computedDetail,
    limitedCollectionNote: lcNote,
    quantization,
    quantizationNote: `The pre-2014 half runs on whole-number indices, so each reading carries about `
      + `±${quantization.meanHalfWidth} percentage points of rounding, ±${quantization.maxHalfWidth} at its widest: `
      + `smaller movements there are the ruler, not prices.`,
    seams,
    segments: [
      { series: 'CPI-IW', from: first, to: prevMonth(SPLICE_IW_TO_CPIC), basis: 'year-on-year computed from the published monthly index' },
      { series: 'CPI-C 2012=100', from: SPLICE_IW_TO_CPIC, to: prevMonth(RECAST_2024), basis: 'inflation as published by MOSPI, except the limited-collection months' },
      { series: 'CPI-C 2024=100', from: RECAST_2024, to: last, basis: 'inflation as published by MOSPI' },
    ],
    linkingFactors: { '1960_to_1982': LINK_1960_TO_1982, '1982_to_2001': LINK_1982_TO_2001 },
  };
}

/**
 * The six eras, with the weight each takes in the game's composite index, and
 * the contiguity gates that say they tile the spine exactly.
 *
 * The weight is how far the rate travelled per month, normalized to sum to
 * one: the same shape as a CPI weight, and the reason the game's composite can
 * honestly be called an index. Rounded weights are nudged on the last era so
 * the six sum to exactly 1 and the published index can reach 100.0.
 *
 * It was the mean absolute year-on-year until Jul 2026, which measured how far
 * from zero an era SAT rather than how much it moved, and those are different
 * things on terrain built out of movement. The eighties were the proof:
 * inflation pinned near nine for a decade is high flat ground, and flat is flat
 * at any altitude, yet it took the second-largest weight in the basket. Under
 * travel it takes 15.1% and the seventies takes 27.9%.
 *
 * Not the standard deviation of the level, which was the obvious alternative
 * and is wrong for the same reason twice over. It measures how spread out the
 * rate is, and a decade drifting smoothly from 3% to 20% is a wide spread and a
 * gentle ramp. It also weighs a property the machine deliberately cancels: the
 * per-era vertical fit gives a wide-ranging era LESS lift, so range does not
 * become slope. On this series it correlates with steepness anyway (0.94
 * against travel's 0.83) but by coincidence of the data rather than by
 * construction, and it would hand the seventies 41.8% of the index.
 *
 * The standard deviation of the month-on-month change is the one real
 * alternative and is all but identical: the same ranking bar a coin flip
 * between the 2010s and the 2020s, which sit 0.3% apart on travel. It punishes
 * an outlier month quadratically, which is arguably right and costs a clause to
 * explain. One line here if it is ever wanted.
 */
export function buildEras({ points, first, last }) {
  const eras = ERAS.map((e) => {
    const to = e.to ?? last;
    const slice = points.filter((p) => p.ym >= e.from && p.ym <= to);
    if (!slice.length) fail(`era ${e.id} covers no months`);
    const meanAbs = slice.reduce((a, p) => a + Math.abs(p.yoy), 0) / slice.length;
    const values = slice.map((p) => p.yoy);
    /* How far the rate travelled, per month: the mean absolute month-on-month
       change. Per month rather than in total, or the 78-month 2020s would be
       marked down for being short. This is the weight; see the block below. */
    let travel = 0;
    for (let i = 1; i < values.length; i++) travel += Math.abs(values[i] - values[i - 1]);
    const climb = values.length > 1 ? travel / (values.length - 1) : 0;
    return {
      id: e.id,
      label: e.label,
      character: e.character,
      from: e.from,
      to,
      fromLabel: longMonth(e.from),
      toLabel: longMonth(to),
      months: slice.length,
      meanAbsYoy: +meanAbs.toFixed(2),
      /* Kept alongside meanAbsYoy rather than replacing it: the mean level is
         still a true fact about the era. Only one of the two sets the weight. */
      climbPerMonth: +climb.toFixed(4),
      peak: +Math.max(...values).toFixed(2),
      trough: +Math.min(...values).toFixed(2),
      weight: 0, // filled below
    };
  });

  // Contiguity: the six eras must tile the spine exactly, or the Index is
  // weighing something other than the whole series.
  if (eras[0].from !== first) fail(`era coverage starts ${eras[0].from}, spine starts ${first}`);
  if (eras[eras.length - 1].to !== last) fail(`era coverage ends ${eras[eras.length - 1].to}, spine ends ${last}`);
  for (let i = 1; i < eras.length; i++) {
    if (ymIndex(eras[i].from) !== ymIndex(eras[i - 1].to) + 1) {
      fail(`eras ${eras[i - 1].id} and ${eras[i].id} do not meet: ${eras[i - 1].to} → ${eras[i].from}`);
    }
  }
  const totalMonths = eras.reduce((a, e) => a + e.months, 0);
  if (totalMonths !== points.length) fail(`eras cover ${totalMonths} months, spine has ${points.length}`);

  const weightSum = eras.reduce((a, e) => a + e.climbPerMonth, 0);
  let acc = 0;
  eras.forEach((e, i) => {
    if (i === eras.length - 1) e.weight = +(1 - acc).toFixed(4);
    else { e.weight = +(e.climbPerMonth / weightSum).toFixed(4); acc += e.weight; }
  });
  const wSum = eras.reduce((a, e) => a + e.weight, 0);
  if (Math.abs(wSum - 1) > 1e-9) fail(`era weights sum to ${wSum}, expected 1`);

  return eras;
}

/**
 * The sources line, verbatim on every page that draws the spine.
 *
 * One line, and it has to carry five disclosures: what the two instruments are,
 * that they measure different populations, where they hand over, that the
 * CPI-IW half is linked across its own bases with published factors, and that
 * two months carry a rate computed from published indices rather than a
 * published rate.
 *
 * Kept to four sentences. It ran longer and named every base year on both
 * halves, which put eight lines of mono under the game; a citation earns its
 * length by being checkable, not by being complete. What went is the
 * enumeration — the 1960/1982/2001 bases on the CPI-IW side and the interim
 * 2012=100 on MOSPI's — because `segments`, `linkingFactors` and
 * `limitedCollectionDetail` from `buildSpine` carry all of it for anyone
 * reproducing the series.
 *
 * The industrial-worker clause is not decoration. Pre-2014 is a different
 * instrument over a different population, and a reader who takes the whole line
 * for one continuous measurement of the same thing has been misled by omission.
 *
 * @param {{limitedCollection?: string[]}} [spine]  the buildSpine result, so the
 *        last sentence names the months the data actually computed rather than
 *        two hardcoded ones.
 */
export function spineSources(spine) {
  const computed = spine?.limitedCollection ?? [];
  return [
    `Labour Bureau CPI-IW to ${longMonth(prevMonth(SPLICE_IW_TO_CPIC))} — a different instrument, covering industrial-worker households — with year-on-year computed from the published index and linked across its earlier bases with factors ${LINK_1960_TO_1982} and ${LINK_1982_TO_2001}. `,
    `MOSPI CPI Combined (All India, General) from ${longMonth(SPLICE_IW_TO_CPIC)}, rebased 2024=100 in ${longMonth(RECAST_2024)}. `,
    computed.length
      ? `${computed.map(longMonth).join(' and ')} carry rates computed from MOSPI's published limited-collection indices, which the ministry issued without rates of their own.`
      : `Every month carries a rate as published.`,
  ].join('');
}
