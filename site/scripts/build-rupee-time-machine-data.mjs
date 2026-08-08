// Dataset for the Rupee Time Machine (/economy/explore/rupee-time-machine):
// one continuous monthly price LEVEL for India, August 1969 to the latest
// MoSPI print, so a rupee can be carried from any month to any other.
// Contract and methodology: docs/explore-rupee-time-machine-spec.md.
//
// The board's spine ships year-on-year only, because CPI-IW and CPI-C are
// different instruments and a stitched LEVEL is a stronger claim than a
// stitched RATE. The machine needs the level claim, so it is built the one
// defensible way: as a chain of monthly ratios in which every single ratio is
// a ratio of two published index levels of the SAME instrument on the SAME
// base. No ratio in this chain ever compares two instruments or two bases
// directly.
//
//   L(t), the chained level:
//     1969-08 → 2013-12   Labour Bureau CPI-IW, every published value mapped
//                         onto the 2001=100 scale with the Bureau's own
//                         linking factors (4.93 and 4.63, imported from
//                         lib/inflation-spine.mjs — never re-declared here)
//     2014-01 → 2025-12   L(2013-12) × C12(t) / C12(2013-12), where C12 is
//                         MoSPI CPI Combined on 2012=100. The bridge ratio
//                         C12(2014-01)/C12(2013-12) is two published levels of
//                         one instrument, so the handover stays inside CPI-C.
//     2026-01 → asOf      L(2025-12) × C24(t) / C24(2025-12), where C24 is
//                         CPI Combined on the 2024=100 base. Same trick, same
//                         reason: the bridge lives inside the new base.
//
// What ships is the level normalized so the latest month reads 100:
//   idx(t) = 100 × L(t) / L(asOf), to six significant digits.
//
// The one caveat the page copy owns rather than hides: CPI-IW prices the
// households of workers in organised industry and CPI Combined prices every
// household, so a rupee carried across January 2014 changes measuring
// instrument on the way. Every cross-instrument figure the machine prints is
// prefixed "about".
//
// Seven gates fail the build, numbered R1–R7 as the spec numbers them, and
// each prints the number it measured rather than a verdict alone:
//
//   R1  continuity — every calendar month start→asOf, finite and positive,
//       last value exactly 100
//   R2  within-instrument fidelity — every consecutive pair on one instrument
//       and base reproduces the published-level ratio to 1e-5 relative
//   R3  seam construction — exactly four special joins, each recomputed, with
//       C12(2013-12)=114.5 and C24(2025-12)=104.1 hard-asserted
//   R4  anchors — the 2014-01 → 2025-12 multiplier is 198/113.6, and the
//       full-span multiplier lands inside [40, 70]
//   R5  year-on-year cross-check against the board's own spine
//   R6  metadata fidelity — segments, seams and sources.spine are what
//       buildSpine returned in this same run
//   R7  size — the shipped JSON is at most 30 kB
//
// The dataset also carries a calendar-year block, which is what the SEO year
// pages (/economy/explore/rupee-time-machine/1990 and its fifty-five
// siblings) are built from: one entry per year with the mean of that year's
// monthly idx values and the year-average-over-year-average inflation. Four
// more gates cover it:
//
//   Y1  every full year averages exactly twelve idx values and the stored mean
//       recomputes; the partial year averages the months through asOf and says
//       so in `partial`
//   Y2  every non-null `infl` recomputes from the two stored `avg` values
//   Y3  years run from the first full year to the asOf year with no gaps
//   Y4  the shipped size with the year block, against the same 30 kB ceiling
//
// Usage: SCHEMA_NAME=economy_dev node scripts/build-rupee-time-machine-data.mjs
import { SCHEMA, connect, writeData } from './lib/db.mjs';
import {
  LINK_1960_TO_1982, LINK_1982_TO_2001, RECAST_2024, SPINE_START,
  SPLICE_IW_TO_CPIC, buildSpine, longMonth, prevMonth, spineSources, ymFrom, ymIndex,
} from './lib/inflation-spine.mjs';

const fail = (msg) => {
  console.error(`\n  FAIL: ${msg}\n`);
  process.exitCode = 1;
  throw new Error(msg);
};
const gate = (n, msg) => console.log(`  ${n}  ${msg}`);

/* The two levels the bridges divide by. Written here as literals rather than
   read from the query, because that is the point of them: if a reload ever
   changes the December the chain pivots on, the build should stop rather than
   quietly re-scale six decades of rupees. */
const C12_AT_HANDOVER = 114.5; // CPI-C 2012=100, December 2013
const C24_AT_RECAST = 104.1; // CPI-C 2024=100, December 2025

/* Six significant digits is the shipped precision. At the old end of the chain
   idx runs near 1.8 and at the new end it is exactly 100, so a fixed number of
   DECIMALS would either round the seventies into steps or carry ten digits of
   float noise on every modern month. */
const round6 = (v) => Number(v.toPrecision(6));

const { q, end } = await connect();

// ── asOf: the latest month with a published index on the live base ────────
const [{ asof }] = await q(`
  SELECT to_char(max(date), 'YYYY-MM') AS asof
  FROM ${SCHEMA}.mospi_cpi_coicop
  WHERE item IS NULL AND state = 'All India' AND sector = 'Combined'
    AND code = 'GEN' AND index_value IS NOT NULL`);
if (!asof) fail(`${SCHEMA}.mospi_cpi_coicop has no All-India Combined General index — run etl/mospi first`);
console.log(`\n  rupee time machine: ${SPINE_START} → ${asof} (schema ${SCHEMA})`);

// ── The three published series ────────────────────────────────────────────
// CPI-IW, every base it has been published on. The 2016=100 base is dropped
// with no linking factor and no regret: the chain leaves CPI-IW in December
// 2013, seven years before that base begins.
const IW_LINK = {
  1960: LINK_1960_TO_1982 * LINK_1982_TO_2001,
  1982: LINK_1982_TO_2001,
  2001: 1,
};
const iwRows = await q(`
  SELECT to_char(date, 'YYYY-MM') AS ym, base_year, index_value::float AS v
  FROM ${SCHEMA}.cpi_iw_index
  WHERE index_value IS NOT NULL ORDER BY date`);
if (!iwRows.length) fail(`${SCHEMA}.cpi_iw_index is empty — run etl/labourbureau first`);

/** ym → { published, base, level } on the 2001=100 scale. */
const iw = new Map();
for (const r of iwRows) {
  const link = IW_LINK[r.base_year];
  if (!link) continue; // 2016=100, unused
  if (iw.has(r.ym)) fail(`two CPI-IW observations for ${r.ym} across bases`);
  iw.set(r.ym, { published: r.v, base: String(r.base_year), level: r.v / link });
}

// CPI Combined, 2012=100. Four filters, exactly as the spec names them; the
// series has one row per month under them, which the map below would catch.
const c12Rows = await q(`
  SELECT to_char(date, 'YYYY-MM') AS ym, index_value::float AS v
  FROM ${SCHEMA}.mospi_cpi_index
  WHERE state = 'All India' AND sector = 'Combined'
    AND cpi_group = 'General' AND series = 'Current' AND index_value IS NOT NULL
  ORDER BY date`);
const c12 = new Map();
for (const r of c12Rows) {
  if (c12.has(r.ym)) fail(`two CPI-C 2012=100 observations for ${r.ym}`);
  c12.set(r.ym, r.v);
}

// CPI Combined, 2024=100. `item IS NULL` keeps the headline row out of the
// company of the 358 priced items, which carry the same code on other rows.
const c24Rows = await q(`
  SELECT to_char(date, 'YYYY-MM') AS ym, index_value::float AS v
  FROM ${SCHEMA}.mospi_cpi_coicop
  WHERE item IS NULL AND state = 'All India' AND sector = 'Combined'
    AND code = 'GEN' AND index_value IS NOT NULL
  ORDER BY date`);
const c24 = new Map();
for (const r of c24Rows) {
  if (c24.has(r.ym)) fail(`two CPI-C 2024=100 observations for ${r.ym}`);
  c24.set(r.ym, r.v);
}

// ── The chain ─────────────────────────────────────────────────────────────
// `key` is the instrument AND base a month's published level sits on. Two
// neighbours sharing a key are a plain ratio inside one series (gate R2); two
// neighbours with different keys are one of the four seams (gate R3). Nothing
// else in this file decides what a seam is.
const months = [];
for (let i = ymIndex(SPINE_START); i <= ymIndex(asof); i++) months.push(ymFrom(i));

const level = new Map();
const key = new Map();
const published = new Map();

const handoverPrev = prevMonth(SPLICE_IW_TO_CPIC); // 2013-12
const recastPrev = prevMonth(RECAST_2024); // 2025-12

for (const ym of months) {
  if (ym < SPLICE_IW_TO_CPIC) {
    const r = iw.get(ym);
    if (!r) fail(`no CPI-IW index for ${ym} — the chain will not interpolate across it`);
    level.set(ym, r.level);
    published.set(ym, r.published);
    key.set(ym, `CPI-IW ${r.base}=100`);
  }
}
const baseIW = level.get(handoverPrev);
if (baseIW == null) fail(`no CPI-IW level at ${handoverPrev}, the month the chain hands over from`);

if (c12.get(handoverPrev) !== C12_AT_HANDOVER) {
  fail(`C12(${handoverPrev}) is ${c12.get(handoverPrev)}, expected the published ${C12_AT_HANDOVER} — `
    + `the January 2014 bridge divides by this number`);
}
for (const ym of months) {
  if (ym < SPLICE_IW_TO_CPIC || ym >= RECAST_2024) continue;
  const v = c12.get(ym);
  if (v == null) fail(`no CPI-C 2012=100 index for ${ym}`);
  level.set(ym, baseIW * (v / C12_AT_HANDOVER));
  published.set(ym, v);
  key.set(ym, 'CPI-C 2012=100');
}
const baseC12 = level.get(recastPrev);
if (baseC12 == null) fail(`no chained level at ${recastPrev}, the month the base recast pivots on`);

if (c24.get(recastPrev) !== C24_AT_RECAST) {
  fail(`C24(${recastPrev}) is ${c24.get(recastPrev)}, expected the published ${C24_AT_RECAST} — `
    + `the January 2026 bridge divides by this number`);
}
for (const ym of months) {
  if (ym < RECAST_2024) continue;
  const v = c24.get(ym);
  if (v == null) fail(`no CPI-C 2024=100 index for ${ym}`);
  level.set(ym, baseC12 * (v / C24_AT_RECAST));
  published.set(ym, v);
  key.set(ym, 'CPI-C 2024=100');
}

const anchor = level.get(asof);
const idx = months.map((ym) => round6(100 * level.get(ym) / anchor));
const at = (ym) => idx[months.indexOf(ym)];

// ── the calendar-year block ───────────────────────────────────────────────
// A year page answers "what is ₹100 from 1990 worth now", and the only honest
// reading of a whole year is its twelve-month average: picking January would
// make the answer depend on which month of 1990 the reader happens to mean.
// 1969 is dropped because it carries five months, not because it is old — the
// rule is that a full average needs twelve values, and the only year allowed
// to fall short is the current one, which says so in `partial`.
const asOfYear = +asof.slice(0, 4);
const firstFullYear = +SPINE_START.slice(0, 4) + (+SPINE_START.slice(5) === 1 ? 0 : 1);
const asOfMonthName = longMonth(asof).split(' ')[0];

const byYear = new Map();
months.forEach((ym, i) => {
  const y = +ym.slice(0, 4);
  if (!byYear.has(y)) byYear.set(y, []);
  byYear.get(y).push(idx[i]);
});
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;

const years = [];
for (let y = firstFullYear; y <= asOfYear; y++) {
  const vals = byYear.get(y);
  if (!vals) fail(`no monthly values for ${y}, which the year block cannot skip over`);
  const avg = round6(mean(vals));
  const entry = { y, avg, infl: null };
  if (vals.length < 12) entry.partial = `to ${asOfMonthName}`;
  /* Inflation is computed from the SHIPPED averages rather than from the
     unrounded means, so the number a reader sees in the table is the number
     the two numbers beside it produce. It is null wherever either end of the
     comparison is a part-year: six months against twelve is not a year. */
  const prev = years.at(-1);
  if (prev && !entry.partial && !prev.partial && prev.y === y - 1) {
    entry.infl = Number(((avg / prev.avg - 1) * 100).toFixed(2));
  }
  years.push(entry);
}

// ── The spine, for the seam/segment/source metadata and the R5 cross-check ─
// Reused rather than re-derived so the machine and the board can never
// disagree about the splice story. The spine's own gates run here too; their
// numbering is prefixed so this build's report has one unambiguous scheme.
const spine = await buildSpine({
  q, schema: SCHEMA, log: (m) => console.log(m.replace(/^(\s*)gate /, '$1spine gate ')),
});
const sources = { spine: spineSources(spine) };

// ── R1 continuity ─────────────────────────────────────────────────────────
{
  const expected = ymIndex(asof) - ymIndex(SPINE_START) + 1;
  const bad = [];
  for (let i = 0; i < months.length; i++) {
    if (ymIndex(months[i]) !== ymIndex(SPINE_START) + i) bad.push(months[i]);
    const v = idx[i];
    if (!Number.isFinite(v) || v <= 0) bad.push(`${months[i]}=${v}`);
  }
  const lastOk = idx.at(-1) === 100;
  const ok = !bad.length && months.length === expected && idx.length === expected && lastOk;
  gate('R1', `continuity: ${months.length} months ${months[0]} → ${months.at(-1)}, ${idx.length} values, `
    + `all finite and positive, last ${idx.at(-1)} [${ok ? 'ok' : 'FAIL'}]`);
  if (bad.length) fail(`the month axis is broken at ${bad.slice(0, 5).join(', ')}`);
  if (months.length !== expected || idx.length !== expected) {
    fail(`the chain carries ${months.length} months and ${idx.length} values, expected ${expected}`);
  }
  if (!lastOk) fail(`the last shipped value is ${idx.at(-1)}, expected exactly 100`);
}

// ── R2 within-instrument fidelity ─────────────────────────────────────────
// Where two neighbouring months sit on one instrument and one base, the
// shipped ratio IS the published ratio: the linking factor cancels, the
// normalization cancels, and the only permitted difference is the rounding to
// six significant digits. Anything wider means an arithmetic step crept in
// between the ministry's number and the reader's.
{
  let worst = 0; let worstAt = ''; let checks = 0;
  for (let i = 1; i < months.length; i++) {
    const a = months[i - 1]; const b = months[i];
    if (key.get(a) !== key.get(b)) continue;
    const mine = idx[i] / idx[i - 1];
    const theirs = published.get(b) / published.get(a);
    const rel = Math.abs(mine / theirs - 1);
    checks++;
    if (rel > worst) { worst = rel; worstAt = `${a} → ${b}`; }
  }
  const ok = worst <= 1e-5;
  gate('R2', `within-instrument fidelity: worst relative gap ${worst.toExponential(3)} at ${worstAt}, `
    + `over ${checks} same-instrument month pairs, limit 1e-5 [${ok ? 'ok' : 'FAIL'}]`);
  if (!ok) fail(`the shipped ratio misses the published ratio by ${worst.toExponential(3)} at ${worstAt}`);
}

// ── R3 seam construction ──────────────────────────────────────────────────
// The seams are found, not listed: a seam is a month whose instrument-and-base
// key differs from its neighbour's. The four expected ones are then matched by
// name and each is recomputed from the published levels it is built out of.
{
  const found = months.slice(1).filter((ym, i) => key.get(months[i]) !== key.get(ym));
  const EXPECTED = [
    { ym: '1988-10', what: `CPI-IW 1960=100 → 1982=100, factor ${LINK_1960_TO_1982}`,
      ratio: () => published.get('1988-10') * LINK_1960_TO_1982 / published.get('1988-09') },
    { ym: '2006-01', what: `CPI-IW 1982=100 → 2001=100, factor ${LINK_1982_TO_2001}`,
      ratio: () => published.get('2006-01') * LINK_1982_TO_2001 / published.get('2005-12') },
    { ym: SPLICE_IW_TO_CPIC, what: `CPI-IW → CPI-C, bridged by C12(${SPLICE_IW_TO_CPIC})/C12(${handoverPrev}) with C12(${handoverPrev}) = ${C12_AT_HANDOVER}`,
      ratio: () => c12.get(SPLICE_IW_TO_CPIC) / C12_AT_HANDOVER },
    { ym: RECAST_2024, what: `CPI-C 2012=100 → 2024=100, bridged by C24(${RECAST_2024})/C24(${recastPrev}) with C24(${recastPrev}) = ${C24_AT_RECAST}`,
      ratio: () => c24.get(RECAST_2024) / C24_AT_RECAST },
  ];
  const namesOk = found.join(',') === EXPECTED.map((e) => e.ym).join(',');
  gate('R3', `seams: ${found.length} instrument-or-base changes found (${found.join(', ')}), `
    + `expected ${EXPECTED.length} [${namesOk ? 'ok' : 'FAIL'}]`);
  if (!namesOk) {
    fail(`the chain changes instrument or base at [${found.join(', ')}], expected [${EXPECTED.map((e) => e.ym).join(', ')}]`);
  }
  for (const e of EXPECTED) {
    const i = months.indexOf(e.ym);
    const mine = idx[i] / idx[i - 1];
    const theirs = e.ratio();
    const rel = Math.abs(mine / theirs - 1);
    const ok = rel <= 1e-5;
    gate('R3', `  ${e.ym} ${e.what}: shipped step ${mine.toFixed(6)}, recomputed ${theirs.toFixed(6)}, `
      + `off ${rel.toExponential(3)} [${ok ? 'ok' : 'FAIL'}]`);
    if (!ok) fail(`the ${e.ym} seam does not recompute: shipped ${mine}, published arithmetic ${theirs}`);
  }
}

// ── R4 anchors ────────────────────────────────────────────────────────────
// Both recomputed from the SHIPPED idx, so a chain that is right in memory and
// wrong in the file cannot pass. The full-span bound is deliberately wide: a
// missed linking factor lands near 12 and a doubled one near 250, and neither
// is anywhere close to [40, 70].
{
  const mult1214 = at('2025-12') / at(SPLICE_IW_TO_CPIC);
  const expected = 198 / 113.6;
  const rel = Math.abs(mult1214 / expected - 1);
  const okA = rel <= 1e-5;
  gate('R4', `CPI-C span ${SPLICE_IW_TO_CPIC} → 2025-12: shipped multiplier ${mult1214.toFixed(6)}, `
    + `published 198/113.6 = ${expected.toFixed(6)}, off ${rel.toExponential(3)}, limit 1e-5 [${okA ? 'ok' : 'FAIL'}]`);
  if (!okA) fail(`the CPI-C span multiplies by ${mult1214}, the published levels say ${expected}`);

  const full = at(asof) / at(SPINE_START);
  const okB = full >= 40 && full <= 70;
  gate('R4', `full span ${SPINE_START} → ${asof}: multiplier ${full.toFixed(2)}, band [40, 70] [${okB ? 'ok' : 'FAIL'}]`);
  if (!okB) fail(`the full-span multiplier is ${full.toFixed(2)}, outside [40, 70] — a linking factor is missing or doubled`);
}

// ── R5 year-on-year cross-check against the spine ─────────────────────────
// Three populations, because a twelve-month window is not always a window
// inside one instrument:
//
//   (a) both ends on CPI-IW. The spine computed its own year-on-year from
//       these very levels — the two base LINKS inside CPI-IW included, which
//       the spine crosses with the same published factors — so the two must
//       agree to the rounding, 0.01pp.
//   (b) both ends on CPI-C 2012=100. MoSPI publishes inflation off unrounded
//       indices, so recomputing from the published two-decimal levels drifts a
//       few hundredths; 0.30pp, with anything over 0.15pp named.
//   (c) the two windows that CROSS a handover — 2014-01…2014-12 across the
//       change of instrument, and 2026-01…asOf across the base recast. These
//       divide a numerator by a denominator from a different series, and
//       MoSPI's published rate for those months does not: the gap is the two
//       instruments disagreeing about the year, which is the caveat the page
//       owns rather than an error to gate away. Measured and printed, held to
//       a ceiling loose enough to leave the disagreement alone and tight
//       enough to catch a chain that has actually broken. Measured 2026-08-02:
//       2.315 pp at 2014-05 across the handover, 0.458 pp at 2026-03 across
//       the recast — the ceiling carries the same ~1.5× margin the spine's own
//       seam gates do.
{
  const CROSS_CEILING = 3.5; // see the note above; the measured max is printed
  const inflOf = new Map(spine.points.map((p) => [p.ym, p.yoy]));
  /* Bucketed by SEGMENT, not by the instrument-and-base key: a CPI-IW base
     link is a place where the chain and the spine do the same arithmetic with
     the same published factor, so those windows belong with the rest of
     CPI-IW rather than with the handovers. */
  const segOf = (ym) => (ym < SPLICE_IW_TO_CPIC ? 'iw' : ym < RECAST_2024 ? 'c12' : 'c24');
  const buckets = {
    iw: { limit: 0.01, worst: 0, at: '', n: 0, label: 'CPI-IW windows' },
    cpic: { limit: 0.30, worst: 0, at: '', n: 0, label: 'CPI-C 2012=100 windows' },
    splice: { limit: CROSS_CEILING, worst: 0, at: '', n: 0, label: `windows crossing the ${SPLICE_IW_TO_CPIC} handover` },
    recast: { limit: CROSS_CEILING, worst: 0, at: '', n: 0, label: `windows crossing the ${RECAST_2024} recast` },
  };
  const loud = [];
  for (let i = 0; i < months.length; i++) {
    const ym = months[i];
    if (i < 12) continue;
    const pub = inflOf.get(ym);
    if (pub == null) continue;
    const mine = (idx[i] / idx[i - 12] - 1) * 100;
    const dev = Math.abs(mine - pub);
    const sa = segOf(months[i - 12]); const sb = segOf(ym);
    const b = sa === sb ? (sb === 'iw' ? buckets.iw : buckets.cpic)
      : sb === 'c24' ? buckets.recast : buckets.splice;
    b.n++;
    if (dev > b.worst) { b.worst = dev; b.at = ym; }
    if (b === buckets.cpic && dev > 0.15) loud.push(`${ym} ${dev.toFixed(3)}pp`);
  }
  for (const b of [buckets.iw, buckets.cpic, buckets.splice, buckets.recast]) {
    const ok = b.worst <= b.limit;
    gate('R5', `${b.label}: ${b.n} months, max deviation ${b.worst.toFixed(3)}pp at ${b.at}, `
      + `limit ${b.limit} [${ok ? 'ok' : 'FAIL'}]`);
    if (!ok) fail(`recomputed year-on-year misses the spine by ${b.worst.toFixed(3)}pp at ${b.at} (${b.label})`);
  }
  gate('R5', `CPI-C months over 0.15pp: ${loud.length ? loud.join(', ') : 'none'}`);
}

// ── The shipped object ────────────────────────────────────────────────────
const out = {
  asOf: asof,
  asOfLabel: longMonth(asof),
  start: SPINE_START,
  months,
  idx,
  years,
  segments: spine.segments,
  seams: spine.seams,
  sources,
  generated: new Date().toISOString(),
};

// ── R6 metadata fidelity ──────────────────────────────────────────────────
// Compared after a JSON round-trip, which is the form the browser will read:
// a Date or an undefined that survives in memory and vanishes in the file is
// exactly the kind of drift this gate is for.
{
  const shipped = JSON.parse(JSON.stringify({ segments: out.segments, seams: out.seams, sources: out.sources }));
  const mine = JSON.parse(JSON.stringify({
    segments: spine.segments, seams: spine.seams, sources: { spine: spineSources(spine) },
  }));
  const ok = JSON.stringify(shipped) === JSON.stringify(mine);
  gate('R6', `metadata: ${out.segments.length} segments, ${out.seams.length} seams, `
    + `${out.sources.spine.length}-character sources line, all deep-equal to buildSpine's own [${ok ? 'ok' : 'FAIL'}]`);
  if (!ok) fail('the shipped segments/seams/sources are not what buildSpine returned in this run');
}

// ── R7 size, and the write ────────────────────────────────────────────────
const shippedBytes = Buffer.byteLength(JSON.stringify(out)) + 1; // writeData adds the newline
{
  const kb = shippedBytes / 1000;
  const ok = shippedBytes <= 30_000;
  gate('R7', `size: ${kb.toFixed(1)} kB, ceiling 30 kB [${ok ? 'ok' : 'FAIL'}]`);
  if (!ok) fail(`the dataset is ${kb.toFixed(1)} kB, over the 30 kB ceiling`);
}

// ── Y1 year averages ──────────────────────────────────────────────────────
// Recomputed from the SHIPPED idx, month by month, the same way R4 recomputes
// its anchors: a year block that is right in memory and wrong in the file is
// exactly what a table of fifty-seven numbers would hide.
{
  const partialMonths = byYear.get(asOfYear).length;
  const wantPartial = partialMonths < 12 ? `to ${asOfMonthName}` : null;
  const bad = [];
  let full = 0; let part = 0;
  for (const e of years) {
    const vals = byYear.get(e.y);
    const expected = e.y === asOfYear && wantPartial ? partialMonths : 12;
    if (vals.length !== expected) bad.push(`${e.y} carries ${vals.length} months, expected ${expected}`);
    if (round6(mean(vals)) !== e.avg) bad.push(`${e.y} mean ${round6(mean(vals))} ≠ shipped ${e.avg}`);
    const want = e.y === asOfYear ? wantPartial : null;
    if ((e.partial ?? null) !== want) bad.push(`${e.y} partial is ${JSON.stringify(e.partial ?? null)}, expected ${JSON.stringify(want)}`);
    if (e.partial) part++; else full++;
  }
  const ok = !bad.length;
  gate('Y1', `year averages: ${full} full years of 12 months, ${part} partial `
    + `(${wantPartial ? `${asOfYear} ${wantPartial}, ${partialMonths} months` : 'none'}), `
    + `all means recompute from the shipped idx [${ok ? 'ok' : 'FAIL'}]`);
  if (!ok) fail(`the year block does not recompute: ${bad.slice(0, 5).join('; ')}`);
}

// ── Y2 year-on-year ───────────────────────────────────────────────────────
{
  const bad = [];
  let n = 0;
  for (let i = 1; i < years.length; i++) {
    const e = years[i]; const p = years[i - 1];
    if (e.infl == null) continue;
    n++;
    const mine = Number(((e.avg / p.avg - 1) * 100).toFixed(2));
    if (mine !== e.infl) bad.push(`${e.y} ships ${e.infl}, the two averages give ${mine}`);
  }
  const nulls = years.filter((e) => e.infl == null).map((e) => e.y);
  const ok = !bad.length;
  gate('Y2', `year-on-year: ${n} rates, each exactly (avg_y / avg_y−1 − 1) × 100 at 2dp; `
    + `null at ${nulls.join(', ')} [${ok ? 'ok' : 'FAIL'}]`);
  if (!ok) fail(`a shipped year rate does not recompute: ${bad.slice(0, 5).join('; ')}`);
}

// ── Y3 coverage ───────────────────────────────────────────────────────────
{
  const gaps = years.filter((e, i) => e.y !== firstFullYear + i).map((e) => e.y);
  const expected = asOfYear - firstFullYear + 1;
  const ok = !gaps.length && years.length === expected
    && years[0].y === firstFullYear && years.at(-1).y === asOfYear;
  gate('Y3', `year coverage: ${years.length} entries ${years[0].y} → ${years.at(-1).y}, `
    + `expected ${expected} with no gaps [${ok ? 'ok' : 'FAIL'}]`);
  if (!ok) fail(`the year axis is broken: ${years.length} entries ${years[0].y} → ${years.at(-1).y}, gaps at ${gaps.slice(0, 5).join(', ') || 'none'}`);
}

// ── Y4 size with the year block ───────────────────────────────────────────
{
  const yearsBytes = Buffer.byteLength(JSON.stringify(years));
  const ok = shippedBytes <= 30_000;
  gate('Y4', `size with the year block: ${(shippedBytes / 1000).toFixed(1)} kB, of which the `
    + `${years.length} year entries are ${(yearsBytes / 1000).toFixed(1)} kB, ceiling 30 kB [${ok ? 'ok' : 'FAIL'}]`);
  if (!ok) fail(`the dataset is ${(shippedBytes / 1000).toFixed(1)} kB with the year block, over the 30 kB ceiling`);
}

const path = writeData('economy/rupee-time-machine.json', out);
console.log(`\n  wrote ${path}`);
console.log(`  ${months.length} months, ${SPINE_START} → ${asof}, `
  + `full-span multiplier ${(at(asof) / at(SPINE_START)).toFixed(2)}\n`);

await end();
