// Shared build-time plumbing for the generators: one TimescaleDB connection
// recipe and one way to write a dataset into public/data. Every build-*.mjs
// that reads the DB had its own copy of both; a fourth copy is what prompted
// lifting them here.
//
// Nothing in this module is on the serving path. The published site is static
// (see AGENTS.md) — the DB exists only to turn source data into the JSON the
// browser fetches.
import pg from 'pg';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/** The PostgreSQL schema to read. `economy_dev` for dev runs, `economy` for prod. */
export const SCHEMA = process.env.SCHEMA_NAME || 'economy';

/** Absolute path to `site/`, so callers need no import.meta.url arithmetic. */
export const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Connect to the build-time TimescaleDB and return small query helpers.
 *
 *   const { q, row, end } = await connect();
 *   const rows = await q('SELECT …', [param]);
 *   await end();
 *
 * `q` returns the rows (the `.rows` unwrap every caller was doing by hand);
 * `row` returns the first row, for the single-value lookups the generators use
 * to find a latest date.
 */
export async function connect() {
  const client = new pg.Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: +(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'npci',
  });
  await client.connect();
  const q = async (sql, params = []) => (await client.query(sql, params)).rows;
  return { client, q, row: async (sql, params = []) => (await q(sql, params))[0], end: () => client.end() };
}

/**
 * Write a dataset under `site/public/data/`, creating the directory as needed.
 * `rel` is relative to that root, e.g. 'economy/mcc.json'. Emits a
 * trailing newline (so the files diff cleanly) and returns the path written.
 */
export function writeData(rel, value) {
  const out = resolve(SITE, 'public/data', rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(value) + '\n');
  return out;
}
