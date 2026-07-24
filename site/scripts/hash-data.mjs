#!/usr/bin/env node
// Content-hash the RUNTIME-FETCHED data files and write a logical→hashed manifest.
//
// Run AFTER the build-*.mjs generators and BEFORE `astro build`:
//   generators → hash-data.mjs → astro build → wrangler deploy
//
// Only files the BROWSER fetches at runtime need hashing (so /data/* can be
// cached immutably without serving stale numbers). Files that are inlined into
// HTML at build time via readFileSync (the short reads, where-india-pays,
// data-through.ts) are baked into the page and are NOT fetched by URL, so they
// are deliberately excluded — they keep their stable names and are never
// referenced at runtime.
//
// Strategy: for each logical file, compute sha256 (first 8 hex), copy to
// `name.<hash>.json` alongside the original (originals stay for the build-time
// readFileSync consumers that share a dataset, e.g. state-wise.json), and record
// the mapping. Identical content → identical hash → no re-download on rebuild.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(SITE, 'public');
const MANIFEST = path.join(SITE, 'src/lib/data-manifest.json');

// Logical URLs the browser fetches at runtime. Keep in sync with:
//   - src/lib/dashboards/specs.ts  (dashboard datasets)
//   - src/lib/beats.ts             (beats.json)
//   - src/pages/economy/read/upi-architecture.astro  (flagship read fetch())
const RUNTIME_FILES = [
  '/data/economy/product-view.json',
  '/data/economy/bank-performance.json',
  '/data/economy/upi-ecosystem.json',
  '/data/economy/state-wise.json',
  '/data/economy/mcc.json',
  '/data/economy/beats.json',
  '/data/economy/read-upi-architecture.json',
  '/data/economy/reads/shops-vs-people.json',
  '/data/meta/traffic.json',
];

const manifest = {};
let missing = 0;

for (const logical of RUNTIME_FILES) {
  const abs = path.join(PUBLIC, logical);
  if (!existsSync(abs)) {
    console.warn(`  ! missing (skipped): ${logical} — run the generators first`);
    missing++;
    continue;
  }
  const buf = readFileSync(abs);
  const hash = createHash('sha256').update(buf).digest('hex').slice(0, 8);
  const ext = path.extname(logical);
  const hashedLogical = logical.slice(0, -ext.length) + `.${hash}` + ext;
  const hashedAbs = path.join(PUBLIC, hashedLogical);
  copyFileSync(abs, hashedAbs);
  manifest[logical] = hashedLogical;
  console.log(`  ${logical}  →  ${path.basename(hashedLogical)}`);
}

// Deterministic key order so the committed baseline diff is stable.
const ordered = Object.fromEntries(Object.entries(manifest).sort());
writeFileSync(MANIFEST, JSON.stringify(ordered, null, 2) + '\n');

console.log(`\nWrote ${Object.keys(manifest).length} entries → src/lib/data-manifest.json`);
if (missing) {
  console.error(`\nERROR: ${missing} runtime data file(s) missing. Generators must run first.`);
  process.exit(1);
}
