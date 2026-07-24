// Builds the dataset for the "UPI: Anatomy of a Tap" read.
// Reads NPCI source JSON from ../../etl/npci and writes three small series to
// public/data/economy/read-upi-architecture.json:
//   appRace   - yearly volume per top app (bump / rank race, incl super.money)
//   bankFlow  - per bank: remitter vs beneficiary volume (slope asymmetry)
//   decline   - yearly technical vs business decline % (the divergence)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonBank } from './lib/canon-bank.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const NPCI = resolve(here, '../../etl/npci');
const OUT = resolve(here, '../public/data/economy/read-upi-architecture.json');

const load = (f) => JSON.parse(readFileSync(resolve(NPCI, f), 'utf8'));
const num = (x) => { const n = parseFloat(String(x ?? '').replace(/[%,]/g, '').trim()); return Number.isFinite(n) ? n : null; };
const cleanApp = (s) => String(s || '').replace(/\s*#\s*$/, '').replace(/\s+/g, ' ').trim()
  .replace(/^Phone\s*Pe$/i, 'PhonePe').replace(/^Google Pay$/i, 'Google Pay');

// ---- appRace: yearly volume per app, top 6 by latest year (+ super.money) ----
const apps = load('all_apps.json');
const years = [...new Set(apps.map((r) => r.year))].sort();
const byAppYear = new Map(); // app -> year -> vol
for (const r of apps) {
  const a = cleanApp(r.application_name);
  const v = num(r.total_volume_mn);
  if (!a || v == null) continue;
  if (!byAppYear.has(a)) byAppYear.set(a, new Map());
  const m = byAppYear.get(a);
  m.set(r.year, (m.get(r.year) || 0) + v);
}
const latestYear = years[years.length - 1];
const topApps = [...byAppYear.entries()]
  .sort((a, b) => (b[1].get(latestYear) || 0) - (a[1].get(latestYear) || 0))
  .slice(0, 6).map(([a]) => a);
if (!topApps.includes('super.money') && byAppYear.has('super.money')) {
  topApps[topApps.length - 1] = 'super.money';
}
const appRace = [];
for (const a of topApps) for (const y of years) {
  if (a === 'super.money' && +y < 2024) continue; // launched Aug 2024 — enters then
  const v = byAppYear.get(a)?.get(y);
  if (v != null && v > 0) appRace.push({ period: y, app: a, volume_mn: Math.round(v) });
}

// ---- bankFlow: remitter vs beneficiary volume per bank (latest 12 months) ----
const bank = load('all_data.json');
const periods = [...new Set(bank.map((r) => `${r.year}-${r.month}`))];
const MONTH_ORDER = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const months = [...new Set(bank.map((r) => JSON.stringify([r.year, r.month])))]
  .map((s) => JSON.parse(s))
  .sort((a, b) => (a[0] - b[0]) || (MONTH_ORDER.indexOf(a[1]) - MONTH_ORDER.indexOf(b[1])));
const last12 = new Set(months.slice(-12).map((m) => m.join('|')));
const inLast12 = (r) => last12.has(`${r.year}|${r.month}`);
// canonBank: raw NPCI carries casing/suffix variants of the same bank — group
// on the canonical name or one bank splits into several (pre-launch-tasks §H).
const bname = (r) => canonBank(r.upi_remitter_banks || r.upi_beneficiary_banks);
const rem = new Map(), ben = new Map();
for (const r of bank) {
  if (!inLast12(r)) continue;
  const v = num(r.total_volume_in_mn); if (v == null) continue;
  const map = r.type_name === 'remitter' ? rem : r.type_name === 'beneficiary' ? ben : null;
  if (!map) continue;
  map.set(bname(r), (map.get(bname(r)) || 0) + v);
}
const shortBank = (s) => String(s)
  .replace(/\s*Ltd\.?$/i, '').replace(/\bBank\b/i, 'Bank').trim()
  .replace('State Bank of India', 'SBI').replace('Punjab National Bank', 'PNB')
  .replace('Bank of Baroda', 'BoB');
// banks to show: union of top 5 each side
const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);
const banks = [...new Set([...top(rem), ...top(ben)])];
const bankFlow = banks.map((b) => ({
  bank: shortBank(b),
  remitter_mn: Math.round(rem.get(b) || 0),
  beneficiary_mn: Math.round(ben.get(b) || 0),
})).sort((a, b) => b.remitter_mn - a.remitter_mn);

// ---- decline: yearly vol-weighted TD & BD on the remitter side ----
const decline = [];
for (const y of [...new Set(bank.map((r) => r.year))].sort()) {
  let sv = 0, std = 0, sbd = 0;
  for (const r of bank) {
    if (r.year !== y || r.type_name !== 'remitter') continue;
    const v = num(r.total_volume_in_mn), td = num(r.td_percent), bd = num(r.bd_percent);
    if (v == null || td == null || bd == null) continue;
    sv += v; std += v * td; sbd += v * bd;
  }
  if (sv > 0) {
    decline.push({ year: y, kind: 'Technical', decline_pct: +(std / sv).toFixed(3) });
    decline.push({ year: y, kind: 'Business', decline_pct: +(sbd / sv).toFixed(3) });
  }
}

// ---- throughput: latest single-month total UPI volume (P2P + P2M) ----
const p2m = load('all_p2m.json').filter((r) => num(r.total_volume_mn) != null);
p2m.sort((a, b) => (a.year - b.year) || 0);
const monthName = (m) => ({ Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April', May: 'May', Jun: 'June', Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December' }[m] || m);
const latest = p2m[p2m.length - 1];
const throughput = { volume_mn: Math.round(num(latest.total_volume_mn)), label: `${monthName(latest.month)} ${latest.year}` };

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ appRace, bankFlow, decline, throughput }, null, 0));
console.log('throughput:', JSON.stringify(throughput));
console.log('wrote', OUT);
console.log('appRace rows:', appRace.length, '| apps:', topApps.join(', '));
console.log('bankFlow:', JSON.stringify(bankFlow));
console.log('decline:', JSON.stringify(decline));
