// Probe whether NPCI has published a given month, per statistics tab.
//
//   node probe_month.mjs [year] [monthAbbr]      (defaults: previous calendar month)
//
// Read-only: prints one "tab<TAB>rows" line per tab and writes nothing.
// Same Akamai constraint as fetch_browser.mjs — must run from a real page
// context on npci.org.in.

import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(resolve(dirname(fileURLToPath(import.meta.url)), '../../site/package.json'));
const { chromium } = require('playwright');

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const prev = new Date(); prev.setDate(1); prev.setMonth(prev.getMonth() - 1);
const year = Number(process.argv[2] ?? prev.getFullYear());
const month = process.argv[3] ?? MONTHS[prev.getMonth()];

const TABS = [
  { name: 'bank/remitter',    product: 'UPI',  tab: 'top50-member', type: 'remitter' },
  { name: 'bank/beneficiary', product: 'UPI',  tab: 'top50-member', type: 'beneficiary' },
  { name: 'apps',             product: 'UPI',  tab: 'upi-apps' },
  { name: 'p2m',              product: 'UPI',  tab: 'p2p-and-p2m-transactions' },
  { name: 'psp/payer',        product: 'UPI',  tab: 'top-15-psps', type: 'payer' },
  { name: 'psp/payee',        product: 'UPI',  tab: 'top-15-psps', type: 'payee' },
  { name: 'mcc',              product: 'UPI',  tab: 'mcc' },
  { name: 'statewise',        product: 'UPI',  tab: 'statewise-statistic' },
  { name: 'volval',           product: 'UPI',  tab: 'top-50-mem-vol-val' },
  { name: 'imps',             product: 'IMPS', tab: 'bank-performance' },
];

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

console.error(`probing NPCI for ${year} ${month}...`);
for (const t of TABS) {
  const params = { product_name: t.product, tab_name: t.tab, year, month };
  if (t.type) params.type_name = t.type;
  const r = await page.evaluate(async (params) => {
    const qs = new URLSearchParams({ ...params, page_no: 1, size: 100, sort_by: 'asc', locale: 'en' });
    const res = await fetch('/api/ecosystem-statistics/get-statistics?' + qs);
    if (!res.ok) return { err: 'HTTP ' + res.status };
    const j = await res.json();
    const raw = j?.data?.results ?? [];
    const rows = Array.isArray(raw) ? raw.length : (raw.tableDetail ?? []).length;
    return { rows, total: j?.data?.totalCount ?? rows };
  }, params);
  console.log(`${t.name}\t${r.err ?? r.total}`);
  await new Promise((res) => setTimeout(res, 500));
}
await browser.close();
