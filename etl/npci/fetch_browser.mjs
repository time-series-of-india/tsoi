// Browser-based replacement for the transport in fetcher.py.
//
//   node fetch_browser.mjs [startYear] [endYear]     (defaults: 2026 2026)
//
// NPCI's API sits behind Akamai and now rejects plain HTTP clients (urllib,
// curl — "Access Denied"), so this drives the same paginated endpoint from a
// real chromium page context on npci.org.in. Output is identical to the
// download_*.py scripts: raw_*/{year}_{month}[_{type}].json, existing files
// skipped — so the load_*.py loaders run unchanged afterwards.
//
// Uses site/node_modules' playwright + system chromium (Pi recipe).

import { createRequire } from 'node:module';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), '../../site/package.json'));
const { chromium } = require('playwright');

const HERE = dirname(fileURLToPath(import.meta.url));
// RAW_ROOT lets a wrapper stage fetches outside the real raw_*/ dirs and only
// promote validated files (tsoi data pull).
const RAW_ROOT = process.env.RAW_ROOT ?? HERE;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const startYear = Number(process.argv[2] ?? 2026);
const endYear = Number(process.argv[3] ?? 2026);

// Mirrors the params/out-dir of each download_*.py script.
const TABS = [
  { dir: 'raw_apps',          product: 'UPI',  tab: 'upi-apps' },
  { dir: 'raw',               product: 'UPI',  tab: 'top50-member',        types: ['remitter', 'beneficiary'] },
  { dir: 'raw_p2m',           product: 'UPI',  tab: 'p2p-and-p2m-transactions' },
  { dir: 'raw_psp',           product: 'UPI',  tab: 'top-15-psps',         types: ['payer', 'payee'] },
  { dir: 'raw_mcc',           product: 'UPI',  tab: 'mcc' },
  { dir: 'raw_statewise',     product: 'UPI',  tab: 'statewise-statistic' },
  { dir: 'raw_top50_vol_val', product: 'UPI',  tab: 'top-50-mem-vol-val' },
  { dir: 'raw_imps_bank',     product: 'IMPS', tab: 'bank-performance' },
];

// Pi: system chromium at /usr/bin/chromium. Mac: fall back to playwright's
// bundled browser when no CHROMIUM_PATH is given and the Pi path is absent.
const executablePath =
  process.env.CHROMIUM_PATH ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
const browser = await chromium.launch({
  executablePath,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.goto('https://www.npci.org.in/statistics/upi/upi-ecosystem-statistics', {
  waitUntil: 'domcontentloaded', timeout: 60_000,
});

// Same pagination contract as fetcher.py's fetch_all().
async function fetchAll(params) {
  return page.evaluate(async (params) => {
    const results = [];
    for (let pageNo = 1; ; pageNo++) {
      const qs = new URLSearchParams({ ...params, page_no: pageNo, size: 100, sort_by: 'asc', locale: 'en' });
      const res = await fetch('/api/ecosystem-statistics/get-statistics?' + qs);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const j = await res.json();
      // mcc returns a single-page nested object instead of a paginated list
      // (fetcher.py's fetch_table_detail case).
      const raw = j?.data?.results ?? [];
      if (!Array.isArray(raw)) return raw.tableDetail ?? [];
      const batch = raw;
      const total = j?.data?.totalCount ?? 0;
      results.push(...batch);
      if (!batch.length || results.length >= total) return results;
      await new Promise((r) => setTimeout(r, 300));
    }
  }, params);
}

let fetched = 0, skippedExisting = 0, noData = 0;
for (const t of TABS) {
  const outDir = resolve(RAW_ROOT, t.dir);
  mkdirSync(outDir, { recursive: true });
  for (let year = startYear; year <= endYear; year++) {
    for (const month of MONTHS) {
      for (const type of t.types ?? [null]) {
        const fname = resolve(outDir, type ? `${year}_${month}_${type}.json` : `${year}_${month}.json`);
        if (existsSync(fname)) { skippedExisting++; continue; }
        const params = { product_name: t.product, tab_name: t.tab, year, month };
        if (type) params.type_name = type;
        try {
          const results = await fetchAll(params);
          if (!results.length) { console.log(`  no data: ${t.tab} ${year} ${month}${type ? ' ' + type : ''}`); noData++; continue; }
          writeFileSync(fname, JSON.stringify(results));
          console.log(`  saved: ${t.dir}/${year}_${month}${type ? '_' + type : ''}.json (${results.length} rows)`);
          fetched++;
        } catch (e) {
          console.log(`  error: ${t.tab} ${year} ${month}${type ? ' ' + type : ''} — ${e.message}`);
        }
        await new Promise((r) => setTimeout(r, 500));
      }
    }
  }
}

await browser.close();
console.log(`\nDone. fetched=${fetched} existing=${skippedExisting} no-data=${noData}`);
