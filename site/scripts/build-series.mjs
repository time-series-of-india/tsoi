// PROTOTYPE (native-dashboard spike) — build-time series extractor.
// Writes src/data/series.json: monthly volume/value per product (for the
// filterable time-series chart) + latest-month UPI statewise figures (for the
// native ECharts choropleth). Mirrors build-stats.mjs conventions.
//
// Raw units in payment_statistics: volume in lakh (1e5), value in crore (1e7).
// We emit Indian units directly so the front-end needs no unit math:
//   volume_cr  = transactions in crore   (sum(volume) / 100)
//   value_lcr  = value in lakh-crore ₹   (sum(value) / 1e5)
// Statewise: volume_mn is millions → /10 = crore; value_cr is crore.
import pg from 'pg';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA = process.env.SCHEMA_NAME || 'economy';

const client = new pg.Client({
  host: process.env.DB_HOST || '127.0.0.1',
  port: +(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'npci',
});

await client.connect();

// --- Per-product monthly series (all products in payment_statistics) ---
const { rows: prodRows } = await client.query(`
  SELECT product,
         to_char(date_trunc('month', date), 'YYYY-MM') AS month,
         SUM(volume) / 100.0  AS volume_cr,
         SUM(value)  / 1e5     AS value_lcr
  FROM ${SCHEMA}.payment_statistics
  WHERE category = 'PAYMENT TRANSACTIONS'
  GROUP BY product, date_trunc('month', date)
  ORDER BY product, date_trunc('month', date)`);

const series = {};
for (const r of prodRows) {
  (series[r.product] ??= { months: [], volume_cr: [], value_lcr: [] });
  series[r.product].months.push(r.month);
  series[r.product].volume_cr.push(+(+r.volume_cr).toFixed(2));
  series[r.product].value_lcr.push(+(+r.value_lcr).toFixed(4));
}
const products = Object.keys(series).sort();

// --- Latest-month UPI statewise (for the choropleth) ---
const { rows: swRows } = await client.query(`
  WITH md AS (SELECT MAX(date) AS d FROM ${SCHEMA}.upi_statewise_statistics)
  SELECT state,
         volume_mn / 10.0 AS volume_cr,
         value_cr,
         (SELECT to_char(d, 'FMMonth YYYY') FROM md) AS period_label,
         (SELECT d::text FROM md) AS max_date
  FROM ${SCHEMA}.upi_statewise_statistics
  WHERE date = (SELECT d FROM md) AND state <> 'UNCLASSIFIED'
  ORDER BY state`);

// GeoJSON uses "JAMMU & KASHMIR"; DB uses "JAMMU AND KASHMIR".
const geoName = (s) => s.replace(/ AND /g, ' & ');
const statewise = {
  period_label: swRows[0]?.period_label ?? '',
  max_date: swRows[0]?.max_date ?? '',
  states: swRows.map((r) => ({
    name: geoName(r.state),
    volume_cr: +(+r.volume_cr).toFixed(2),
    value_cr: +(+r.value_cr).toFixed(2),
  })),
};

await client.end();

const out = {
  __meta: { generated_at: new Date().toISOString(), schema: SCHEMA },
  products,
  series,
  statewise,
};

mkdirSync(resolve(SITE, 'src/data'), { recursive: true });
writeFileSync(resolve(SITE, 'src/data/series.json'), JSON.stringify(out) + '\n');
console.log(
  `build-series: ${products.length} products, ${statewise.states.length} states (${statewise.period_label}), schema ${SCHEMA}`
);
