// The Walk through Midnight (Independence Day 2026 supplement) — the walked
// dataset, built directly from the one static CSV in data/independence/.
// Deliberately DB-free: see data/independence/SOURCES.md for why this source
// bypasses the usual ETL -> TimescaleDB -> generator pipeline (small, static,
// externally sourced, never refreshed by a cron). Consequence accepted there:
// `tsoi trace` lineage does not cover these series.
//
// This began as a five-panel generator (economy, demographics, environment,
// infrastructure, governance — git: ca6fdd0). The piece became a single walked
// line, and at release the four dead panels and the eight CSVs feeding them
// left the public repo entirely rather than riding along as validated freight;
// the snapshots live on internally for the piece that will actually draw them.
//
// Usage: node site/scripts/build-independence.mjs   (from the repo root, or
// any cwd — paths below are resolved off this file's own location).
//
// Output: site/public/data/independence/economy.json — { panel, updated,
// series[] }, series[].points is [year, value] pairs, years ascending, no null
// points.
//
// Manifest/hashing: the one logical path is registered in hash-data.mjs's
// RUNTIME_FILES, because /independence fetches it in the browser. Run
// `node site/scripts/hash-data.mjs` after this generator so data-manifest.json
// picks up the new content hash; a stale manifest points the page at the
// previous version of the numbers.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeData } from './lib/db.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(HERE, '../../data/independence');
// SOURCES.md: "Retrieved 2026-08-11."
const UPDATED = '2026-08-11';

// ---- tiny CSV reader -------------------------------------------------------
// Handles RFC4180 quoting (some Entity names embed commas, e.g. "Middle
// East, North Africa, Afghanistan and Pakistan (WB)"), which a naive
// String.split(',') would mis-parse. No external dependency for one small
// file.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function readCsv(name) {
  const text = readFileSync(resolve(DATA_DIR, name), 'utf8');
  const rows = parseCsv(text);
  const header = rows[0];
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

// Keep decimals as-is from source; cap precision rather than force it — 2dp
// for |v| >= 10, 4dp for |v| < 10, per the build contract.
function roundVal(v) {
  const dp = Math.abs(v) >= 10 ? 2 : 4;
  const f = 10 ** dp;
  return Math.round(v * f) / f;
}

// Pull { code, year, value } triples out of a raw OWID CSV for one or more
// Codes, sorted by year, empty/NaN values dropped.
function seriesFor(rows, codes, valueCol) {
  const codeSet = new Set(Array.isArray(codes) ? codes : [codes]);
  return rows
    .filter((r) => codeSet.has(r.Code))
    .map((r) => ({ code: r.Code, year: +r.Year, value: r[valueCol] === '' ? NaN : +r[valueCol] }))
    .filter((r) => Number.isFinite(r.year) && Number.isFinite(r.value))
    .sort((a, b) => a.year - b.year);
}

function points(rows) {
  return rows.map((r) => [r.year, roundVal(r.value)]);
}

// ---- economy.json -----------------------------------------------------
// India is the walk; the other three are comparators the scrollytelling stage
// can bring in and drop again. Each takes its FULL available span from the
// source (World starts 1820, the UK and China at 1000, India at 1600) — the
// unequal starts are information, the same convention the panels already use,
// so nothing is clipped to a common window here.
const GDP_ENTITIES = [
  ['IND', 'India'],
  ['OWID_WRL', 'World'],
  ['GBR', 'United Kingdom'],
  ['CHN', 'China'],
];
const gdpRaw = readCsv('gdp-per-capita-maddison.csv');
const gdpSeries = GDP_ENTITIES.map(([code, entity]) => ({
  id: 'gdp_pc', entity, label: 'GDP per capita',
  unit: 'international-$ at 2011 prices',
  points: points(seriesFor(gdpRaw, code, 'GDP per capita')),
}));

// ---- the estimated tail, 2023-2026 -----------------------------------------
// Maddison (MPD 2023, via OWID) stops at 2022, and a piece published in 2026
// that ends its line four years short reads as stale rather than as careful.
// So India and the World are CHAINED forward off their own 2022 level by an
// authored per-capita real growth rate per year. Nothing here is Maddison and
// nothing here is a new source: it is one multiplication per year on top of the
// last Maddison value, and every extended series says so in `estimated_from`.
//
// AUDITED 2026-08-14 (R3). Every figure below was re-derived against a live
// source on that date; the VERIFY tags this note replaces carried numbers from
// the SUPERSEDED 2011-12-base national accounts and three of the four India
// constants were wrong, one of them by two percentage points.
//
// WHAT THE AUDIT FOUND. On 27 February 2026 MoSPI released a new National
// Accounts series on a 2022-23 base year, and it rewrote India's recent growth
// history: FY2023/24 went from 9.2% to 7.2%, FY2024/25 from 6.5% to 7.1%, and
// FY2025/26 came in at 7.7%. The IMF adopted the rebased series in the April
// 2026 WEO. The old constant for 2023 is exactly reconstructible as 9.2 − 0.85,
// which is how the stale base was caught. Compounded, the four superseded India
// factors understated India's 2026 per-capita level by about 5.8%.
//
// The second finding is smaller and is a direction error rather than a
// magnitude one: the superseded note netted India at ~0.85%/yr population
// growth and the World at ~0.9%/yr. In WPP 2024 it is the other way round —
// India runs HIGHER than the world, 0.86-0.90 against 0.83-0.87. Worth at most
// 0.06pp on any one constant, but the arithmetic is now done per year off the
// actual series rather than off one rounded assumption for the whole tail.
//
// THE DERIVATION, per year: IMF real GDP growth minus UN WPP population growth.
//
//   India (WEO fiscal-year rows, per WEO footnote 5)
//     2023  FY2023/24  7.2 − 0.891 = 6.31  -> 0.063
//     2024  FY2024/25  7.1 − 0.887 = 6.21  -> 0.062
//     2025  FY2025/26  7.7 − 0.868 = 6.83  -> 0.068
//     2026  FY2026/27  6.4 − 0.845 = 5.55  -> 0.056   (projection)
//
//   World (calendar years)
//     2023  3.3 − 0.871 = 2.43  -> 0.024
//     2024  3.5 − 0.858 = 2.64  -> 0.026
//     2025  3.5 − 0.841 = 2.66  -> 0.027
//     2026  3.0 − 0.830 = 2.17  -> 0.022   (projection)
//
// SOURCES, named exactly:
//   · IMF, World Economic Outlook Update, July 2026 ("Global Economy in
//     Crosscurrents of War and Technology", published 8 July 2026), Table 1 and
//     footnote 5 — the growth figures for 2024, 2025 and 2026, both panels.
//   · IMF, World Economic Outlook, April 2026 ("Global Economy in the Shadow of
//     War", published 14 April 2026), via the IMF DataMapper API series
//     NGDP_RPCH, which self-reports this vintage and a 2026-04-08 timestamp —
//     the 2023 figures, which the July Update's table does not reach back to.
//   · UN DESA, World Population Prospects 2024 revision, medium variant,
//     PopGrowthRate. Still the current revision as of this audit. India's rows
//     are the fiscal-year average of the two adjacent calendar-year rates, to
//     match the fiscal-year basis of the WEO rows above; that averaging is worth
//     at most 0.02pp and is done for consistency rather than for accuracy.
//   · Corroboration, not used in the arithmetic: MoSPI Provisional Estimates,
//     5 June 2026 (FY2025-26 7.7%, FY2024-25 7.1%) and the World Bank India
//     Development Update, April 2026 (FY26 7.6%, FY25 7.1%).
//
// THE FISCAL-YEAR MISMATCH IS STILL HERE AND IS STILL FLAGGED RATHER THAN
// HIDDEN, and the audit sharpened what it costs. A Maddison level is a
// CALENDAR-year quantity, so chaining fiscal-year growth onto it shifts India's
// tail about a quarter earlier relative to the World series beside it. The IMF
// publishes both bases for the projection years only — footnote 5 gives India
// 7.0% for calendar 2026 against 6.4% for FY2026/27, a 0.6pp gap. Rebuilding
// 2023-2025 on a calendar basis would mean reweighting MoSPI quarterlies rather
// than lifting a WEO row, which is a bigger apparatus than a four-year tail on a
// four-century walk can justify. So the fiscal rows stand, and this is the note
// that says so. (One further approximation, unchanged and noted for
// completeness: the WEO world aggregate is PPP-weighted and the WPP world
// population growth is a straight sum. Dividing one by the other is the standard
// approximation against a Maddison 2011$ PPP level, and it is an approximation
// rather than an identity.)
//
// Only these two series are extended. The UK and China are comparators the walk
// never draws, and inventing four years of them would be estimate for its own
// sake.
const ESTIMATED_FROM = 2023;
const INDIA_PC_GROWTH = { 2023: 0.063, 2024: 0.062, 2025: 0.068, 2026: 0.056 };
const WORLD_PC_GROWTH = { 2023: 0.024, 2024: 0.026, 2025: 0.027, 2026: 0.022 };

function extend(series, growth) {
  let value = series.points.at(-1)[1];
  for (const year of Object.keys(growth).map(Number).sort((a, b) => a - b)) {
    if (series.points.at(-1)[0] >= year) continue;
    value *= 1 + growth[year];
    series.points.push([year, roundVal(value)]);
  }
  series.estimated_from = ESTIMATED_FROM;
}

extend(gdpSeries.find((s) => s.entity === 'India'), INDIA_PC_GROWTH);
extend(gdpSeries.find((s) => s.entity === 'World'), WORLD_PC_GROWTH);

const economy = {
  panel: 'economy',
  updated: UPDATED,
  series: gdpSeries,
};

// ---- validation gates -------------------------------------------------
// Run at build time against the ACTUAL generated data, not quoted from a
// doc. Tolerance +/-0.5% relative, per the build contract.
function findPoint(series, year) {
  return series.points.find((p) => p[0] === year)?.[1];
}
function checkClose(label, got, want, tol = 0.005) {
  if (got == null) throw new Error(`VALIDATION FAILED: ${label} — no value found (expected ~${want})`);
  const rel = Math.abs(got - want) / Math.abs(want);
  if (rel > tol) {
    throw new Error(
      `VALIDATION FAILED: ${label} — got ${got}, expected ${want} ` +
      `(${(rel * 100).toFixed(2)}% off, tolerance ${(tol * 100).toFixed(1)}%)`);
  }
}

const gdpS = economy.series.find((s) => s.id === 'gdp_pc' && s.entity === 'India');
checkClose('economy gdp_pc India 1900', findPoint(gdpS, 1900), 955);
checkClose('economy gdp_pc India 1947', findPoint(gdpS, 1947), 985);
checkClose('economy gdp_pc India 1991', findPoint(gdpS, 1991), 2062.3);
checkClose('economy gdp_pc India 2022', findPoint(gdpS, 2022), 7765.6);

const gdpWrl = economy.series.find((s) => s.id === 'gdp_pc' && s.entity === 'World');
const gdpGbr = economy.series.find((s) => s.id === 'gdp_pc' && s.entity === 'United Kingdom');
const gdpChn = economy.series.find((s) => s.id === 'gdp_pc' && s.entity === 'China');
checkClose('economy gdp_pc World 1950', findPoint(gdpWrl, 1950), 3360);
checkClose('economy gdp_pc World 2022', findPoint(gdpWrl, 2022), 16676.75);
// 1947 is the year the walk turns, so the UK is checked there rather than at a
// round decade: it is the only comparator whose 1947 value the copy can name.
checkClose('economy gdp_pc United Kingdom 1947', findPoint(gdpGbr, 1947), 10527);
checkClose('economy gdp_pc China 1950', findPoint(gdpChn, 1950), 799);
checkClose('economy gdp_pc China 2022', findPoint(gdpChn, 2022), 19238.18);

// The estimated tail, checked as a chain rather than as four magic numbers:
// each year must be its predecessor times its own authored growth, and the two
// unextended comparators must still stop where Maddison stops. The end year is
// read off the growth table rather than written down again, so adding a row
// above moves the check with it.
const ESTIMATED_TO = Math.max(...Object.keys(INDIA_PC_GROWTH).map(Number));
for (const [s, growth] of [[gdpS, INDIA_PC_GROWTH], [gdpWrl, WORLD_PC_GROWTH]]) {
  if (s.estimated_from !== ESTIMATED_FROM) {
    throw new Error(`VALIDATION FAILED: ${s.entity} gdp_pc missing estimated_from`);
  }
  if (s.points.at(-1)[0] !== ESTIMATED_TO) {
    throw new Error(
      `VALIDATION FAILED: ${s.entity} gdp_pc ends ${s.points.at(-1)[0]}, expected ${ESTIMATED_TO}`,
    );
  }
  for (const year of Object.keys(growth).map(Number).sort((a, b) => a - b)) {
    checkClose(
      `economy gdp_pc ${s.entity} ${year} (chained)`,
      findPoint(s, year),
      findPoint(s, year - 1) * (1 + growth[year]),
      0.0005,
    );
  }
}
for (const s of [gdpGbr, gdpChn]) {
  if (s.estimated_from != null || s.points.at(-1)[0] !== 2022) {
    throw new Error(`VALIDATION FAILED: ${s.entity} gdp_pc must stay unextended at 2022`);
  }
}

console.log('All validations passed.\n');

// ---- write ------------------------------------------------------------
// ONE FILE, since R3 — the page walks one line and reads one file. The path
// and its hashing are as they have always been: the same logical path in
// hash-data.mjs's RUNTIME_FILES, hashed the same way.
const written = [writeData('independence/economy.json', economy)];
for (const path of written) console.log(`wrote ${path}`);

// ---- report: first 2 / last 2 points of every series ---------------------
console.log();
console.log(`== ${economy.panel} ==`);
for (const s of economy.series) {
  const p = s.points;
  const head = p.slice(0, 2).map(([y, v]) => `${y}=${v}`).join(', ');
  const tail = p.slice(-2).map(([y, v]) => `${y}=${v}`).join(', ');
  const extra = s.estimated_from ? ` estimated_from=${s.estimated_from}` : '';
  console.log(`  ${s.id} [${s.entity}] (${p.length} pts)${extra}: first [${head}] last [${tail}]`);
}
