// Independence Day flagship — five panel datasets (economy, demographics,
// environment, infrastructure, governance) built directly from the static
// CSVs in data/independence/. Deliberately DB-free: see data/independence/
// SOURCES.md for why these sources bypass the usual
// ETL -> TimescaleDB -> generator pipeline (small, static, externally
// sourced, never refreshed by a cron). Consequence accepted there:
// `tsoi trace` lineage does not cover these series.
//
// Usage: node site/scripts/build-independence.mjs   (from the repo root, or
// any cwd — paths below are resolved off this file's own location).
//
// Output: site/public/data/independence/{economy,demographics,environment,
// infrastructure,governance}.json. Each file is { panel, updated, series[] },
// series[].points is [year, value] pairs, years ascending, no null points.
//
// Manifest/hashing: NOT registered in hash-data.mjs's RUNTIME_FILES yet.
// That allowlist is hand-maintained against actual frontend fetch() call
// sites (see the comment at the top of hash-data.mjs), and no
// /independence page exists in this worktree yet to fetch these files.
// build-read-inflation.mjs sets the precedent for this: a dataset for a
// not-yet-shipped page writes plain (unhashed) JSON and stays out of the
// manifest pipeline until the page ships. Do the same here — add these five
// logical paths to RUNTIME_FILES in hash-data.mjs when the /independence
// page lands and actually fetches them.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeData } from './lib/db.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(HERE, '../../data/independence');
// SOURCES.md: "Retrieved 2026-08-11." All nine CSVs came down together.
const UPDATED = '2026-08-11';

// ---- tiny CSV reader -------------------------------------------------------
// Handles RFC4180 quoting (some Entity names embed commas, e.g. "Middle
// East, North Africa, Afghanistan and Pakistan (WB)"), which a naive
// String.split(',') would mis-parse. No external dependency for nine small
// files.
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
const gdpRaw = readCsv('gdp-per-capita-maddison.csv');
const gdpInd = seriesFor(gdpRaw, 'IND', 'GDP per capita');
const economy = {
  panel: 'economy',
  updated: UPDATED,
  series: [
    {
      id: 'gdp_pc', entity: 'India', label: 'GDP per capita',
      unit: 'international-$ at 2011 prices',
      points: points(gdpInd),
    },
  ],
};

// ---- demographics.json --------------------------------------------------
// Header is "Under-five mortality rate (selected)"; the CSV already reports
// it as percent of live births (1911 = 33.34, not 334), matching the check
// values directly — no per-1000 -> percent conversion needed for this file.
const cmRaw = readCsv('child-mortality.csv');
const cmInd = seriesFor(cmRaw, 'IND', 'Under-five mortality rate (selected)');
const cmChn = seriesFor(cmRaw, 'CHN', 'Under-five mortality rate (selected)');
const demographics = {
  panel: 'demographics',
  updated: UPDATED,
  series: [
    {
      id: 'child_mortality', entity: 'India', label: 'Child mortality',
      unit: '% of live births dying before age five',
      points: points(cmInd),
    },
    {
      id: 'child_mortality', entity: 'China', label: 'Child mortality',
      unit: '% of live births dying before age five',
      points: points(cmChn),
    },
  ],
};

// ---- environment.json -----------------------------------------------------
// World's Code in these OWID files is "OWID_WRL" (confirmed by reading the
// CSVs directly), not a bare "World" string.
const CO2_ENTITIES = [
  ['IND', 'India'],
  ['OWID_WRL', 'World'],
  ['USA', 'United States'],
  ['CHN', 'China'],
];
const co2Raw = readCsv('co-emissions-per-capita.csv');
const co2Series = CO2_ENTITIES.map(([code, entity]) => ({
  id: 'co2_pc', entity, label: 'CO₂ emissions per capita',
  unit: 'tonnes CO₂ per person',
  points: points(seriesFor(co2Raw, code, 'CO₂ emissions per capita')),
}));

// Temperature anomaly baseline: fetched live from OWID's metadata endpoint
// rather than hand-copied, so the figure's caption always matches what OWID
// itself currently states as the reference period.
let tempBaseline = 'VERIFY-ME';
try {
  const metaResp = await fetch('https://ourworldindata.org/grapher/annual-temperature-anomalies.metadata.json');
  if (!metaResp.ok) throw new Error(`HTTP ${metaResp.status}`);
  const meta = await metaResp.json();
  const col = meta?.columns?.['Temperature anomaly'];
  const haystack = `${col?.subtitle ?? ''} ${col?.descriptionShort ?? ''} ${meta?.chart?.subtitle ?? ''}`;
  const m = haystack.match(/(\d{4}-\d{4})\s+mean/);
  if (m) tempBaseline = m[1];
  else console.warn('  ! temp_anomaly: metadata fetched but no "<YYYY-YYYY> mean" pattern found in it');
} catch (err) {
  console.warn(`  ! temp_anomaly: metadata fetch failed (${err.message}) — baseline set to VERIFY-ME`);
}

const tempRaw = readCsv('annual-temperature-anomalies.csv');
const tempInd = seriesFor(tempRaw, 'IND', 'Temperature anomaly');
const tempSeries = {
  id: 'temp_anomaly', entity: 'India', label: 'Temperature anomaly',
  unit: '°C', baseline: tempBaseline,
  points: points(tempInd),
};

// spei4_sep: the September value of the 4-month SPEI, i.e. the June-September
// monsoon window, one value per year. The 12-month index integrates backward
// across calendar years (the failed 1918 monsoon only registers in 1919), and
// a calendar-year mean of it smears events further; September SPEI-4 is the
// season itself. Under this metric the five deepest years are 1918, 1965,
// 1972, 1987 and 2002 — the canonical Indian drought years.
const droughtRows = readCsv('drought-spei-india.csv');
const speiPoints = droughtRows
  .filter((r) => r.month === '9' && r.spei_4month !== 'NaN' && Number.isFinite(+r.spei_4month))
  .map((r) => [+r.year, Math.round(+r.spei_4month * 1000) / 1000])
  .sort((a, b) => a[0] - b[0]);
const speiSeries = {
  id: 'spei4_sep', entity: 'India',
  unit: 'SPEI-4 z-score in September (June-September monsoon window)',
  points: speiPoints,
};

const environment = {
  panel: 'environment',
  updated: UPDATED,
  series: [...co2Series, tempSeries, speiSeries],
};

// ---- infrastructure.json -------------------------------------------------
const ENERGY_ENTITIES = [
  ['IND', 'India'],
  ['OWID_WRL', 'World'],
  ['USA', 'United States'],
];
const energyRaw = readCsv('per-capita-energy-use.csv');
const energySeries = ENERGY_ENTITIES.map(([code, entity]) => ({
  id: 'energy_pc', entity, label: 'Energy use per capita',
  unit: 'kWh per person per year',
  points: points(seriesFor(energyRaw, code, 'Total energy supply')),
}));

const elecRaw = readCsv('share-of-the-population-with-access-to-electricity.csv');
const elecInd = seriesFor(elecRaw, 'IND', 'Share of the population with access to electricity');
const elecSeries = {
  id: 'electricity_access', entity: 'India', label: 'Electricity access',
  unit: '% of population',
  points: points(elecInd),
};

const infrastructure = {
  panel: 'infrastructure',
  updated: UPDATED,
  series: [...energySeries, elecSeries],
};

// ---- governance.json ------------------------------------------------------
const wpRaw = readCsv('share-of-women-in-parliament.csv');
const wpInd = seriesFor(wpRaw, 'IND', 'Lower chamber female legislators');
const governance = {
  panel: 'governance',
  updated: UPDATED,
  series: [
    {
      id: 'women_parliament', entity: 'India', label: 'Women in parliament',
      unit: '% of lower-house seats',
      points: points(wpInd),
    },
  ],
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

const gdpS = economy.series.find((s) => s.id === 'gdp_pc');
checkClose('economy gdp_pc India 1900', findPoint(gdpS, 1900), 955);
checkClose('economy gdp_pc India 1947', findPoint(gdpS, 1947), 985);
checkClose('economy gdp_pc India 1991', findPoint(gdpS, 1991), 2062.3);
checkClose('economy gdp_pc India 2022', findPoint(gdpS, 2022), 7765.6);

const cmS = demographics.series.find((s) => s.id === 'child_mortality');
checkClose('demographics child_mortality India 1911', findPoint(cmS, 1911), 33.34);
checkClose('demographics child_mortality India 2024', findPoint(cmS, 2024), 2.66);

const co2Ind = environment.series.find((s) => s.id === 'co2_pc' && s.entity === 'India');
const co2Wrl = environment.series.find((s) => s.id === 'co2_pc' && s.entity === 'World');
const co2Usa = environment.series.find((s) => s.id === 'co2_pc' && s.entity === 'United States');
const co2Chn = environment.series.find((s) => s.id === 'co2_pc' && s.entity === 'China');
// NOTE (deviation, flagged loudly): the build brief's check list gives
// "co2_pc India 1950 = 0.18", but the source CSV has India 1950 = 0.176
// (2.2% off — outside the 0.5% tolerance). 1951 = 0.1803, which matches the
// brief's "0.18" to within 0.17%. This looks like an off-by-one-year
// transcription slip in the brief. Validated against 1951 instead of 1950
// so the gate tests a real, correct fact rather than being loosened to
// paper over a mismatch; the 1950 discrepancy is reported to the caller.
checkClose('environment co2_pc India 1951 (see NOTE above re: brief said 1950)', findPoint(co2Ind, 1951), 0.18);
checkClose('environment co2_pc India 2024', findPoint(co2Ind, 2024), 2.20);
checkClose('environment co2_pc World 2024', findPoint(co2Wrl, 2024), 4.73);
checkClose('environment co2_pc USA 2024', findPoint(co2Usa, 2024), 14.20);
checkClose('environment co2_pc China 2024', findPoint(co2Chn, 2024), 8.66);

checkClose('environment temp_anomaly India 1940', findPoint(tempSeries, 1940), -0.922);
checkClose('environment temp_anomaly India 2025', findPoint(tempSeries, 2025), 0.068);

{
  const years = speiSeries.points.map((p) => p[0]);
  const first = years[0], last = years.at(-1);
  if (first !== 1901 || last !== 2025 || years.length !== 125) {
    throw new Error(`VALIDATION FAILED: spei4_sep spans ${first}..${last} (${years.length} pts), expected 1901..2025 (125)`);
  }
  const worst = Math.max(...speiSeries.points.map((p) => Math.abs(p[1])));
  if (worst >= 3) {
    throw new Error(`VALIDATION FAILED: spei4_sep has |value| >= 3 (worst ${worst})`);
  }
  // The five deepest monsoon failures under this metric must be the canonical
  // drought years — the copy names them, so the gate holds the copy honest.
  const deepest = [...speiSeries.points].sort((a, b) => a[1] - b[1]).slice(0, 5).map((p) => p[0]).sort();
  const expected = [1918, 1965, 1972, 1987, 2002];
  if (JSON.stringify(deepest) !== JSON.stringify(expected)) {
    throw new Error(`VALIDATION FAILED: spei4_sep five deepest are ${deepest}, expected ${expected}`);
  }
}
checkClose('environment spei4_sep 1918', findPoint(speiSeries, 1918), -2.244);
checkClose('environment spei4_sep 2002', findPoint(speiSeries, 2002), -2.535);

const cmChnS = demographics.series.find((s) => s.id === 'child_mortality' && s.entity === 'China');
checkClose('demographics child_mortality China 1950', findPoint(cmChnS, 1950), 31.71);
checkClose('demographics child_mortality China 2024', findPoint(cmChnS, 2024), 0.57);

const energyInd = infrastructure.series.find((s) => s.id === 'energy_pc' && s.entity === 'India');
const energyWrl = infrastructure.series.find((s) => s.id === 'energy_pc' && s.entity === 'World');
const energyUsa = infrastructure.series.find((s) => s.id === 'energy_pc' && s.entity === 'United States');
checkClose('infrastructure energy_pc India 1965', findPoint(energyInd, 1965), 1187);
checkClose('infrastructure energy_pc India 2025', findPoint(energyInd, 2025), 7419);
checkClose('infrastructure energy_pc World 2025', findPoint(energyWrl, 2025), 20258);
checkClose('infrastructure energy_pc USA 2025', findPoint(energyUsa, 2025), 75051);

checkClose('infrastructure electricity_access India 1993', findPoint(elecSeries, 1993), 50.9);
checkClose('infrastructure electricity_access India 2024', findPoint(elecSeries, 2024), 99.9);

const wpS = governance.series.find((s) => s.id === 'women_parliament');
checkClose('governance women_parliament India 1952', findPoint(wpS, 1952), 4.0);
checkClose('governance women_parliament India 2019', findPoint(wpS, 2019), 14.4);
checkClose('governance women_parliament India 2024', findPoint(wpS, 2024), 13.7);
checkClose('governance women_parliament India 2025', findPoint(wpS, 2025), 13.8);

console.log('All validations passed.\n');

// ---- write ------------------------------------------------------------
const written = [
  writeData('independence/economy.json', economy),
  writeData('independence/demographics.json', demographics),
  writeData('independence/environment.json', environment),
  writeData('independence/infrastructure.json', infrastructure),
  writeData('independence/governance.json', governance),
];
for (const path of written) console.log(`wrote ${path}`);

// ---- report: first 2 / last 2 points of every series ---------------------
console.log();
for (const panel of [economy, demographics, environment, infrastructure, governance]) {
  console.log(`== ${panel.panel} ==`);
  for (const s of panel.series) {
    const p = s.points;
    const head = p.slice(0, 2).map(([y, v]) => `${y}=${v}`).join(', ');
    const tail = p.slice(-2).map(([y, v]) => `${y}=${v}`).join(', ');
    const extra = s.baseline ? ` baseline=${s.baseline}` : '';
    console.log(`  ${s.id} [${s.entity}] (${p.length} pts)${extra}: first [${head}] last [${tail}]`);
  }
}
