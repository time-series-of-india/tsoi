// Builds per-read datasets for the short-form Reads, from NPCI source JSON in
// ../../etl/npci, into public/data/economy/reads/{slug}.json. Each read fetches
// its own small file at runtime. (Parity caveat: reads raw NPCI JSON, not the
// DB — same caveat as the UPI-architecture generator.)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonBank } from './lib/canon-bank.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const NPCI = resolve(here, '../../etl/npci');
const OUTDIR = resolve(here, '../public/data/economy/reads');
const load = (f) => JSON.parse(readFileSync(resolve(NPCI, f), 'utf8'));
const num = (x) => { const n = parseFloat(String(x ?? '').replace(/[%,]/g, '').trim()); return Number.isFinite(n) ? n : null; };
const FULL = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MO = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
mkdirSync(OUTDIR, { recursive: true });
const write = (slug, obj) => { writeFileSync(resolve(OUTDIR, `${slug}.json`), JSON.stringify(obj)); console.log(slug, '->', JSON.stringify(obj.stats)); };

// ---------- MCC dashboard dataset (what India buys on UPI) -> economy/mcc.json ----------
{
  const SHORT = {
    'Groceries and supermarkets': 'Groceries',
    'Fast food restaurants': 'Fast food',
    'Eating places and restaurants': 'Restaurants',
    'Service stations (with or without ancillary services)': 'Fuel stations',
    'Drug stores and pharmacies': 'Pharmacies',
    'Cigar shops and stands': 'Tobacco shops',
    'Purchase of digital gold': 'Digital gold',
    'Dairies': 'Dairies', 'Bakeries': 'Bakeries',
  };
  // NPCI's telecom MCC description varies in wording and casing across months
  const shortMcc = (s) => /^telecommunication services\b/i.test(String(s).trim()) ? 'Telecom'
    : SHORT[s] || String(s).replace(/\s*\(.*?\)\s*/g, '').replace(/,.*$/, '').trim();
  // NPCI's descriptions drift across months (casing runs Apr–Aug 2025, padding,
  // outright renames: 5411 published as "Grocery Stores, Supermarkets" in Jan
  // 2026). Grouping on the description splits one category into several, leaving
  // holes in its series. The MCC code is the stable key: canonical label per
  // code = its most frequent description across all months, then SHORT-mapped.
  const rows = load('all_mcc.json');
  const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
  const skip = (r, desc) => !r.mcc || String(r.mcc).trim() === '0' || !desc || /^(total|others)$/i.test(desc);
  const freq = new Map(); // mcc code -> Map<description, row count>
  for (const r of rows) {
    const desc = norm(r.description);
    if (skip(r, desc)) continue;
    const m = freq.get(r.mcc) ?? new Map();
    m.set(desc, (m.get(desc) ?? 0) + 1);
    freq.set(r.mcc, m);
  }
  const canon = new Map(); // mcc code -> display category
  for (const [mcc, m] of freq) canon.set(mcc, shortMcc([...m.entries()].sort((a, b) => b[1] - a[1])[0][0]));
  const agg = new Map();
  for (const r of rows) {
    const desc = norm(r.description);
    if (skip(r, desc)) continue;
    const cat = canon.get(r.mcc);
    const vol = num(r.volume_in_mn), val = num(r.value_in_cr);
    const date = `${r.year}-${String(MO[r.month] || 0).padStart(2, '0')}`;
    const key = `${date}|${cat}`;
    if (!agg.has(key)) agg.set(key, { category: cat, date, volume_cr: 0, value_cr: 0 });
    const o = agg.get(key); o.volume_cr += (vol || 0) / 10; o.value_cr += (val || 0);
  }
  const out = [...agg.values()].map((o) => ({ ...o, volume_cr: +o.volume_cr.toFixed(2), value_cr: +o.value_cr.toFixed(2) }));
  writeFileSync(resolve(OUTDIR, '../mcc.json'), JSON.stringify({ rows: out }));
  console.log('mcc.json rows:', out.length);

  // derive the "what India buys" read from the same data. Ranks use the
  // unrounded aggregates: early-UPI monthly volumes are hundredths of a crore,
  // so ranking the rounded dashboard rows is tie-break noise among zeros. Fast
  // food recorded no UPI volume at all in 2017; its "early" rank comes from the
  // first full year it registers (2018), summed across that year.
  const rowsU = [...agg.values()];
  const dates = [...new Set(rowsU.map((r) => r.date))].sort();
  const lm = dates[dates.length - 1];
  const volAt = (date) => { const m = {}; for (const r of rowsU) if (r.date === date) m[r.category] = (m[r.category] || 0) + r.volume_cr; return m; };
  const volYear = (year) => { const m = {}; for (const r of rowsU) if (r.date.startsWith(year)) m[r.category] = (m[r.category] || 0) + r.volume_cr; return m; };
  const years = [...new Set(dates.map((d) => d.slice(0, 4)))].sort();
  const y0 = years.find((y) => (volYear(y)['Fast food'] || 0) > 0) ?? years[0];
  const lmv = volAt(lm), y0v = volYear(y0);
  const totLm = Object.values(lmv).reduce((a, b) => a + b, 0);
  const FOODS = new Set(['Groceries', 'Fast food', 'Restaurants', 'Bakeries', 'Dairies']);
  const topCats = Object.entries(lmv).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([category, volume_cr]) => ({ category, volume_cr: +volume_cr.toFixed(1), food: FOODS.has(category) }));
  const rankIn = (mv, cat) => Object.entries(mv).sort((a, b) => b[1] - a[1]).findIndex(([c]) => c === cat) + 1;
  write('what-india-buys', {
    topCats,
    stats: {
      asOf: `${FULL[+lm.split('-')[1]]} ${lm.split('-')[0]}`,
      groceriesShare: Math.round(100 * (lmv.Groceries || 0) / totLm),
      foodShare: Math.round(100 * Object.entries(lmv).filter(([c]) => FOODS.has(c)).reduce((a, [, v]) => a + v, 0) / totLm),
      fastFoodNow: rankIn(lmv, 'Fast food'), fastFoodEarly: rankIn(y0v, 'Fast food'), earlyYear: y0.split('-')[0],
    },
  });
}

// ---------- shops-vs-people: P2P vs P2M share over time ----------
{
  const recs = [];
  for (const r of load('all_p2m.json')) {
    const pv = num(r.p_2_p_volume_mn), mv = num(r.p_2_m_volume_mn), pval = num(r.p_2_p_value_cr), mval = num(r.p_2_m_value_cr);
    if (pv == null || mv == null) continue;
    recs.push({ y: +r.year, m: MO[r.month] || 0, pv, mv, pval, mval });
  }
  recs.sort((a, b) => a.y - b.y || a.m - b.m);
  const shareRows = [];
  for (const r of recs) {
    const date = `${r.y}-${String(r.m).padStart(2, '0')}`;
    const mpct = +(100 * r.mv / (r.pv + r.mv)).toFixed(1);
    shareRows.push({ date, kind: 'Merchant', share_pct: mpct });
    shareRows.push({ date, kind: 'Person-to-person', share_pct: +(100 - mpct).toFixed(1) });
  }
  const cross = recs.find((r) => r.mv > r.pv);
  const last = recs[recs.length - 1];
  const tot = last.pv + last.mv, tval = (last.pval || 0) + (last.mval || 0);
  write('shops-vs-people', {
    shareRows,
    stats: {
      asOf: `${FULL[last.m]} ${last.y}`,
      crossover: `${FULL[cross.m]} ${cross.y}`,
      crossDate: `${cross.y}-${String(cross.m).padStart(2, '0')}`,
      volPctM: Math.round(100 * last.mv / tot),
      valPctM: Math.round(100 * (last.mval || 0) / tval),
      ticketP2P: Math.round(last.pval * 1e7 / (last.pv * 1e6)),
      ticketP2M: Math.round(last.mval * 1e7 / (last.mv * 1e6)),
    },
  });
}

// ---------- duel: app rank race over years (top apps + super.money) ----------
{
  const apps = load('all_apps.json');
  const cleanApp = (s) => String(s || '').replace(/\s*#\s*$/, '').replace(/\s+/g, ' ').trim().replace(/^Phone\s*Pe$/i, 'PhonePe');
  const years = [...new Set(apps.map((r) => r.year))].sort();
  const byAppYear = new Map();
  for (const r of apps) {
    const a = cleanApp(r.application_name); const v = num(r.total_volume_mn);
    if (!a || v == null) continue;
    if (!byAppYear.has(a)) byAppYear.set(a, new Map());
    const m = byAppYear.get(a); m.set(r.year, (m.get(r.year) || 0) + v);
  }
  const ly = years[years.length - 1];
  const topApps = [...byAppYear.entries()].sort((a, b) => (b[1].get(ly) || 0) - (a[1].get(ly) || 0)).slice(0, 6).map(([a]) => a);
  if (!topApps.includes('super.money') && byAppYear.has('super.money')) topApps[topApps.length - 1] = 'super.money';
  const appRace = [];
  for (const a of topApps) for (const y of years) {
    if (a === 'super.money' && +y < 2024) continue;
    const v = byAppYear.get(a)?.get(y);
    if (v != null && v > 0) appRace.push({ period: y, app: a, volume_mn: Math.round(v) });
  }
  // latest-year shares (vs all apps) for the pull-stat
  const allTot = [...byAppYear.values()].reduce((s, m) => s + (m.get(ly) || 0), 0);
  const share = (a) => Math.round(100 * (byAppYear.get(a)?.get(ly) || 0) / allTot);
  write('duel', {
    appRace,
    stats: { asOf: ly, phonepe: share('PhonePe'), gpay: share('Google Pay'), top2: share('PhonePe') + share('Google Pay'), newcomer: 'super.money' },
  });
}

// ---------- credit-vs-debit: the card divergence ----------
{
  const rows = JSON.parse(readFileSync(resolve(here, '../public/data/economy/product-view.json'), 'utf8')).rows
    .filter((r) => r.category === 'PAYMENT TRANSACTIONS' && (r.product === 'Credit Card' || r.product === 'Debit Card'));
  const m = {};
  for (const r of rows) { const ym = String(r.date).slice(0, 7); (m[ym] ??= {}); m[ym][r.product] = (m[ym][r.product] || 0) + (r.volume_cr || 0); }
  const months = Object.keys(m).sort();
  const cardRows = [];
  for (const ym of months) {
    cardRows.push({ date: ym, card: 'Credit cards', volume_cr: +(m[ym]['Credit Card'] || 0).toFixed(2) });
    cardRows.push({ date: ym, card: 'Debit cards', volume_cr: +(m[ym]['Debit Card'] || 0).toFixed(2) });
  }
  const debit = (k) => m[k]['Debit Card'] || 0, credit = (k) => m[k]['Credit Card'] || 0;
  const peak = months.reduce((a, k) => (debit(k) > debit(a) ? k : a), months[0]);
  const cross = months.find((k) => credit(k) > debit(k));
  const lm = months[months.length - 1];
  const [Y, M] = (cross || lm).split('-');
  write('credit-vs-debit', {
    cardRows,
    stats: {
      asOf: `${FULL[+lm.split('-')[1]]} ${lm.split('-')[0]}`,
      crossover: `${FULL[+M]} ${Y}`, crossDate: cross,
      debitDropPct: Math.round(100 * (1 - debit(lm) / debit(peak))),
      creditVsDebit: +(credit(lm) / debit(lm)).toFixed(1),
    },
  });
}

// ---------- how-india-moves: payment mix by count vs value (two donuts) ----------
{
  const rows = JSON.parse(readFileSync(resolve(here, '../public/data/economy/product-view.json'), 'utf8')).rows
    .filter((r) => r.category === 'PAYMENT TRANSACTIONS');
  const mv = {}, vv = {};
  for (const r of rows) {
    const ym = String(r.date).slice(0, 7), p = r.product;
    (mv[ym] ??= {}); (vv[ym] ??= {});
    mv[ym][p] = (mv[ym][p] || 0) + (r.volume_cr || 0);
    vv[ym][p] = (vv[ym][p] || 0) + (r.value_lcr || 0);
  }
  const lm = Object.keys(mv).sort().reverse().find((m) => (mv[m].UPI || 0) > 0);
  const mixRows = Object.keys(mv[lm]).map((product) => ({ product, volume_cr: +mv[lm][product].toFixed(2), value_lcr: +(vv[lm][product] || 0).toFixed(4) }));
  const totV = Object.values(mv[lm]).reduce((a, b) => a + b, 0), totVal = Object.values(vv[lm]).reduce((a, b) => a + b, 0);
  const pctV = (p) => Math.round(100 * (mv[lm][p] || 0) / totV), pctVal = (p) => Math.round(100 * (vv[lm][p] || 0) / totVal);
  const ticket = (p) => Math.round((vv[lm][p] || 0) / (mv[lm][p] || 1) * 1e5); // ₹ = lakh-crore / crore * 1e5
  const [Y, M] = lm.split('-');
  write('how-india-moves', {
    mixRows,
    stats: {
      asOf: `${FULL[+M]} ${Y}`,
      upiVolShare: pctV('UPI'), upiValShare: pctVal('UPI'),
      rtgsValShare: pctVal('RTGS'), rtgsVolShare: +(100 * (mv[lm].RTGS || 0) / totV).toFixed(1),
      upiTicket: ticket('UPI'), rtgsTicket: ticket('RTGS'),
    },
  });
}

// ---------- where-money-lands: remitter vs beneficiary bank asymmetry (slope) ----------
{
  const d = load('all_data.json');
  const ms = [...new Set(d.map((r) => JSON.stringify([+r.year, MO[r.month] || 0])))].map((s) => JSON.parse(s)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const [ly, lm] = ms[ms.length - 1];
  const inLatest = (r) => +r.year === ly && (MO[r.month] || 0) === lm;
  // canonBank: raw NPCI carries casing/suffix variants of the same bank — group
  // on the canonical name or one bank splits into several (pre-launch-tasks §H).
  const nameOf = (r) => canonBank(r.upi_remitter_banks || r.upi_beneficiary_banks);
  const rem = new Map(), ben = new Map();
  for (const r of d) {
    if (!inLatest(r)) continue;
    const v = num(r.total_volume_in_mn); if (v == null) continue;
    const m = r.type_name === 'remitter' ? rem : r.type_name === 'beneficiary' ? ben : null;
    if (m) m.set(nameOf(r), (m.get(nameOf(r)) || 0) + v);
  }
  const short = (s) => String(s).replace(/\s*Ltd\.?$/i, '').replace('State Bank of India', 'SBI').replace('Punjab National Bank', 'PNB').replace('Bank of Baroda', 'BoB').replace('Union Bank of India', 'Union Bank').replace(/india post payments bank/i, 'India Post').trim();
  const topN = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);
  const banks = [...new Set([...topN(rem), ...topN(ben)])];
  const bankFlow = banks.map((b) => ({ bank: short(b), remitter_mn: Math.round(rem.get(b) || 0), beneficiary_mn: Math.round(ben.get(b) || 0) })).sort((a, b) => b.remitter_mn - a.remitter_mn);
  const rankOf = (m, k) => { const arr = [...m.entries()].sort((a, b) => b[1] - a[1]); return { rank: arr.findIndex(([n]) => n === k) + 1, vol: Math.round(m.get(k) || 0) }; };
  const findKey = (frag) => [...new Set([...rem.keys(), ...ben.keys()])].find((k) => k.toLowerCase().includes(frag));
  const yesK = findKey('yes'), sbiK = findKey('state bank');
  const yesPay = rankOf(rem, yesK), yesRecv = rankOf(ben, yesK), sbiPay = rankOf(rem, sbiK), sbiRecv = rankOf(ben, sbiK);
  // ratio over a trailing 12 months (robust; latest single month swings 44-54x)
  const win = new Set(ms.slice(-12).map((m) => m.join('|')));
  let yRem12 = 0, yBen12 = 0;
  for (const r of d) {
    if (!win.has([+r.year, MO[r.month] || 0].join('|')) || !/yes/i.test(nameOf(r) || '')) continue;
    const v = num(r.total_volume_in_mn); if (v == null) continue;
    if (r.type_name === 'remitter') yRem12 += v; else if (r.type_name === 'beneficiary') yBen12 += v;
  }
  write('where-money-lands', {
    bankFlow,
    stats: {
      asOf: `${FULL[lm]} ${ly}`,
      yesPayRank: yesPay.rank, yesRecvRank: yesRecv.rank,
      yesRatio: Math.round(yBen12 / Math.max(yRem12, 1)),
      sbiPayRank: sbiPay.rank, sbiRecvRank: sbiRecv.rank,
    },
  });
}

// ---------- bank-reliability: technical declines of the busiest banks ----------
// Trailing-12-month AVERAGES (not a single month) so no bank is unfairly flagged
// on a one-off spike. Framing is the spread + the improvement, not a "worst" bank.
{
  const d = load('all_data.json').filter((r) => r.type_name === 'remitter');
  const ymOf = (r) => [+r.year, MO[r.month] || 0];
  const months = [...new Set(d.map((r) => JSON.stringify(ymOf(r))))].map((s) => JSON.parse(s)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const win = new Set(months.slice(-12).map((m) => m.join('|')));
  const inWin = (r) => win.has(ymOf(r).join('|'));
  const short = (s) => String(s).replace(/\s*Ltd\.?$/i, '').replace('State Bank of India', 'SBI').replace('Punjab National Bank', 'PNB').replace('Bank of Baroda', 'BoB').replace('Union Bank of India', 'Union Bank').replace(/india post payments bank/i, 'India Post').replace(/Payments Bank$/i, 'Payments Bk').trim();
  const vol = new Map(), tds = new Map();
  let sv = 0, sw = 0;
  for (const r of d) {
    if (!inWin(r)) continue;
    const v = num(r.total_volume_in_mn), t = num(r.td_percent), b = canonBank(r.upi_remitter_banks);
    if (v != null) vol.set(b, (vol.get(b) || 0) + v);
    if (t != null) { if (!tds.has(b)) tds.set(b, []); tds.get(b).push(t); }
    if (v != null && t != null) { sv += v; sw += v * t; }
  }
  // overall rate users actually experience = latest-month, volume-weighted, all banks
  // (the 12-mo all-bank weighted figure is higher because small banks + SBI pull it up;
  //  that would sit above most big-bank bars and mislead, so we report the current rate)
  const [lyy, lmm] = months[months.length - 1];
  let svN = 0, swN = 0;
  for (const r of d) { if (+r.year === lyy && (MO[r.month] || 0) === lmm) { const v = num(r.total_volume_in_mn), t = num(r.td_percent); if (v != null && t != null) { svN += v; swN += v * t; } } }
  void sv; void sw;
  const networkAvg = +(swN / svN).toFixed(2);
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const busiest = [...vol.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([b]) => b);
  const banks = busiest.map((b) => ({ bank: short(b), td_pct: +mean(tds.get(b) || [0]).toFixed(2) })).sort((a, b) => b.td_pct - a.td_pct);
  // network TD in 2022 (vol-weighted) for the "improving" line
  let sv0 = 0, sw0 = 0;
  for (const r of d) { if (+r.year !== 2022) continue; const v = num(r.total_volume_in_mn), t = num(r.td_percent); if (v != null && t != null) { sv0 += v; sw0 += v * t; } }
  const old2022 = +(sw0 / sv0).toFixed(2);
  const oneIn = (p) => Math.round(100 / p);
  const [ly, lm] = months[months.length - 1];
  write('bank-reliability', {
    banks,
    stats: {
      asOf: `${FULL[lm]} ${ly}`,
      networkAvg, oneInNetwork: oneIn(networkAvg),
      high: banks[0].td_pct, oneInHigh: oneIn(banks[0].td_pct),
      low: banks[banks.length - 1].td_pct,
      old2022, oneInOld: oneIn(old2022),
    },
  });
}
