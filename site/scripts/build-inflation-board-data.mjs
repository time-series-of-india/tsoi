// Dataset for the Inflation explore board (/economy/explore/inflation): five
// desks — the headline, what moved it, inside the basket, state by state, and
// the new basket. Contract and methodology: docs/explore-inflation-board-spec.md.
//
// The board's one rule, which every block below is arranged around: MoSPI's
// published numbers pass through untouched. Index levels and year-on-year rates
// are emitted exactly as the ministry published them. The only arithmetic TSOI
// does here is the contribution decomposition, and the year-ago index levels it
// needs are backed out inside lib/inflation-contrib.mjs and never surface in
// the output as if they were published.
//
// Seven gates fail the build. They are numbered as the spec numbers them, and
// each one prints the number it measured, not just a verdict — a gate that only
// says "ok" is a gate nobody can audit:
//
//   1  Σw per sector ∈ [99.99, 100.01] for BOTH baskets (2012 and 2024);
//      12 divisions per sector per month
//   2  |Σ contrib − published GEN inflation| ≤ 0.02 pp, every month, and the
//      shipped bars reconcile to gen + residual exactly
//   3  |Σ(w·idx)/Σw − published GEN index| ≤ 0.05 points, every month, every sector
//   4  every CPI state name resolves to exactly one map region
//   5  the spine's own five seam gates (lib/inflation-spine.mjs)
//   6  the modern headline is unbroken monthly from 2025-01 to asOf
//   7  the pyramid's weights roll up to each parent within 0.01, the tree has
//      the node counts the read's funnel has, and every imputed row in the
//      slice arrives flagged
//   9  the index series is headline.modern's own column where the two overlap,
//      every published state rate is reproduced from those levels within the
//      rounding they carry, and the month axis is unbroken
//   H1 every decade average recomputes from the shipped spine points
//   H2 the targeting-era window adds up and names the true last breach
//   H3 the spine's peak is the published 34.68% of September 1974
//   S1 one shard per item code the COICOP series prices
//   S2 five random shards × three random cells, byte-equal to the DB
//   S3 every shard hangs on the same month axis, and the rate axis is its tail
//   S4 every shard carries an All-India row
//   S5 no shard exceeds 30 kB
//   S6 the main dataset stays under its 1,450 kB ceiling
//
// Usage: SCHEMA_NAME=economy_dev node scripts/build-inflation-board-data.mjs
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SCHEMA, SITE, connect, writeData } from './lib/db.mjs';
import { buildSpine, buildEras, spineSources } from './lib/inflation-spine.mjs';
import { divisionContributions, reconstructIndex, round } from './lib/inflation-contrib.mjs';
import { bandNote, bandStats, bandStatsNote, checkEvent, decadeMeans,
  nextPrint as nextPrintFor, overlapNote, rebaseOverlap }
  from './lib/inflation-board-blocks.mjs';

const fail = (msg) => {
  console.error(`\n  FAIL: ${msg}\n`);
  process.exitCode = 1;
  throw new Error(msg);
};

/* A division row in the COICOP table is a two-character code with nothing below
   it filled in. The codes run 01..13 with NO 12 — insurance and financial
   services sits outside India's CPI — so twelve is the count everywhere, and
   the gates check the count rather than trusting the enumeration. */
const DIVISION_ROW = `length(code) = 2 AND class_name IS NULL AND group_name IS NULL`;
const HEAD_OR_DIVISION = `(code = 'GEN' OR (${DIVISION_ROW}))`;
const EXPECTED_DIVISIONS = 12;
const MODERN_START = '2025-01'; // the 2024 base's first published month
/* Decimals on a shipped contribution. Also the precision the residual is
   computed at — see the note in lib/inflation-contrib.mjs about why the
   rounding has to happen before the sum and not after it. */
const CONTRIB_DP = 4;

const SECTORS = ['Combined', 'Rural', 'Urban'];
const sectorKey = (s) => s.toLowerCase();

const { q, end } = await connect();
const gate = (n, msg) => console.log(`  gate ${n}  ${msg}`);

// ── asOf ──────────────────────────────────────────────────────────────────
const [{ asof }] = await q(`
  SELECT to_char(max(date), 'YYYY-MM-DD') AS asof
  FROM ${SCHEMA}.mospi_cpi_coicop
  WHERE state = 'All India' AND sector = 'Combined' AND index_value IS NOT NULL`);
if (!asof) fail(`${SCHEMA}.mospi_cpi_coicop has no All-India Combined index — run etl/mospi first`);
const asOfMonth = asof.slice(0, 7);
console.log(`\n  inflation board: asOf ${asof} (schema ${SCHEMA})`);

// ── Weights: the coicop2018 division table, both baskets, all three sectors ──
// Weights are keyed by division NAME in mospi_cpi_weights and by code in the
// COICOP series, so the two are joined on the name and the join is asserted:
// a renamed division would otherwise drop a weight silently and every
// contribution in that sector would be quietly wrong.
const weightRows = await q(`
  SELECT series, sector, category AS name, weight::float AS weight
  FROM ${SCHEMA}.mospi_cpi_weights
  WHERE structure = 'coicop2018' AND level = 'division'`);

const divisionRows = await q(`
  SELECT DISTINCT code, division AS name
  FROM ${SCHEMA}.mospi_cpi_coicop
  WHERE ${DIVISION_ROW}
  ORDER BY code`);
const codeOfName = new Map(divisionRows.map((r) => [r.name, r.code]));
const nameOfCode = new Map(divisionRows.map((r) => [r.code, r.name]));
if (divisionRows.length !== EXPECTED_DIVISIONS) {
  fail(`the COICOP series carries ${divisionRows.length} divisions, expected ${EXPECTED_DIVISIONS} (01..13, no 12)`);
}

// sector -> series -> code -> weight
const weights = {};
const unjoined = [];
for (const r of weightRows) {
  const code = codeOfName.get(r.name);
  if (!code) { unjoined.push(`${r.sector}/${r.series}: "${r.name}"`); continue; }
  ((weights[r.sector] ??= {})[r.series] ??= {})[code] = r.weight;
}
if (unjoined.length) {
  fail(`weight rows name divisions the COICOP series does not have: ${unjoined.join('; ')}`);
}

// ── Gate 1: Σw per sector, and the division count ─────────────────────────
// Both baskets, not only the live one. The 2012 column is what the rebase desk
// draws its left-hand side from, and a hole in it would show up there as a
// division that apparently weighed nothing in 2012 rather than as a build error.
const weightSums = {};
for (const series of [2024, 2012]) {
  for (const sector of SECTORS) {
    const w = weights[sectorKey(sector)]?.[series];
    if (!w) fail(`no ${series} coicop2018 division weights for sector ${sector}`);
    const codes = Object.keys(w);
    if (codes.length !== EXPECTED_DIVISIONS) {
      fail(`sector ${sector}, ${series} basket has ${codes.length} division weights, expected ${EXPECTED_DIVISIONS}`);
    }
    const sum = codes.reduce((a, c) => a + w[c], 0);
    if (series === 2024) weightSums[sectorKey(sector)] = +sum.toFixed(4);
    gate(1, `Σw ${series} ${sector}: ${sum.toFixed(4)} over ${codes.length} divisions [${sum >= 99.99 && sum <= 100.01 ? 'ok' : 'FAIL'}]`);
    if (sum < 99.99 || sum > 100.01) {
      fail(`sector ${sector}, ${series} basket sums to ${sum.toFixed(4)}, outside [99.99, 100.01]`);
    }
  }
}
// The number every weighted denominator uses. 99.999, not 100 — see the spec's
// methodology note and lib/inflation-contrib.mjs.
const weightSum = weightSums.combined;

// ── The All-India series: GEN and the twelve divisions, all sectors ────────
const aiRows = await q(`
  SELECT to_char(date, 'YYYY-MM') AS m, sector, code, division AS name,
         index_value::float AS idx, inflation::float AS infl, imputation
  FROM ${SCHEMA}.mospi_cpi_coicop
  WHERE state = 'All India' AND ${HEAD_OR_DIVISION} AND index_value IS NOT NULL
  ORDER BY date, sector, code`);

// month -> sector -> code -> row
const ai = new Map();
for (const r of aiRows) {
  const bym = ai.get(r.m) ?? ai.set(r.m, new Map()).get(r.m);
  const bys = bym.get(r.sector) ?? bym.set(r.sector, new Map()).get(r.sector);
  bys.set(r.code, r);
}
const aiMonths = [...ai.keys()].sort();

// division count per sector per month — the second half of gate 1
{
  const bad = [];
  for (const m of aiMonths) {
    for (const sector of SECTORS) {
      const n = [...(ai.get(m).get(sector)?.keys() ?? [])].filter((c) => c !== 'GEN').length;
      if (n !== EXPECTED_DIVISIONS) bad.push(`${m}/${sector}=${n}`);
    }
  }
  gate(1, `division rows per sector per month: ${EXPECTED_DIVISIONS} across ${aiMonths.length} months × ${SECTORS.length} sectors [${bad.length ? 'FAIL' : 'ok'}]`);
  if (bad.length) fail(`months missing divisions: ${bad.slice(0, 10).join(', ')}${bad.length > 10 ? ` … (+${bad.length - 10})` : ''}`);
}

// ── headline.modern: the 2024-base window, per sector ─────────────────────
// Published index and published rate, both untouched. `infl` is null before
// 2026-01 because the base's first year-on-year could not print until the
// series had twelve months behind it; nothing is synthesised into that gap.
const modern = {};
for (const sector of SECTORS) {
  modern[sectorKey(sector)] = aiMonths
    .filter((m) => m >= MODERN_START)
    .map((m) => {
      const r = ai.get(m).get(sector)?.get('GEN');
      if (!r) fail(`no All-India ${sector} General row for ${m}`);
      return { date: m, idx: r.idx, infl: r.infl ?? null };
    });
}

// ── Gate 6: the modern series is unbroken, monthly, MODERN_START → asOf ────
{
  const step = (m) => +m.slice(0, 4) * 12 + (+m.slice(5) - 1);
  for (const sector of SECTORS) {
    const rows = modern[sectorKey(sector)];
    if (!rows.length) fail(`sector ${sector} has no modern headline months`);
    if (rows[0].date !== MODERN_START) fail(`${sector} modern series starts ${rows[0].date}, expected ${MODERN_START}`);
    if (rows.at(-1).date !== asOfMonth) fail(`${sector} modern series ends ${rows.at(-1).date}, expected ${asOfMonth}`);
    for (let i = 1; i < rows.length; i++) {
      if (step(rows[i].date) !== step(rows[i - 1].date) + 1) {
        fail(`${sector} modern series jumps ${rows[i - 1].date} → ${rows[i].date}`);
      }
    }
    const nulls = rows.filter((r) => r.idx == null).length;
    if (nulls) fail(`${sector} modern series has ${nulls} months without a published index`);
  }
  const n = modern.combined.length;
  gate(6, `modern headline: ${MODERN_START} → ${asOfMonth}, ${n} unbroken months × ${SECTORS.length} sectors, ${modern.combined.filter((r) => r.infl != null).length} with a published rate [ok]`);
}

// ── Gate 3: reconstruction, every month, every sector ─────────────────────
// Σ(w·idx)/Σw against the published General index. This is a check, never an
// output: where the two differ, the published number is the one that ships.
{
  let worst = 0; let worstAt = '';
  let checks = 0;
  for (const m of aiMonths) {
    for (const sector of SECTORS) {
      const rows = ai.get(m).get(sector);
      const gen = rows?.get('GEN');
      if (!gen || gen.idx == null) continue;
      const w = weights[sectorKey(sector)][2024];
      const divisions = [...rows.values()].filter((r) => r.code !== 'GEN')
        .map((r) => ({ weight: w[r.code], idx: r.idx }));
      if (divisions.length !== EXPECTED_DIVISIONS || divisions.some((d) => d.weight == null)) {
        fail(`${m}/${sector}: cannot reconstruct, ${divisions.length} divisions and ${divisions.filter((d) => d.weight == null).length} missing weights`);
      }
      const recon = reconstructIndex({ divisions, weightSum: weightSums[sectorKey(sector)] });
      const err = Math.abs(recon - gen.idx);
      checks++;
      if (err > worst) { worst = err; worstAt = `${m}/${sector}`; }
    }
  }
  gate(3, `reconstruction: worst |Σ(w·idx)/Σw − published GEN idx| = ${worst.toFixed(4)} points at ${worstAt}, over ${checks} month×sector checks, limit 0.05 [${worst <= 0.05 ? 'ok' : 'FAIL'}]`);
  if (worst > 0.05) fail(`reconstruction misses the published General index by ${worst.toFixed(4)} points at ${worstAt}`);
}

// ── contribution: what moved the headline, Combined ───────────────────────
// Coverage is the months where division-level inflation is published, which is
// 2026-01 onward — the 2024 base's first full year-on-year. 2025 is left empty
// rather than synthesised; the desk copy says so.
//
// One sector, Combined. The board's sector toggle does not reach this desk (its
// info text says as much), because the contract carries one division list per
// month with no sector dimension.
const contribMonths = [];
const dropped = [];
{
  let worst = 0; let worstAt = '';
  for (const m of aiMonths) {
    const rows = ai.get(m).get('Combined');
    const gen = rows?.get('GEN');
    if (!gen) { dropped.push(`${m} (no All-India Combined General row)`); continue; }
    // 2025's months have no published headline rate: the 2024 base had no
    // twelve-months-earlier reading to compute one against yet. Expected, and
    // still named, so the log distinguishes "not yet" from "went missing".
    if (gen.infl == null) { dropped.push(`${m} (no published headline rate)`); continue; }
    const divisions = [...rows.values()]
      .filter((r) => r.code !== 'GEN')
      .sort((a, b) => (a.code < b.code ? -1 : 1));
    // A month where only some divisions have a published rate is not a month
    // this desk can draw: the bars would silently stop summing to the headline.
    // Named when dropped — a month vanishing from the chart with no line in the
    // build log is the kind of absence nobody goes looking for.
    const rateless = divisions.filter((r) => r.infl == null);
    if (rateless.length) {
      dropped.push(`${m} (no published rate for ${rateless.map((r) => r.code).join(', ')})`);
      continue;
    }
    const w = weights.combined[2024];
    // `decimals: CONTRIB_DP` rounds inside the arithmetic, so the residual is
    // the gap left by the numbers that actually ship: a reader adding up the
    // twelve bars on screen lands on gen + residual exactly.
    const { divisions: out, residual } = divisionContributions({
      gen: { idx: gen.idx, infl: gen.infl },
      divisions: divisions.map((r) => ({
        code: r.code, name: r.name, weight: w[r.code], idx: r.idx, infl: r.infl,
      })),
      weightSum,
      decimals: CONTRIB_DP,
    });
    if (Math.abs(residual) > worst) { worst = Math.abs(residual); worstAt = m; }
    // The stack must reconcile to the disclosed residual with no slack at all,
    // or the footer sentence is arithmetic the chart does not support.
    const stack = round(out.reduce((a, d) => a + d.contrib, 0), CONTRIB_DP);
    if (stack !== round(gen.infl + residual, CONTRIB_DP)) {
      fail(`${m}: the shipped bars sum to ${stack}, but gen + residual is ${round(gen.infl + residual, CONTRIB_DP)}`);
    }
    contribMonths.push({
      date: m,
      gen: gen.infl, // published, never recomputed
      residual,
      divisions: out.map((d) => ({
        code: d.code,
        name: d.name,
        weight: d.weight,
        infl: d.infl, // published, never recomputed
        contrib: d.contrib,
      })),
    });
  }
  if (!contribMonths.length) fail('no month has a published year-on-year for all twelve divisions');
  if (dropped.length) {
    console.log(`  contribution: ${dropped.length} of ${aiMonths.length} months carry no decomposition —`);
    for (const d of dropped) console.log(`      ${d}`);
  }
  gate(2, `contribution: worst |Σ contrib − published GEN| = ${worst.toFixed(4)} pp at ${worstAt}, over ${contribMonths.length} months (${contribMonths[0].date} → ${contribMonths.at(-1).date}), limit 0.02 [${worst <= 0.02 ? 'ok' : 'FAIL'}]`);
  if (worst > 0.02) fail(`division contributions miss the published headline by ${worst.toFixed(4)} pp at ${worstAt}`);
}

// ── headline.spine: the long line, through its own five gates (gate 5) ────
// The spine numbers its own five gates 1..5; renumbered 5.1..5.5 on the way to
// the console so this build's report has one unambiguous numbering.
const spineBuild = await buildSpine({
  q, schema: SCHEMA, log: (m) => console.log(m.replace(/^(\s*)gate (\d)/, '$1gate 5.$2')),
});
const spineEras = buildEras({ points: spineBuild.points, first: spineBuild.first, last: spineBuild.last });
gate(5, `spine: ${spineBuild.points.length} months ${spineBuild.first} → ${spineBuild.last}, ${spineBuild.seams.length} seams, `
  + `${spineBuild.limitedCollection.length} months computed from published indices, all spine gates passed [ok]`);

const spine = {
  points: spineBuild.points.map((p) => ({ date: p.ym, infl: p.yoy })),
  eras: spineEras,
  // Renamed from `interpolated` on 2026-08-01: these months are computed from
  // MoSPI's published limited-collection indices, not interpolated. The old key
  // is deliberately NOT kept as an alias — a consumer still reading
  // `interpolated` should see nothing rather than be told a falsehood.
  limitedCollection: spineBuild.limitedCollection,
  limitedCollectionDetail: spineBuild.limitedCollectionDetail,
  limitedCollectionNote: spineBuild.limitedCollectionNote,
  quantization: spineBuild.quantization,
  quantizationNote: spineBuild.quantizationNote,
  seams: spineBuild.seams,
  segments: spineBuild.segments,
  linkingFactors: spineBuild.linkingFactors,
};

// ── band: the inflation target every CPI print is read against ────────────
// Four per cent with a tolerance of two either side, in force since the
// monetary policy framework agreement took effect in August 2016. The dataset
// carries the four numbers and the one sentence they support; the charts read
// the numbers and the desk foot prints the sentence, so neither is typed into
// a spec. The band makes no other claim: what the target IS is a fact about
// policy, why it was missed is not something this series can say.
const band = { lo: 2, hi: 6, mid: 4, from: '2016-08' };
band.note = bandNote(band);

// ── the long run's own record: decade averages and the targeting era ──────
// Both are derived arithmetic over published prints, and both say so where
// they are drawn. The decade bars average the monthly rates inside each decade
// of the line; the band stats count how many months since August 2016 landed
// inside the tolerance range and when the rate last left it.
const spinePoints = spine.points.map((p) => ({ date: p.date, infl: p.infl }));
const decades = decadeMeans(spinePoints);
band.stats = bandStats(spinePoints, band);
band.stats.note = bandStatsNote(band.stats, band);

// ── Gate H1: every decade mean recomputes from the spine block ────────────
// Recomputed here from the SHIPPED points rather than from the builder's own
// intermediate, so a row-selection bug — a decade boundary off by a month, a
// bucket that swallowed a neighbour — cannot pass. Compared at the rounding the
// bars are drawn at, so this is not a float-noise test.
{
  const byDecade = new Map();
  for (const p of spine.points) {
    const k = `${p.date.slice(0, 3)}0s`;
    const b = byDecade.get(k) ?? byDecade.set(k, []).get(k);
    b.push(p.infl);
  }
  const bad = [];
  for (const d of decades) {
    const vals = byDecade.get(d.decade) ?? [];
    const mean = +(vals.reduce((a, v) => a + v, 0) / vals.length).toFixed(1);
    if (mean !== d.infl_pct) bad.push(`${d.decade}: shipped ${d.infl_pct}, recomputed ${mean} over ${vals.length} months`);
  }
  const counted = decades.reduce((a, d) => a + (byDecade.get(d.decade)?.length ?? 0), 0);
  gate('H1', `decades: ${decades.length} bars (${decades[0].decade}→${decades.at(-1).decade}) over `
    + `${counted} of ${spine.points.length} spine months, ${bad.length} disagree on recompute [${bad.length ? 'FAIL' : 'ok'}]`);
  if (bad.length) fail(`decade means do not recompute: ${bad.join('; ')}`);
  if (counted !== spine.points.length) fail(`the decade buckets hold ${counted} of ${spine.points.length} spine months`);
  console.log(`      ${decades.map((d) => `${d.decade} ${d.infl_pct}%`).join(' · ')}`);
}

// ── Gate H2: the band window adds up, and the breach is the last one ──────
{
  const s = band.stats;
  if (s.inside + s.outside !== s.total) {
    fail(`band stats: ${s.inside} inside + ${s.outside} outside is not ${s.total} months`);
  }
  const window = spine.points.filter((p) => p.date >= band.from);
  const out = window.filter((p) => p.infl < band.lo || p.infl > band.hi);
  const lastOut = out.at(-1);
  const agree = window.length === s.total
    && window.length - out.length === s.inside
    && lastOut?.date === s.lastBreach?.month
    && lastOut?.infl === s.lastBreach?.infl_pct;
  gate('H2', `band window: ${s.inside} of ${s.total} months inside ${band.lo}–${band.hi}% since ${band.from}, `
    + `last outside ${s.lastBreach?.month ?? 'never'} at ${s.lastBreach?.infl_pct ?? '—'}%, `
    + `${s.elapsed} months ago [${agree ? 'ok' : 'FAIL'}]`);
  if (!agree) {
    fail(`band stats do not recompute from the spine: independently ${window.length - out.length} of `
      + `${window.length} inside, last outside ${lastOut?.date} at ${lastOut?.infl}`);
  }
}

// ── Gate H3: the peak the long-run desk will print ────────────────────────
// The one hard-coded number in this file, and it is an assertion rather than an
// output: September 1974 at 34.68% is the highest month the spine has ever
// carried, and a build that produces a different peak has changed the line
// under a desk whose whole first tile is that figure.
{
  const PEAK = { date: '1974-09', infl: 34.68 };
  const top = spine.points.reduce((a, p) => (p.infl > a.infl ? p : a));
  const ok = top.date === PEAK.date && top.infl === PEAK.infl;
  gate('H3', `spine peak: ${top.infl}% in ${top.date}, expected ${PEAK.infl}% in ${PEAK.date} [${ok ? 'ok' : 'FAIL'}]`);
  if (!ok) fail(`the spine's peak is ${top.infl}% in ${top.date}, not the published ${PEAK.infl}% in ${PEAK.date}`);
}

// ── nextPrint: when the month after this one is expected ──────────────────
// Derived from asOf at build time, so the sentence can never name a date that
// has already passed. See lib/inflation-board-blocks.mjs for the reasoning.
const nextPrint = nextPrintFor(asOfMonth);

// ── Gate E (part): the band's start month exists on the spine axis ────────
// The long line clips the band at this month; a month the axis does not have
// would clip it to nothing and the band would silently vanish from the chart
// rather than fail here.
{
  const onAxis = spine.points.some((p) => p.date === band.from);
  gate('E', `band: ${band.mid}% ± ${band.hi - band.mid} from ${band.from}, on the spine axis [${onAxis ? 'ok' : 'FAIL'}]`);
  if (!onAxis) fail(`band.from ${band.from} is not a month on the spine axis`);
  gate('E', `next print: ${nextPrint.month} expected around ${nextPrint.due} [ok]`);
}

// ── pyramid: the read's funnel, same queries, same shape ──────────────────
// Lifted from build-read-inflation.mjs so the board's desk 3 and the read's
// beat 7 mount the same widget on the same slice. Weights come from
// mospi_cpi_item_weights (Annexure 5.3d); MoSPI publishes weights at division,
// group and item level only, so class and sub-class are sums of member item
// weights, which is what they are.
const pyramid = await (async () => {
  const lc = (await q(`
    SELECT
      count(DISTINCT division) FILTER (WHERE division <> 'CPI (General)') AS divisions,
      count(DISTINCT (division, group_name)) FILTER (WHERE group_name <> '' AND (class_name IS NULL OR class_name = '')) AS groups,
      count(DISTINCT (division, group_name, class_name)) FILTER (WHERE class_name <> '' AND (sub_class IS NULL OR sub_class = '')) AS classes,
      count(DISTINCT (division, group_name, class_name, sub_class)) FILTER (WHERE sub_class <> '' AND (item IS NULL OR item = '')) AS subclasses,
      count(DISTINCT item) FILTER (WHERE item <> '') AS items
    FROM ${SCHEMA}.mospi_cpi_coicop
    WHERE state = 'All India' AND sector = 'Combined' AND date = $1`, [asof]))[0];

  const pathRaw = await q(`
    SELECT code, division, group_name, class_name, sub_class, item,
           index_value::float AS idx, inflation::float AS infl, imputation
    FROM ${SCHEMA}.mospi_cpi_coicop
    WHERE state = 'All India' AND sector = 'Combined' AND date = $1
      AND code IN ('GEN', '01', '01.1', '01.1.7', '01.1.7.2', '01.1.7.2.1.01')`, [asof]);
  const byCode = Object.fromEntries(pathRaw.map((r) => [r.code, r]));

  /* Every code MoSPI marked imputed in this month's All-India Combined slice.
     None of the 358 items is marked today, which is exactly why this is worth
     carrying: a flag that has never fired is a flag nobody notices is missing.
     The assertion below refuses to ship a tree that has dropped one. */
  const imputedCodes = new Set((await q(`
    SELECT code FROM ${SCHEMA}.mospi_cpi_coicop
    WHERE state = 'All India' AND sector = 'Combined' AND date = $1
      AND imputation = 'Y'`, [asof])).map((r) => r.code));

  const tomatoW = await q(`
    SELECT weight::float AS w FROM ${SCHEMA}.mospi_cpi_weights
    WHERE structure = 'coicop2018' AND series = 2024 AND sector = 'combined'
      AND level = 'item' AND category = 'Tomato'`);

  // Every node of the tree: code, parent, level, name, weight, index, YoY.
  // The join is on `code`, which both sides carry natively.
  const treeRaw = await q(`
    WITH w AS (
      SELECT item_code AS code, NULL::text AS parent, 'item' AS level,
             min(item) AS name, sum(share_all_india)::float AS weight
        FROM ${SCHEMA}.mospi_cpi_item_weights GROUP BY 1
      UNION ALL
      SELECT sub_class_code, min(class_code), 'subclass', min(sub_class), sum(share_all_india)::float
        FROM ${SCHEMA}.mospi_cpi_item_weights GROUP BY 1
      UNION ALL
      SELECT class_code, min(group_code), 'class', min(class_name), sum(share_all_india)::float
        FROM ${SCHEMA}.mospi_cpi_item_weights GROUP BY 1
      UNION ALL
      SELECT group_code, min(division_code), 'group', min(group_name), sum(share_all_india)::float
        FROM ${SCHEMA}.mospi_cpi_item_weights GROUP BY 1
      UNION ALL
      SELECT division_code, 'GEN', 'division', min(division), sum(share_all_india)::float
        FROM ${SCHEMA}.mospi_cpi_item_weights GROUP BY 1
    ),
    ip AS (SELECT DISTINCT item_code, sub_class_code FROM ${SCHEMA}.mospi_cpi_item_weights)
    SELECT w.code, COALESCE(w.parent, ip.sub_class_code) AS parent, w.level, w.name,
           round(w.weight::numeric, 4)::float AS weight,
           c.index_value::float AS idx, c.inflation::float AS infl, c.imputation
      FROM w
      LEFT JOIN ip ON ip.item_code = w.code AND w.level = 'item'
      LEFT JOIN ${SCHEMA}.mospi_cpi_coicop c
        ON c.code = w.code AND c.state = 'All India' AND c.sector = 'Combined'
       AND c.date = $1
     ORDER BY w.level, w.code`, [asof]);

  const gen = byCode.GEN;
  if (!gen) fail(`no All-India Combined General row for ${asof}`);
  /* `imputed` is present only when true. The funnel is 668 nodes and a false on
     every one of them is 8 kB of the word "false"; the widget reads a missing
     key the same way it reads false. */
  const imputedOf = (r) => (r.imputation === 'Y' ? { imputed: true } : {});
  const tree = [
    { code: 'GEN', parent: null, level: 'general', name: 'the headline',
      weight: 100, idx: gen.idx, infl: gen.infl, ...imputedOf(gen) },
    ...treeRaw.map((r) => ({
      code: r.code, parent: r.parent, level: r.level, name: r.name,
      weight: r.weight, idx: r.idx, infl: r.infl, ...imputedOf(r),
    })),
  ];

  // Gate 7c: every code MoSPI imputed in this slice that the tree carries must
  // arrive flagged. A funnel that quietly drops the marker is a funnel showing
  // an estimate as an observation.
  const treeCodes = new Set(tree.map((n) => n.code));
  const shouldFlag = [...imputedCodes].filter((c) => treeCodes.has(c)).sort();
  const flagged = tree.filter((n) => n.imputed).map((n) => n.code).sort();
  gate(7, `pyramid imputation: ${imputedCodes.size} imputed rows in the ${asOfMonth} slice, `
    + `${shouldFlag.length} of them in the tree, ${flagged.length} flagged `
    + `[${shouldFlag.join(',') === flagged.join(',') ? 'ok' : 'FAIL'}]`);
  if (shouldFlag.join(',') !== flagged.join(',')) {
    fail(`pyramid imputation flags do not match the source: expected [${shouldFlag.join(', ')}], `
      + `tree carries [${flagged.join(', ')}]`);
  }

  const codes = new Set(tree.map((n) => n.code));
  const orphans = tree.filter((n) => n.parent && !codes.has(n.parent));
  const unpriced = tree.filter((n) => n.idx == null);
  if (orphans.length || unpriced.length) {
    fail(`pyramid tree broken: ${orphans.length} orphaned nodes `
      + `(${orphans.slice(0, 3).map((n) => n.code).join(', ')}), `
      + `${unpriced.length} without an index (${unpriced.slice(0, 3).map((n) => n.code).join(', ')})`);
  }

  const levels = [
    { key: 'general', label: 'the headline', n: 1 },
    { key: 'division', label: 'divisions', n: +lc.divisions },
    { key: 'group', label: 'groups', n: +lc.groups },
    { key: 'class', label: 'classes', n: +lc.classes },
    { key: 'subclass', label: 'sub-classes', n: +lc.subclasses },
    { key: 'item', label: 'items', n: +lc.items },
  ];

  return {
    asOf: asOfMonth,
    levels,
    tree,
    path: [
      { level: 'Item', name: 'Tomato', infl: byCode['01.1.7.2.1.01'].infl, idx: byCode['01.1.7.2.1.01'].idx, w: tomatoW[0]?.w },
      { level: 'Sub-class', name: byCode['01.1.7.2'].sub_class, infl: byCode['01.1.7.2'].infl, idx: byCode['01.1.7.2'].idx },
      { level: 'Class', name: byCode['01.1.7'].class_name, infl: byCode['01.1.7'].infl, idx: byCode['01.1.7'].idx },
      { level: 'Group', name: byCode['01.1'].group_name, infl: byCode['01.1'].infl, idx: byCode['01.1'].idx },
      { level: 'Division', name: byCode['01'].division, infl: byCode['01'].infl, idx: byCode['01'].idx, w: weights.combined[2024]['01'] },
      { level: 'General', name: 'the headline', infl: byCode.GEN.infl, idx: byCode.GEN.idx },
    ],
    // How the two sectors make one number: an item's combined weight is its
    // rural share plus its urban share of the same national hundred, so the
    // blend is already inside every weight rather than being a step at the top.
    sectors: Object.fromEntries((await q(`
      SELECT sector, round(sum(share_all_india)::numeric, 2)::float AS w
        FROM ${SCHEMA}.mospi_cpi_item_weights GROUP BY 1`)).map((r) => [r.sector.toLowerCase(), r.w])),
  };
})();

// ── Gate 7: the pyramid's weights and its shape ───────────────────────────
{
  // (a) every parent's weight equals the sum of its children's, within 0.01
  const kids = new Map();
  for (const n of pyramid.tree) {
    if (!n.parent) continue;
    kids.set(n.parent, (kids.get(n.parent) ?? []).concat(n));
  }
  let worst = 0; let worstAt = '';
  let checks = 0;
  for (const parent of pyramid.tree) {
    const cs = kids.get(parent.code);
    if (!cs?.length) continue;
    const sum = cs.reduce((a, c) => a + c.weight, 0);
    const err = Math.abs(sum - parent.weight);
    checks++;
    if (err > worst) { worst = err; worstAt = `${parent.code} (${parent.level})`; }
  }
  gate(7, `pyramid rollup: worst |Σ children − parent| = ${worst.toFixed(5)} over ${checks} parents, limit 0.01 [${worst <= 0.01 ? 'ok' : 'FAIL'}]`);
  if (worst > 0.01) fail(`pyramid weights do not roll up: ${worstAt} is off by ${worst.toFixed(5)}`);

  // (b) the tree has the read's shape
  const EXPECTED_LEVELS = { general: 1, division: 12, group: 43, class: 92, subclass: 162, item: 358 };
  const counted = {};
  for (const n of pyramid.tree) counted[n.level] = (counted[n.level] ?? 0) + 1;
  const shape = Object.keys(EXPECTED_LEVELS).map((k) => counted[k] ?? 0);
  const declared = pyramid.levels.map((l) => l.n);
  const want = Object.values(EXPECTED_LEVELS);
  const ok = shape.join('/') === want.join('/') && declared.join('/') === want.join('/');
  gate(7, `pyramid shape: tree ${shape.join('/')}, levels ${declared.join('/')}, expected ${want.join('/')} [${ok ? 'ok' : 'FAIL'}]`);
  if (!ok) {
    fail(`pyramid node counts are ${shape.join('/')} (levels declare ${declared.join('/')}), `
      + `expected ${want.join('/')} — the funnel and the read's would disagree`);
  }
}

// ── map: state by state ───────────────────────────────────────────────────
// The join key is the map feature name, upper-case, as india_states.json spells
// it — the convention build-dashboard-data.mjs already uses for the
// choropleth (see the spec note in the report: there is no
// LGD code anywhere in this database; `state_code` is MoSPI's own serial, which
// is NOT an LGD code and must never be presented as one).
const MAP_FILE = resolve(SITE, 'public/maps/india_states.json');
const mapJson = JSON.parse(readFileSync(MAP_FILE, 'utf8'));
const mapRegions = new Set(mapJson.features.map((f) => f.properties.name));
// Carried into the sources line rather than retyped: the geometry file states
// its own provenance, including the boundary position it depicts.
const MAP_ATTRIBUTION = mapJson.attribution ?? 'india_states.json (no attribution recorded)';

/* Three names the generic rule cannot reach. Everything else is the same
   upper-case, ampersand-joined transform the payments and food boards apply. */
const REGION_OVERRIDE = {
  'Andaman And Nicobar Islands': 'ANDAMAN & NICOBAR',
  'NCT of Delhi': 'DELHI',
  'The Dadra And Nagar Haveli And Daman And Diu': 'DADRA & NAGAR HAVELI & DAMAN & DIU',
};
const toRegion = (state) => REGION_OVERRIDE[state] ?? state.toUpperCase().replace(/ AND /g, ' & ');

const mapRows = await q(`
  SELECT to_char(date, 'YYYY-MM') AS m, state, sector, code,
         inflation::float AS infl, imputation
  FROM ${SCHEMA}.mospi_cpi_coicop
  WHERE state <> 'All India' AND ${HEAD_OR_DIVISION} AND inflation IS NOT NULL
  ORDER BY date, code, sector, state`);
if (!mapRows.length) fail('no state-level published inflation in the COICOP series');

// ── Gate 4: every CPI state name resolves to exactly one map region ────────
{
  const states = [...new Set(mapRows.map((r) => r.state))].sort();
  const unmatched = states.filter((s) => !mapRegions.has(toRegion(s)));
  const collisions = [];
  const seen = new Map();
  for (const s of states) {
    const r = toRegion(s);
    if (seen.has(r)) collisions.push(`${seen.get(r)} and ${s} both → ${r}`);
    seen.set(r, s);
  }
  gate(4, `map join: ${states.length} CPI states → ${seen.size} map regions of ${mapRegions.size}, `
    + `${unmatched.length} unmatched, ${collisions.length} collisions, All India excluded [${unmatched.length || collisions.length ? 'FAIL' : 'ok'}]`);
  if (unmatched.length) fail(`CPI state names with no map region: ${unmatched.join(', ')}`);
  if (collisions.length) fail(`two CPI state names collide on one map region: ${collisions.join('; ')}`);
  if (mapRows.some((r) => r.state === 'All India')) fail('All-India rows leaked into the map values');
}

const map = {
  codes: [
    { code: 'GEN', name: 'CPI (General)' },
    ...divisionRows.map((r) => ({ code: r.code, name: r.name })),
  ],
  months: [...new Set(mapRows.map((r) => r.m))].sort(),
  values: mapRows.map((r) => ({
    date: r.m,
    code: r.code,
    state: r.state,
    region: toRegion(r.state),
    sector: r.sector,
    infl: r.infl, // published, never recomputed
    /* Present only when true, the same convention the pyramid tree uses and for
       the same reason: `"imputed":false` on 8,346 readings is 142 kB of the
       word false, and every consumer reads a missing key the way it reads one.
       The flag appears the moment MoSPI marks a state total, which it has not
       yet — imputation is flagged on individual items, several floors below. */
    ...(r.imputation === 'Y' ? { imputed: true } : {}),
  })),
};

// ── series: the index itself, through time, everywhere it is published ────
// The map above carries one month at a time and only the rate. Two desks need
// the LEVEL through time instead: the basket desk plots divisions against each
// other, and the state desk plots whichever state the reader clicks. Both read
// this one block.
//
// Levels only, deliberately. The year-on-year for these same cells is already
// in `map.values` (states) and `headline.modern` (All India), so shipping it a
// second time here would put the same published number in two places and invite
// them to drift; the client joins the two when a panel wants both.
//
// Keyed `state|sector|code` against a shared month axis rather than emitted as
// rows: at 13 codes × 3 sectors × 37 states × 18 months the row form is most of
// a megabyte of repeated field names.
const seriesRows = await q(`
  SELECT to_char(date, 'YYYY-MM') AS m, state, sector, code,
         index_value::float AS idx
  FROM ${SCHEMA}.mospi_cpi_coicop
  WHERE ${HEAD_OR_DIVISION} AND index_value IS NOT NULL
  ORDER BY date, state, sector, code`);
if (!seriesRows.length) fail('no index levels in the COICOP series');

const seriesMonths = [...new Set(seriesRows.map((r) => r.m))].sort();
const seriesMonthIdx = new Map(seriesMonths.map((m, i) => [m, i]));
const seriesValues = {};
const seriesStates = new Map();
for (const r of seriesRows) {
  const key = `${r.state}|${r.sector}|${r.code}`;
  let arr = seriesValues[key];
  if (!arr) arr = seriesValues[key] = Array(seriesMonths.length).fill(null);
  arr[seriesMonthIdx.get(r.m)] = r.idx;
  /* 'ALL INDIA' is not a map feature and never joins to one: it is here so the
     national series can be keyed the same way as the states that do. */
  if (!seriesStates.has(r.state)) {
    seriesStates.set(r.state, r.state === 'All India' ? 'ALL INDIA' : toRegion(r.state));
  }
}

const series = {
  months: seriesMonths,
  codes: map.codes,
  states: [...seriesStates.entries()].map(([state, region]) => ({ state, region })),
  values: seriesValues,
};

// ── Gate 9: the index series against the two blocks it must agree with ────
{
  // (a) The All-India General series IS headline.modern's index column. Two
  // blocks built by two queries, so this is the one place they can be proved
  // to be the same numbers rather than assumed to be.
  const mismatched = [];
  for (const sector of SECTORS) {
    const mine = seriesValues[`All India|${sector}|GEN`] ?? [];
    const theirs = modern[sectorKey(sector)];
    const from = seriesMonths.indexOf(MODERN_START);
    const slice = mine.slice(from);
    if (slice.length !== theirs.length) {
      mismatched.push(`${sector}: ${slice.length} months here, ${theirs.length} in headline.modern`);
      continue;
    }
    for (let i = 0; i < theirs.length; i++) {
      if (slice[i] !== theirs[i].idx) mismatched.push(`${sector} ${theirs[i].date}: ${slice[i]} vs ${theirs[i].idx}`);
    }
  }
  gate(9, `series vs headline.modern: ${SECTORS.length} sectors × ${modern.combined.length} months compared, `
    + `${mismatched.length} differ [${mismatched.length ? 'FAIL' : 'ok'}]`);
  if (mismatched.length) {
    fail(`the index series and headline.modern disagree: ${mismatched.slice(0, 5).join('; ')}`);
  }

  // (b) Every published rate on the map recomputed from the levels shipped
  // here. The two come from the same source column, but not from the same
  // query or the same arithmetic, so agreement to within the rounding the
  // published index carries is real evidence that a reader switching between
  // the map and the series panel is reading one series and not two.
  //
  // The limit is the rounding, not a tolerance for error: a 2-decimal index on
  // both ends of a ratio, against a 2-decimal rate, bounds the disagreement at
  // about 0.01 pp. 0.05 leaves room for the months published with one decimal
  // and still catches anything that is actually a different number.
  const YOY_LIMIT = 0.05;
  let worst = 0; let worstAt = ''; let checks = 0; let unbacked = 0;
  for (const v of map.values) {
    const key = `${v.state}|${v.sector}|${v.code}`;
    const arr = seriesValues[key];
    const i = seriesMonthIdx.get(v.date);
    const ago = seriesMonthIdx.get(`${+v.date.slice(0, 4) - 1}-${v.date.slice(5)}`);
    if (!arr || i == null || ago == null || arr[i] == null || arr[ago] == null) { unbacked++; continue; }
    const err = Math.abs((arr[i] / arr[ago] - 1) * 100 - v.infl);
    checks++;
    if (err > worst) { worst = err; worstAt = `${v.state}/${v.sector}/${v.code} ${v.date}`; }
  }
  gate(9, `published rate vs the levels shipped here: worst ${worst.toFixed(4)} pp over ${checks} state readings, `
    + `limit ${YOY_LIMIT} [${worst <= YOY_LIMIT && !unbacked ? 'ok' : 'FAIL'}]`);
  if (unbacked) fail(`${unbacked} published state rates have no index level behind them in the series block`);
  if (worst > YOY_LIMIT) fail(`a published rate misses the level arithmetic by ${worst.toFixed(4)} pp at ${worstAt}`);

  // (c) Shape: an unbroken monthly axis, and every key holding one value per
  // month of it (holes included, so a panel never reads a short array).
  const step = (m) => +m.slice(0, 4) * 12 + (+m.slice(5) - 1);
  for (let i = 1; i < seriesMonths.length; i++) {
    if (step(seriesMonths[i]) !== step(seriesMonths[i - 1]) + 1) {
      fail(`the index series jumps ${seriesMonths[i - 1]} → ${seriesMonths[i]}`);
    }
  }
  if (seriesMonths[0] !== MODERN_START || seriesMonths.at(-1) !== asOfMonth) {
    fail(`the index series runs ${seriesMonths[0]} → ${seriesMonths.at(-1)}, expected ${MODERN_START} → ${asOfMonth}`);
  }
  const short = Object.entries(seriesValues).filter(([, a]) => a.length !== seriesMonths.length);
  if (short.length) fail(`${short.length} series are not ${seriesMonths.length} months long (${short[0][0]})`);
  const full = map.codes.length * SECTORS.length * series.states.length;
  const holes = Object.values(seriesValues).reduce((a, arr) => a + arr.filter((v) => v == null).length, 0);
  gate(9, `index series: ${series.states.length} states × ${SECTORS.length} sectors × ${map.codes.length} codes `
    + `× ${seriesMonths.length} months, ${Object.keys(seriesValues).length} of ${full} series present, ${holes} holes [ok]`);
}

// ── items: the 358 priced things, by name, weight, level and rate ─────────
// The tree already ships every item as a NODE (the funnel draws it), but a node
// is one month deep. These three blocks are the same items THROUGH TIME, which
// is what a panel needs to draw one item's line or to rank a month's movers.
//
// Two axes, deliberately different lengths. Levels run the whole 2024 base
// (`series.months`, eighteen months); rates run only from the base's first full
// year-on-year (`items.months`, six). Padding the rates back to the levels'
// axis would put nulls where the reader would read "no change".
const itemWeightRows = await q(`
  SELECT item_code AS code, min(item) AS name, sum(share_all_india)::float AS weight
    FROM ${SCHEMA}.mospi_cpi_item_weights GROUP BY 1 ORDER BY 1`);

const itemRows = await q(`
  SELECT to_char(date, 'YYYY-MM') AS m, code, item AS name,
         index_value::float AS idx, inflation::float AS infl
  FROM ${SCHEMA}.mospi_cpi_coicop
  WHERE state = 'All India' AND sector = 'Combined' AND item IS NOT NULL AND item <> ''
    AND index_value IS NOT NULL
  ORDER BY code, date`);
if (!itemRows.length) fail('no All-India Combined item rows in the COICOP series');

const itemMonths = [...new Set(itemRows.filter((r) => r.infl != null).map((r) => r.m))].sort();
const itemMonthIdx = new Map(itemMonths.map((m, i) => [m, i]));
const itemNameOf = new Map();
const itemLevels = {};
const itemInfl = {};
for (const r of itemRows) {
  itemNameOf.set(r.code, r.name);
  (itemLevels[r.code] ??= Array(seriesMonths.length).fill(null))[seriesMonthIdx.get(r.m)] = r.idx;
  const j = itemMonthIdx.get(r.m);
  if (j != null) (itemInfl[r.code] ??= Array(itemMonths.length).fill(null))[j] = r.infl;
}

// The weight comes from the item weighting diagram — the same table and the
// same grouping the funnel's own item floor is built from, so the board has one
// weights pathway rather than two that can drift.
const items = {
  months: itemMonths,
  list: itemWeightRows.map((r) => ({ code: r.code, name: itemNameOf.get(r.code) ?? r.name, weight: r.weight })),
  levels: itemLevels,
  infl: itemInfl,
};

// ── Gate D: the item weights are the funnel's own ─────────────────────────
{
  const mine = items.list.reduce((a, d) => a + d.weight, 0);
  const theirs = pyramid.tree.filter((n) => n.level === 'item').reduce((a, n) => a + n.weight, 0);
  const err = Math.abs(mine - theirs);
  gate('D', `item weights: Σ list ${mine.toFixed(4)} vs Σ funnel item floor ${theirs.toFixed(4)}, `
    + `off by ${err.toFixed(5)}, limit 0.05 [${err <= 0.05 ? 'ok' : 'FAIL'}]`);
  if (err > 0.05) fail(`items.list weights miss the funnel's item total by ${err.toFixed(5)}`);
}

// ── Gate B: the item series are the DB's own, on unbroken axes ────────────
{
  const step = (m) => +m.slice(0, 4) * 12 + (+m.slice(5) - 1);
  for (let i = 1; i < itemMonths.length; i++) {
    if (step(itemMonths[i]) !== step(itemMonths[i - 1]) + 1) {
      fail(`items.months jumps ${itemMonths[i - 1]} → ${itemMonths[i]}`);
    }
  }
  // Every array exactly as long as the axis it hangs on, and every published
  // reading the same number the DB holds — the arrays are built straight off
  // the query rows, so this proves nothing was dropped or shifted along the way.
  const badLen = [
    ...Object.entries(itemLevels).filter(([, a]) => a.length !== seriesMonths.length).map(([c]) => `levels ${c}`),
    ...Object.entries(itemInfl).filter(([, a]) => a.length !== itemMonths.length).map(([c]) => `infl ${c}`),
  ];
  if (badLen.length) fail(`${badLen.length} item arrays are the wrong length (${badLen[0]})`);
  let checked = 0;
  for (const r of itemRows) {
    if (itemLevels[r.code][seriesMonthIdx.get(r.m)] !== r.idx) {
      fail(`items.levels ${r.code} ${r.m} is ${itemLevels[r.code][seriesMonthIdx.get(r.m)]}, the DB says ${r.idx}`);
    }
    const j = itemMonthIdx.get(r.m);
    if (j != null && itemInfl[r.code]?.[j] !== (r.infl ?? null)) {
      fail(`items.infl ${r.code} ${r.m} is ${itemInfl[r.code]?.[j]}, the DB says ${r.infl}`);
    }
    checked++;
  }
  gate('B', `items: ${items.list.length} items, levels on ${seriesMonths.length} months `
    + `(${seriesMonths[0]}→${seriesMonths.at(-1)}), rates on ${itemMonths.length} `
    + `(${itemMonths[0]}→${itemMonths.at(-1)}), ${checked} readings byte-equal to the DB [ok]`);
}

// ── the per-item shards: every item, state by state, sector by sector ─────
// The curated ten-item list is gone, and with it the payload argument that
// produced it. Every one of the 358 priced items now ships as its own small
// file under public/data/economy/inflation-items/, fetched only when a reader
// picks that item on the state desk. What used to be a choice about WHICH
// items a reader could have is now a choice about WHEN they arrive.
//
// All three sectors, both measures. The old block was Combined-only and
// rate-only, which turned two of the state desk's switches off; the data was
// always published, it just could not be afforded in one file.
//
// The filename carries the shard's own content hash, so a shard is immutable
// under /data/* (see public/_headers) without hash-data.mjs having to walk the
// directory: the main dataset carries the filename, and the main dataset is
// what versions it.
const codeOfItem = (() => {
  const byName = new Map();
  for (const [code, name] of itemNameOf) {
    if (byName.has(name)) fail(`the item name "${name}" is not unique: ${byName.get(name)} and ${code}`);
    byName.set(name, code);
  }
  return byName;
})();

const SHARD_DIR = 'economy/inflation-items';
const SHARD_LIMIT = 30_000; // bytes, per shard — gate S5

// Every published item reading, everywhere. One query rather than 358: the
// table is indexed on (item, date) and the whole item slice is about 650k rows,
// which sorts in the client faster than 358 round trips.
const shardRows = await q(`
  SELECT to_char(date, 'YYYY-MM') AS m, state, sector, code, division,
         index_value::float AS idx, inflation::float AS infl
  FROM ${SCHEMA}.mospi_cpi_coicop
  WHERE item IS NOT NULL AND item <> ''
  ORDER BY code, state, sector, date`);
if (!shardRows.length) fail('no item rows in the COICOP series');

/* The shard axis is the INDEX axis — every month the 2024 base has published,
   not the six that carry a rate. Levels run the whole base and rates only from
   its first full year-on-year, so a shard aligned to the rate months would
   throw away twelve months of published index and take the Index half of the
   state desk's measure switch with it. `infl` simply carries null where MoSPI
   has not published a rate yet, which is what the arrays say elsewhere too. */
const shardMonths = seriesMonths;
const shardMonthIdx = seriesMonthIdx;

const shards = new Map(); // code -> the document that will be written
{
  const byCode = new Map();
  for (const r of shardRows) {
    let item = byCode.get(r.code);
    if (!item) byCode.set(r.code, item = { division: r.division, regions: new Map() });
    const region = r.state === 'All India' ? 'ALL INDIA' : toRegion(r.state);
    let reg = item.regions.get(region);
    if (!reg) item.regions.set(region, reg = { region, state: r.state, sectors: {} });
    let sec = reg.sectors[r.sector];
    if (!sec) {
      sec = reg.sectors[r.sector] = {
        idx: Array(shardMonths.length).fill(null),
        infl: Array(shardMonths.length).fill(null),
      };
    }
    const i = shardMonthIdx.get(r.m);
    if (i == null) continue;
    sec.idx[i] = r.idx;   // published, never recomputed
    sec.infl[i] = r.infl ?? null;
  }
  for (const [code, item] of byCode) {
    shards.set(code, {
      code,
      name: itemNameOf.get(code) ?? code,
      division: item.division,
      months: shardMonths,
      regions: [...item.regions.values()],
    });
  }
}

// Written last, once the gates below have had their say — but the filenames
// have to be known before `items.list` is built, so hash and serialise here and
// keep the bytes for the write step.
const shardFiles = new Map(); // code -> { file, bytes }
for (const [code, doc] of shards) {
  const body = JSON.stringify(doc) + '\n';
  const hash = createHash('sha256').update(body).digest('hex').slice(0, 8);
  shardFiles.set(code, { file: `${code}.${hash}.json`, body, bytes: Buffer.byteLength(body) });
}

/* The main dataset carries the shard's filename rather than a pattern the
   client could rebuild, which is the whole point of hashing them: a reader's
   browser only ever asks for a URL this file handed it, so a rebuilt shard
   arrives under a new name and no cache can serve the old one. */
{
  const orphans = items.list.filter((it) => !shardFiles.has(it.code)).map((it) => it.code);
  if (orphans.length) fail(`${orphans.length} items in items.list have no shard (${orphans.slice(0, 5).join(', ')})`);
  for (const it of items.list) it.file = shardFiles.get(it.code).file;
}

// ── Gate S1: one shard per item the COICOP series prices ──────────────────
{
  const [{ n }] = await q(`
    SELECT count(DISTINCT code)::int AS n FROM ${SCHEMA}.mospi_cpi_coicop
    WHERE item IS NOT NULL AND item <> ''`);
  gate('S1', `shards: ${shards.size} written against ${n} distinct item codes in the DB [${shards.size === +n ? 'ok' : 'FAIL'}]`);
  if (shards.size !== +n) fail(`the generator built ${shards.size} shards for ${n} item codes`);
}

// ── Gate S2: five random shards, three random cells each, against the DB ──
// Random rather than fixed, so a bug that happens to miss a chosen cell has a
// fresh chance to be caught on every build. The cell that was checked is
// printed, so a failure is reproducible from the log.
{
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const codes = [...shards.keys()];
  const checked = [];
  for (let s = 0; s < 5 && codes.length; s++) {
    const code = pick(codes);
    const doc = shards.get(code);
    for (let c = 0; c < 3; c++) {
      const reg = pick(doc.regions);
      const sector = pick(Object.keys(reg.sectors));
      const i = Math.floor(Math.random() * shardMonths.length);
      const cell = reg.sectors[sector];
      const [db] = await q(`
        SELECT index_value::float AS idx, inflation::float AS infl
        FROM ${SCHEMA}.mospi_cpi_coicop
        WHERE item IS NOT NULL AND code = $1 AND state = $2 AND sector = $3 AND to_char(date, 'YYYY-MM') = $4`,
      [code, reg.state, sector, shardMonths[i]]);
      const wantIdx = db?.idx ?? null;
      const wantInfl = db?.infl ?? null;
      if (cell.idx[i] !== wantIdx || cell.infl[i] !== wantInfl) {
        fail(`shard ${code} ${reg.state}/${sector}/${shardMonths[i]} is `
          + `idx ${cell.idx[i]} infl ${cell.infl[i]}, the DB says idx ${wantIdx} infl ${wantInfl}`);
      }
      checked.push(`${code}/${reg.region}/${sector}/${shardMonths[i]}`);
    }
  }
  gate('S2', `shard spot-check: ${checked.length} random cells byte-equal to the DB [ok]`);
  console.log(`      ${checked.join(', ')}`);
}

// ── Gate S3: every shard hangs on the same month axis ─────────────────────
{
  const want = shardMonths.join(',');
  const bad = [...shards.values()].filter((d) => d.months.join(',') !== want).map((d) => d.code);
  gate('S3', `shard axis: ${shards.size} shards on ${shardMonths.length} months `
    + `(${shardMonths[0]}→${shardMonths.at(-1)}), ${bad.length} disagree [${bad.length ? 'FAIL' : 'ok'}]`);
  if (bad.length) fail(`shards on a different month axis: ${bad.slice(0, 5).join(', ')}`);
  // The rate axis is the tail of the index axis, which is what lets one array
  // carry both measures with nulls where the rate does not exist yet.
  if (itemMonths.join(',') !== shardMonths.slice(-itemMonths.length).join(',')) {
    fail(`items.months (${itemMonths[0]}→${itemMonths.at(-1)}) is not the tail of the shard axis`);
  }
}

// ── Gate S4: every shard carries the national row ─────────────────────────
// All India is a region like any other in a shard, and it is the line every
// state is read against. A shard without it draws an empty panel on the state
// desk's own default selection.
{
  const missing = [...shards.values()].filter((d) => !d.regions.some((r) => r.region === 'ALL INDIA')).map((d) => d.code);
  gate('S4', `shard All-India row: ${shards.size - missing.length} of ${shards.size} shards carry one [${missing.length ? 'FAIL' : 'ok'}]`);
  if (missing.length) fail(`shards with no ALL INDIA region: ${missing.slice(0, 5).join(', ')}`);
}

// ── Gate S5: no shard is big enough to be worth waiting for ───────────────
{
  const sizes = [...shardFiles.entries()].map(([code, f]) => ({ code, bytes: f.bytes }));
  const total = sizes.reduce((a, s) => a + s.bytes, 0);
  const largest = sizes.reduce((a, s) => (s.bytes > a.bytes ? s : a));
  const over = sizes.filter((s) => s.bytes > SHARD_LIMIT);
  gate('S5', `shard payload: ${sizes.length} files, ${(total / 1000).toFixed(1)} kB total, `
    + `largest ${(largest.bytes / 1000).toFixed(1)} kB (${largest.code} ${shards.get(largest.code).name}), `
    + `mean ${(total / sizes.length / 1000).toFixed(1)} kB, limit ${SHARD_LIMIT / 1000} kB [${over.length ? 'FAIL' : 'ok'}]`);
  if (over.length) {
    fail(`${over.length} shards exceed ${SHARD_LIMIT} bytes: `
      + over.sort((a, b) => b.bytes - a.bytes).slice(0, 5).map((s) => `${s.code} ${s.bytes}`).join(', '));
  }
}

// ── basket: the 2012 and 2024 division weights on one taxonomy ────────────
// Both restated on the COICOP-2018 structure, which is the only honest
// comparison — the cpi2012 six-group structure is a different taxonomy and is
// never mixed in here.
const basketFor = (sector) => divisionRows.map((r) => ({
  code: r.code,
  name: r.name,
  w2012: weights[sector]?.[2012]?.[r.code] ?? null,
  w2024: weights[sector]?.[2024]?.[r.code] ?? null,
})).sort((a, b) => (b.w2024 ?? 0) - (a.w2024 ?? 0));

for (const sector of SECTORS) {
  const missing = basketFor(sectorKey(sector)).filter((d) => d.w2012 == null || d.w2024 == null);
  if (missing.length) {
    fail(`sector ${sector} is missing a 2012 or 2024 weight for ${missing.map((d) => d.code).join(', ')}`);
  }
}

// The one figure from the retired six-group structure the rebase desk needs:
// what the operating 2012 CPI actually carried for food, read from the same
// weights table rather than typed into copy. Kept out of the divisions arrays
// so the two taxonomies never share a column.
const legacyFoodRows = await q(
  `SELECT weight FROM ${SCHEMA}.mospi_cpi_weights
   WHERE structure = 'cpi2012' AND series = 2012 AND sector = 'combined'
     AND level = 'group' AND category = 'Food and Beverages'`,
);
if (legacyFoodRows.length !== 1 || legacyFoodRows[0].weight == null) {
  fail(`expected exactly one cpi2012/2012/combined Food and Beverages weight, got ${legacyFoodRows.length}`);
}
const legacyFood = Number(legacyFoodRows[0].weight);

const basket = {
  divisions: basketFor('combined'),
  sectors: Object.fromEntries(SECTORS.map((s) => [sectorKey(s), basketFor(sectorKey(s))])),
  restatementNote:
    'It is not what the index of that era published: the CPI operating in 2012 '
    + `split spending into six groups and carried food at ${legacyFood.toFixed(3)} of the hundred, `
    + 'a figure measured on a different structure and not comparable with this column.',
};

// ── rebase: the overlap year, the counts, and what entered the basket ─────
// The 2024 base opened in January 2025 and the 2012 base ran to December 2025,
// so for twelve months India had two consumer price indices. That overlap is
// the only place the two can be put on one chart honestly — as INDEX PATHS,
// each divided by its own January reading. What a reader expects instead, one
// rate against the other, does not exist: the 2024 base's first year-on-year
// is January 2026.
const OVERLAP_YEAR = '2025';
const overlapRows = await q(`
  SELECT to_char(date, 'YYYY-MM') AS m, index_value::float AS idx
  FROM ${SCHEMA}.mospi_cpi_index
  WHERE state = 'All India' AND sector = 'Combined'
    AND cpi_group = 'General' AND subgroup = 'General-Overall'
    AND to_char(date, 'YYYY') = $1
  ORDER BY date`, [OVERLAP_YEAR]);

const overlap = (() => {
  const months = overlapRows.map((r) => r.m);
  const raw2012 = overlapRows.map((r) => r.idx);
  const byMonth = new Map(modern.combined.map((p) => [p.date, p.idx]));
  const raw2024 = months.map((m) => byMonth.get(m) ?? null);
  if (raw2024.some((v) => v == null)) {
    fail(`the 2024 base has no General index for ${months.filter((m, i) => raw2024[i] == null).join(', ')}`);
  }
  const o = rebaseOverlap(months, raw2012, raw2024);
  o.note = overlapNote(o, contribMonths[0].date);
  return o;
})();

// ── Gate C: the overlap year is the two published paths and nothing else ──
{
  if (overlap.months.length !== 12) fail(`the overlap year has ${overlap.months.length} months, expected 12`);
  const dbBy = new Map(overlapRows.map((r) => [r.m, r.idx]));
  const modernBy = new Map(modern.combined.map((p) => [p.date, p.idx]));
  let worst = 0;
  overlap.months.forEach((m, i) => {
    if (overlap.raw2012[i] !== dbBy.get(m)) fail(`rebase.overlap.raw2012 ${m} is ${overlap.raw2012[i]}, the DB says ${dbBy.get(m)}`);
    if (overlap.raw2024[i] !== modernBy.get(m)) fail(`rebase.overlap.raw2024 ${m} is ${overlap.raw2024[i]}, the 2024 base says ${modernBy.get(m)}`);
    for (const [reb, raw] of [[overlap.b2012, overlap.raw2012], [overlap.b2024, overlap.raw2024]]) {
      worst = Math.max(worst, Math.abs(reb[i] - (raw[i] / raw[0]) * 100));
    }
  });
  if (overlap.b2012[0] !== 100 || overlap.b2024[0] !== 100) {
    fail(`the rebased paths start at ${overlap.b2012[0]} and ${overlap.b2024[0]}, not 100`);
  }
  gate('C', `overlap ${overlap.months[0]}→${overlap.months.at(-1)}: 12 months, both raws byte-equal to the DB, `
    + `rebased reproduce within ${worst.toExponential(1)}, both start at exactly 100 [${worst <= 1e-9 ? 'ok' : 'FAIL'}]`);
  if (worst > 1e-9) fail(`the rebased overlap paths do not reproduce from their raws (worst ${worst})`);
}

// ── Gate G: the two baskets' item counts, counted ─────────────────────────
const rebaseCounts = {
  items2012: +(await q(`SELECT count(DISTINCT item)::int AS n FROM ${SCHEMA}.mospi_cpi_item_index`))[0].n,
  items2024: +(await q(`SELECT count(DISTINCT item)::int AS n FROM ${SCHEMA}.mospi_cpi_coicop
                        WHERE item IS NOT NULL AND item <> ''`))[0].n,
};
gate('G', `basket counts: ${rebaseCounts.items2012} items on the 2012 base, ${rebaseCounts.items2024} on the 2024 base, `
  + `both counted from their own tables [ok]`);
if (rebaseCounts.items2024 !== items.list.length) {
  fail(`the 2024 item count (${rebaseCounts.items2024}) and the shipped item list (${items.list.length}) disagree`);
}

// ── Gate F: what entered the basket, verified against the old one ─────────
// Each of these has to be in the 2024 item set and absent from the 2012 one.
// Deliberately NOT here: airfare and rural house rent, which the 2024 revision
// changed the COLLECTION METHOD for; the items themselves already existed, and
// calling them new would be wrong. The same test rules out anything the 2024
// list merely renamed or broadened — a smartwatch, for instance, arrives inside
// "Clock, watch, smartwatch and fitness tracker", and the 2012 basket already
// carried "Clock, Watch".
const ADDITIONS = [
  { name: 'Online media service provider/streaming services', label: 'Streaming subscriptions' },
  { name: 'Headphone, earphone, ear pod, airpod and bluetooth devices', label: 'Earbuds and headphones' },
  { name: 'Air purifier', label: 'Air purifier' },
  { name: 'Sanitizer', label: 'Hand sanitiser' },
  { name: 'Health supplements (protein powder)', label: 'Protein powder' },
  { name: 'Health supplements (probiotic tablet and drinks)', label: 'Probiotic supplements' },
  { name: 'Health supplements (chawanprash)', label: 'Chyawanprash' },
];
{
  if (ADDITIONS.length < 6 || ADDITIONS.length > 8) {
    fail(`rebase.additions carries ${ADDITIONS.length} chips, expected six to eight`);
  }
  const old2012 = new Set((await q(`SELECT DISTINCT item FROM ${SCHEMA}.mospi_cpi_item_index`)).map((r) => r.item));
  const absent = ADDITIONS.filter((a) => !codeOfItem.has(a.name)).map((a) => a.name);
  const notNew = ADDITIONS.filter((a) => old2012.has(a.name)).map((a) => a.name);
  gate('F', `basket additions: ${ADDITIONS.length} chips, ${absent.length} missing from the 2024 set, `
    + `${notNew.length} already in the 2012 set of ${old2012.size} [${absent.length || notNew.length ? 'FAIL' : 'ok'}]`);
  if (absent.length) fail(`additions naming items the 2024 basket does not have: ${absent.join('; ')}`);
  if (notNew.length) fail(`additions naming items the 2012 basket already had: ${notNew.join('; ')}`);
}

const rebase = {
  overlap,
  counts: rebaseCounts,
  additions: ADDITIONS,
};

// ── events: five dated marks on the long line ─────────────────────────────
// Every label has to be defensible from the spine itself, so every date is
// checked against it at build time (see checkEvent): four are the highest month
// within two years either side, and one is the last month at or above ten per
// cent, which is a claim about where the line stopped rather than where it
// topped out. No label carries a cause: why 1974 was 1974 is not something a
// year-on-year series can say, and a marker that says it would be the chart
// asserting something it has no evidence for.
const EVENTS = [
  { date: '1974-09', label: 'the 1974 peak' },
  { date: '1991-01', label: 'the 1991 peak' },
  { date: '1998-11', label: 'the 1998 peak' },
  { date: '2013-11', label: 'the last double-digit month', rule: 'lastAtOrAbove', at: 10 },
  // Short, because these are printed on their side against a fifty-seven-year
  // axis: that this month cleared the band is drawn right there beside it.
  { date: '2022-04', label: 'the 2022 peak' },
];
{
  const points = spine.points.map((p) => ({ date: p.date, infl: p.infl }));
  const bad = [];
  for (const ev of EVENTS) {
    const r = checkEvent(ev, points);
    gate('E', `event ${ev.date} "${ev.label}": ${r.why} [${r.ok ? 'ok' : 'FAIL'}]`);
    if (!r.ok) bad.push(`${ev.date}: ${r.why}`);
  }
  if (bad.length) fail(`event markers the spine does not support:\n      ${bad.join('\n      ')}`);
}
// The rule and its threshold are how the gate checks the date; the chart only
// ever draws a month and a label, so they stay out of the payload.
const events = EVENTS.map(({ date, label }) => ({ date, label }));

// ── Write ─────────────────────────────────────────────────────────────────
const out = {
  asOf: asof,
  // CPI is a MONTHLY statistic: `asOf` is the first of the reported month
  // because that is how the month is keyed, not because anything was measured
  // that day. The board prints "Jun 2026" off this rather than "01 Jun 2026",
  // which would claim a precision the release does not have. (The release
  // date itself — mid-July for a June print — is not in the source data; it
  // would have to be captured by the ETL before anything could show it.)
  asOfGrain: 'month',
  weightSum,
  weightSums,
  headline: { modern, spine },
  contribution: { months: contribMonths },
  pyramid,
  map,
  series,
  basket,
  band,
  nextPrint,
  items,
  decades,
  rebase,
  events,
  /* One line per desk, because a desk that cannot name where its numbers came
     from should not be on the page. `spine` also carries the sentence the
     game prints, so the two formats cite the same series the same way. */
  sources: {
    modern: `MoSPI, Consumer Price Index (base 2024=100), COICOP-2018 series, All India, ${MODERN_START} to ${asOfMonth}. Index levels and year-on-year rates as published.`,
    spine: spineSources(spineBuild),
    spineSegments: spineBuild.segments.map((s) => `${s.series} ${s.from}–${s.to}`).join('; '),
    contribution: `Contribution to the headline year-on-year, computed by TSOI from MoSPI's published division indices, published division rates and the 2024 weighting diagram: `
      + `contrib_d = w_d × (idx_d − idx_d/(1 + infl_d/100)) ÷ (Σw × idx_gen/(1 + infl_gen/100)) × 100. `
      + `Σw is ${weightSum}, not 100. Published rates are never recomputed; the residual is the rounding the published rates carry, and is disclosed per month.`,
    pyramid: `MoSPI, COICOP-2018 aggregation tree at ${asOfMonth} (All India, Combined). Weights from the CPI 2024 item weighting diagram (Annexure 5.3d); `
      + `class and sub-class weights are sums of member item weights, which is what MoSPI defines them to be.`,
    series: `MoSPI, Consumer Price Index (base 2024=100), published monthly index levels, ${seriesMonths[0]} to ${seriesMonths.at(-1)}: `
      + `All India and ${series.states.length - 1} states and union territories, ${map.codes.length} series each (General plus the twelve divisions), ${SECTORS.length} sectors. `
      + 'Levels as published; the year-on-year beside them is MoSPI\'s own, not recomputed from these levels.',
    map: `MoSPI, Consumer Price Index (base 2024=100), state-level published year-on-year, ${map.months[0]} to ${map.months.at(-1)}. `
      + `${map.codes.length} codes (General plus the twelve divisions) × ${SECTORS.length} sectors. All-India rows excluded. `
      + MAP_ATTRIBUTION,
    weights: 'MoSPI, CPI 2024 series weighting diagram (Annexure V), restated on the COICOP-2018 structure alongside the 2012 basket. Divisions run 01–13 with no 12: insurance and financial services sits outside India\'s CPI.',
  },
  generated: new Date().toISOString().slice(0, 10),
};

// ── Gate S6: the payload gate, on the whole file ──────────────────────────
// The old gate measured what one round of work ADDED, and had a trimming loop
// under it that dropped curated items off the end of a list until they fit.
// Both are gone with mapItems: the file has lost that block's 243 kB, and what
// is worth gating now is the size a reader actually waits for. A ceiling on the
// whole file cannot be crept past by adding a block that is individually small.
const PAYLOAD_BUDGET = 1_450_000;
{
  const bytes = Buffer.byteLength(JSON.stringify(out));
  gate('S6', `main dataset: ${(bytes / 1000).toFixed(1)} kB against a ${PAYLOAD_BUDGET / 1000} kB ceiling `
    + `[${bytes > PAYLOAD_BUDGET ? 'FAIL' : 'ok'}]`);
  if (bytes > PAYLOAD_BUDGET) fail(`inflation-board.json is ${bytes} bytes, over the ${PAYLOAD_BUDGET} ceiling`);
}

// ── the shards ────────────────────────────────────────────────────────────
// The directory is WIPED first. Filenames carry a content hash, so a rebuild
// that changes an item leaves its old file behind for ever otherwise, and after
// a few builds the directory is mostly numbers nothing points at.
{
  const dir = resolve(SITE, 'public/data', SHARD_DIR);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const [code, f] of shardFiles) writeFileSync(resolve(dir, f.file), f.body);
  const total = [...shardFiles.values()].reduce((a, f) => a + f.bytes, 0);
  console.log(`\n  wrote ${shardFiles.size} item shards → public/data/${SHARD_DIR}/ (${(total / 1000).toFixed(1)} kB total)`);
}

const dest = writeData('economy/inflation-board.json', out);
const latest = contribMonths.at(-1);
console.log(`\n  wrote ${dest}`);
console.log(`  headline: modern ${modern.combined.length} months × 3 sectors (latest ${asOfMonth} idx ${modern.combined.at(-1).idx}, ${modern.combined.at(-1).infl}%); spine ${spine.points.length} months`);
console.log(`  contribution: ${contribMonths.length} months, ${latest.date} gen ${latest.gen}% residual ${latest.residual} pp`);
console.log(`    ${[...latest.divisions].sort((a, b) => Math.abs(b.contrib) - Math.abs(a.contrib)).slice(0, 4)
  .map((d) => `${d.code} ${d.contrib.toFixed(2)}pp`).join(' · ')}`);
console.log(`  pyramid: ${pyramid.levels.map((l) => l.n).join('/')}, ${pyramid.tree.length} nodes`);
console.log(`  map: ${map.values.length} values, ${map.codes.length} codes × ${map.months.length} months, ${map.values.filter((v) => v.imputed).length} imputed`);
console.log(`  series: ${Object.keys(series.values).length} index series × ${series.months.length} months (${series.states.length} states incl All India)`);
console.log(`  basket: ${basket.divisions.length} divisions, Σw combined ${weightSum} (never 100)\n`);

await end();
