// Spec-driven dashboards — build-time tidy datasets (one file per dashboard,
// lazy-loaded by the dashboard island at runtime → site never loads heavy).
// Long/tidy format: rows of {dimensions..., measures...}; the generic resolver
// filters/groups/pivots client-side. Mirrors build-stats.mjs conventions.
//
// Raw units: payment_statistics volume in lakh (1e5), value in crore (1e7).
//   volume_cr = sum(volume)/100 ; value_lcr = sum(value)/1e5
// statewise: volume_mn millions → /10 = crore ; value_cr already crore.
import pg from 'pg';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA = process.env.SCHEMA_NAME || 'economy';
const OUT = resolve(SITE, 'public/data/economy');

const client = new pg.Client({
  host: process.env.DB_HOST || '127.0.0.1',
  port: +(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'npci',
});
await client.connect();
mkdirSync(OUT, { recursive: true });

// --- product-view: category × sub_category × product × DAY, volume + value ---
// Daily granularity so the runtime can aggregate client-side to day / month /
// quarter / year (the dashboards' Aggregate control). The resolver derives the
// period bucket from `date`; distinct dates give avg-daily denominators.
// volume_cr = crore txns; value_lcr = ₹ lakh-crore. Exclude the current
// (incomplete) calendar month — a partial month dips the trailing point.
{
  const { rows } = await client.query(`
    SELECT category, sub_category, product,
           to_char(date, 'YYYY-MM-DD')         AS date,
           round(SUM(volume) / 100.0, 2)::float8 AS volume_cr,
           round(SUM(value)  / 1e5, 4)::float8   AS value_lcr
    FROM ${SCHEMA}.payment_statistics
    WHERE date < date_trunc('month', CURRENT_DATE)
    GROUP BY category, sub_category, product, date
    ORDER BY product, date`);
  writeFileSync(resolve(OUT, 'product-view.json'), JSON.stringify({ rows }) + '\n');
  console.log(`product-view: ${rows.length} rows`);
}

// --- state-wise: state × month, volume_cr + value_cr ---
{
  const { rows } = await client.query(`
    SELECT replace(state, ' AND ', ' & ') AS state,
           to_char(date_trunc('month', date), 'YYYY-MM') AS month,
           round(volume_mn / 10.0, 2)::float8 AS volume_cr,
           round(value_cr, 2)::float8         AS value_cr
    FROM ${SCHEMA}.upi_statewise_statistics
    WHERE state <> 'UNCLASSIFIED'
    ORDER BY month, state`);
  writeFileSync(resolve(OUT, 'state-wise.json'), JSON.stringify({ rows }) + '\n');
  console.log(`state-wise: ${rows.length} rows`);
}

// --- bank-performance: bank × month, per "system" (UPI Remitter / UPI Beneficiary
// / IMPS). Monthly source → emit `date` (first-of-month) for the period control.
// volume_mn/10 = crore; bd_pct/td_pct are decline rates (averaged, not summed,
// when the runtime aggregates to Q/Y). Mirrors the live "UPI & IMPS — Bank
// Performance" Grafana dashboard but spans both UPI sides + IMPS. ---
{
  const { rows } = await client.query(`
    SELECT CASE type_name WHEN 'remitter' THEN 'UPI Remitter'
                          WHEN 'beneficiary' THEN 'UPI Beneficiary' END AS system,
           bank_name AS bank, to_char(date, 'YYYY-MM-DD') AS date,
           round(volume_mn / 10.0, 2)::float8 AS volume_cr,
           round(bd_pct::numeric, 2)::float8  AS bd_pct,
           round(td_pct::numeric, 2)::float8  AS td_pct
    FROM ${SCHEMA}.upi_bank_statistics
    WHERE date < date_trunc('month', CURRENT_DATE)
    UNION ALL
    SELECT 'IMPS', bank_name, to_char(date, 'YYYY-MM-DD'),
           round(volume_mn / 10.0, 2)::float8,
           round(bd_pct::numeric, 2)::float8, round(td_pct::numeric, 2)::float8
    FROM ${SCHEMA}.imps_bank_performance
    WHERE date < date_trunc('month', CURRENT_DATE)
    ORDER BY system, bank, date`);
  writeFileSync(resolve(OUT, 'bank-performance.json'), JSON.stringify({ rows }) + '\n');
  console.log(`bank-performance: ${rows.length} rows`);
}

// --- upi-ecosystem: one tidy file holding both `app` and `psp` entity kinds
// (the runtime filters by kind via encoding.where). Apps carry volume + value;
// PSPs carry volume + a payer/payee side. volume_mn/10 = crore; value already
// crore. Monthly source → M/Q/Y aggregation. ---
{
  const { rows } = await client.query(`
    SELECT 'app' AS kind, app_name AS name, NULL AS psp_type,
           to_char(date, 'YYYY-MM-DD') AS date,
           round(total_volume_mn / 10.0, 2)::float8  AS volume_cr,
           round(total_value_cr::numeric, 2)::float8 AS value_cr
    FROM ${SCHEMA}.upi_app_statistics
    WHERE total_volume_mn IS NOT NULL AND date < date_trunc('month', CURRENT_DATE)
    UNION ALL
    SELECT 'psp', psp_name, type_name, to_char(date, 'YYYY-MM-DD'),
           round(volume_mn / 10.0, 2)::float8, NULL
    FROM ${SCHEMA}.upi_psp_statistics
    WHERE date < date_trunc('month', CURRENT_DATE)
    ORDER BY kind, name, date`);
  writeFileSync(resolve(OUT, 'upi-ecosystem.json'), JSON.stringify({ rows }) + '\n');
  console.log(`upi-ecosystem: ${rows.length} rows`);
}

// --- reads: tiny monthly hero-chart series for the editorial /economy Read
// pages (keeps them light — the full product-view.json is 5 MB). One `key` per
// line (UPI / NEFT / RTGS / Credit Card, plus the Settlement Systems category
// total). `date` is first-of-month so the runtime formats it monthly. ---
{
  const { rows } = await client.query(`
    SELECT product AS key, to_char(date_trunc('month', date), 'YYYY-MM-01') AS date,
           round(SUM(volume) / 100.0, 2)::float8 AS volume_cr,
           round(SUM(value)  / 1e5, 4)::float8   AS value_lcr
    FROM ${SCHEMA}.payment_statistics
    WHERE product IN ('UPI', 'NEFT', 'RTGS', 'Credit Card') AND date < date_trunc('month', CURRENT_DATE)
    GROUP BY product, date_trunc('month', date)
    UNION ALL
    SELECT 'Settlement Systems', to_char(date_trunc('month', date), 'YYYY-MM-01'),
           round(SUM(volume) / 100.0, 2)::float8, round(SUM(value) / 1e5, 4)::float8
    FROM ${SCHEMA}.payment_statistics
    WHERE category = 'Settlement Systems' AND date < date_trunc('month', CURRENT_DATE)
    GROUP BY date_trunc('month', date)
    ORDER BY key, date`);
  writeFileSync(resolve(OUT, 'reads.json'), JSON.stringify({ rows }) + '\n');
  console.log(`reads: ${rows.length} rows`);
}

// --- beats: tiny precomputed series, one per editorial "beat" (swipe deck).
// Each key holds the rows for that beat's single chart. All yearly/snapshot and
// full-year only (current partial year excluded), so the charts are clean. ---
{
  const q = async (sql) => (await client.query(sql)).rows;
  const beats = {};
  // 1. UPI's rise — yearly volume (crore txns)
  beats['upi-rise'] = await q(`
    SELECT extract(year FROM date)::int::text AS year, round(SUM(volume) / 100.0)::float8 AS volume_cr
    FROM ${SCHEMA}.payment_statistics WHERE product = 'UPI' AND extract(year FROM date) BETWEEN 2021 AND 2025
    GROUP BY 1 ORDER BY 1`);
  // 2. Credit vs Debit card — yearly volume, two series (the crossover)
  beats['credit-debit'] = await q(`
    SELECT product AS key, extract(year FROM date)::int::text AS year, round(SUM(volume) / 100.0)::float8 AS volume_cr
    FROM ${SCHEMA}.payment_statistics WHERE product IN ('Credit Card', 'Debit Card') AND extract(year FROM date) BETWEEN 2021 AND 2025
    GROUP BY 1, 2 ORDER BY 1, 2`);
  // 3. Ticket size by rail — latest full year (₹ per txn)
  beats['ticket-spread'] = await q(`
    SELECT product AS key, round(SUM(value) / NULLIF(SUM(volume), 0) * 100)::float8 AS ticket_rs
    FROM ${SCHEMA}.payment_statistics
    WHERE product IN ('RTGS', 'NEFT', 'IMPS', 'Credit Card', 'Debit Card', 'UPI', 'NETC')
      AND date >= '2025-01-01' AND date < '2026-01-01'
    GROUP BY 1`);
  // 4. UPI reliability — volume soaring vs technical-failure rate falling.
  // Technical decline only (system unavailability), volume-weighted across banks
  // (the honest, what-a-user-experiences rate — not the unweighted bank average).
  beats['reliability'] = await q(`
    WITH vol AS (
      SELECT extract(year FROM date)::int yr, round(SUM(volume) / 100.0)::float8 volume_cr
      FROM ${SCHEMA}.payment_statistics
      WHERE product = 'UPI' AND extract(year FROM date) BETWEEN 2022 AND 2025
      GROUP BY 1),
    rel AS (
      SELECT extract(year FROM date)::int yr,
             round((sum(td_pct * volume_mn) / nullif(sum(volume_mn), 0))::numeric, 2)::float8 td_pct
      FROM ${SCHEMA}.upi_bank_statistics
      WHERE type_name = 'remitter' AND extract(year FROM date) BETWEEN 2022 AND 2025
      GROUP BY 1)
    SELECT vol.yr::text AS year, vol.volume_cr, rel.td_pct
    FROM vol JOIN rel USING (yr) ORDER BY 1`);
  // 5. App duopoly — yearly volume share %, PhonePe / Google Pay / Paytm / Other
  beats['app-share'] = await q(`
    WITH t AS (
      SELECT extract(year FROM date)::int yr,
             CASE WHEN app_name IN ('PhonePe', 'Google Pay', 'Paytm') THEN app_name ELSE 'Other' END AS key,
             SUM(total_volume_mn) v
      FROM ${SCHEMA}.upi_app_statistics
      WHERE total_volume_mn IS NOT NULL AND extract(year FROM date) BETWEEN 2022 AND 2025
      GROUP BY 1, 2),
    tot AS (SELECT yr, SUM(v) total FROM t GROUP BY yr)
    -- exact (un-rounded) share so the stacked top sums to a clean 100% each year
    SELECT t.yr::text AS year, t.key, (t.v / tot.total * 100)::float8 AS share_pct
    FROM t JOIN tot USING (yr) ORDER BY year, key`);
  // 6. Cash is sticky — yearly cash-withdrawal volume (crore)
  beats['cash'] = await q(`
    SELECT extract(year FROM date)::int::text AS year, round(SUM(volume) / 100.0)::float8 AS volume_cr
    FROM ${SCHEMA}.payment_statistics WHERE category = 'CASH WITHDRAWAL' AND extract(year FROM date) BETWEEN 2021 AND 2025
    GROUP BY 1 ORDER BY 1`);
  // 7. Two economies — the rank flip: a category's rank by transaction COUNT vs
  // by VALUE (latest month). Everyday taps (fast food, pharmacy) sink; stocks and
  // loan repayments rise. The slope chart connects each category's two ranks.
  beats['spend'] = await q(`
    WITH l AS (SELECT max(date) d FROM ${SCHEMA}.upi_mcc_statistics)
    SELECT (CASE mcc
        WHEN '5411' THEN 'Groceries'
        WHEN '5814' THEN 'Fast food'
        WHEN '5541' THEN 'Fuel'
        WHEN '5912' THEN 'Pharmacy'
        WHEN '7322' THEN 'Loan repay'
        WHEN '6211' THEN 'Stocks'
      END) AS key,
      round(volume_mn)::float8 AS vol_mn,
      round(value_cr)::float8 AS value_cr
    FROM ${SCHEMA}.upi_mcc_statistics, l
    WHERE date = l.d AND mcc IN ('5411','5814','5541','5912','7322','6211')`);
  // 8. The shift — six big UPI categories ranked against each other, year by year.
  // The bump chart ranks within these rows per year; only the yearly volume matters
  // (5411 covers all the grocery label variants). Groceries holds #1 throughout
  // while fast food climbs and stocks / loan repayments sink.
  beats['rank-shift'] = await q(`
    SELECT extract(year FROM date)::int::text AS year,
      (CASE mcc
        WHEN '5411' THEN 'Groceries'
        WHEN '5814' THEN 'Fast food'
        WHEN '5812' THEN 'Restaurants'
        WHEN '5912' THEN 'Pharmacy'
        WHEN '7322' THEN 'Loan/debt'
        WHEN '6211' THEN 'Stocks'
      END) AS key,
      round(SUM(volume_mn))::float8 AS volume_mn
    FROM ${SCHEMA}.upi_mcc_statistics
    WHERE mcc IN ('5411','5814','5812','5912','7322','6211')
      AND extract(year FROM date) BETWEEN 2018 AND 2025
    GROUP BY 1, 2 ORDER BY 1, 2`);
  writeFileSync(resolve(OUT, 'beats.json'), JSON.stringify(beats) + '\n');
  console.log(`beats: ${Object.keys(beats).length} beats`);
}

await client.end();
