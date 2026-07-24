#!/usr/bin/env node
// Local-only stand-in for the play-score worker's stats endpoint, so the
// finale's "Sharper than N% of players" line can be seen without a deployed
// worker or 50 real plays.
//
// Why a static file works: the game fetches `${PUBLIC_PLAY_API}/api/play-stats/
// <n>.json`, and with PUBLIC_PLAY_API unset that resolves to a same-origin
// /api/play-stats/<n>.json — which the Astro dev server happily serves out of
// site/public/. So writing the fixture there IS the simulator; nothing needs
// to run alongside it.
//
// The output path must never ship: in production that route belongs to the
// worker, and a static asset of the same name would shadow a real histogram
// with these invented numbers. TWO guards, because gitignore alone is not one
// — Astro copies all of public/ into dist/ whether or not git tracks it, so an
// ignored file still deploys:
//   1. site/.gitignore keeps it out of the repo, and
//   2. the `prebuild` script in package.json runs this with --clean, so every
//      `npm run build` (which is what scripts/deploy.sh calls) deletes it
//      before Astro copies public/.
//
// Usage:
//   node scripts/dev-play-stats.mjs               # puzzle 1, 400 plays
//   node scripts/dev-play-stats.mjs 1 5000        # puzzle 1, 5000 plays
//   node scripts/dev-play-stats.mjs --clean       # remove the fixtures again
//
// To exercise the REAL path instead (ingest → aggregate → serve, including the
// beacon this fixture can't test), run the worker and point the site at it:
//   cd infra/workers/play-score && npx wrangler dev
//   PUBLIC_PLAY_API=http://localhost:8787 npm run dev   # from site/
// Note the beacon is host-gated: it only fires when PUBLIC_PLAY_API is set or
// the hostname is the production one, so plain localhost never posts a score.

import { mkdir, writeFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIST_SIZE = 13; // scores 0..12, matching the worker's own constant
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '../public/api/play-stats');

if (process.argv.includes('--clean')) {
  await rm(join(dirname(OUT_DIR), 'play-stats'), { recursive: true, force: true });
  console.log('removed', OUT_DIR);
  process.exit(0);
}

const puzzle = Number(process.argv[2] || 1);
const plays = Number(process.argv[3] || 400);

// A plausible curve rather than a flat one: real players cluster low-to-middle
// (the game is designed to be hard), so the percentile line reads believably
// at every score instead of putting everyone at the 50th.
const WEIGHTS = [3, 5, 8, 12, 15, 16, 14, 11, 8, 5, 3, 2, 1];
const total = WEIGHTS.reduce((a, b) => a + b, 0);
const hist = WEIGHTS.map((w) => Math.round((w / total) * plays));
// Rounding drift lands on the mode, so `plays` and sum(hist) agree exactly —
// the client divides by `plays`, and a mismatch would skew every percentile.
hist[WEIGHTS.indexOf(Math.max(...WEIGHTS))] += plays - hist.reduce((a, b) => a + b, 0);

if (hist.length !== HIST_SIZE) throw new Error(`hist must be ${HIST_SIZE} long`);
if (plays > 0 && plays < 50) console.warn(`! plays=${plays} is under the client's 50-play floor — the finale will show the "first ~${plays} players" line instead of a percentile`);

await mkdir(OUT_DIR, { recursive: true });
const file = join(OUT_DIR, `${puzzle}.json`);
await writeFile(file, JSON.stringify({ plays, hist, updated_at: new Date().toISOString() }, null, 2));

console.log(`wrote ${file}`);
console.log(`  plays ${plays}, hist ${hist.join(',')}`);
// Same arithmetic the finale uses (below + half the bucket you landed in), so
// this table is what you should actually see on screen.
console.log('  score → percentile:');
for (let s = 0; s < HIST_SIZE; s++) {
  const below = hist.slice(0, s).reduce((a, b) => a + b, 0);
  const pct = Math.max(1, Math.min(99, Math.round((100 * (below + hist[s] / 2)) / plays)));
  console.log(`    ${String(s).padStart(2)}/12 → sharper than ${pct}% of players`);
}
