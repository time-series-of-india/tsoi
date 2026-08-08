/* One worker, one bucket, driven in process.
 *
 * Miniflare is used as a library rather than through `wrangler dev` for one
 * reason: `peaks/board-state.json` is deliberately unroutable, and most of what
 * is worth testing here is what happens when that file is stale, missing or
 * raced. A harness that could only reach it through an HTTP route would be
 * proving the route exists. Here the bucket is opened directly and the worker
 * still only ever sees requests.
 *
 * esbuild bundles first because the worker imports its weight table as a JSON
 * module, which is what wrangler's own build does before handing workerd a
 * script. */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIR = resolve(HERE, '..');
const require = createRequire(import.meta.url);
const { build } = await import(require.resolve('esbuild'));
// Miniflare comes in with wrangler rather than as a dependency of its own:
// the runtime under test should be the one the deploy uses, not a second copy
// free to drift from it.
const { Miniflare } = await import(require.resolve('miniflare'));

export const PEAKS = JSON.parse(readFileSync(resolve(DIR, 'peaks-config.json'), 'utf8'));
export const ERAS = Object.fromEntries(
  Object.entries(PEAKS.eras).map(([id, e]) => [id, e.target]),
);
export const WEIGHTS = Object.fromEntries(
  Object.entries(PEAKS.eras).map(([id, e]) => [id, e.weight]),
);
export const STATE_KEY = 'peaks/board-state.json';
export const JOURNAL = 'peaks/journal/';
export const INDEX = 'peaks/index/';
export const NIGHTLY = '30 18 * * *';
export const FIVE = '*/5 * * * *';

const bundled = await build({
  entryPoints: [resolve(DIR, 'worker.js')],
  bundle: true, format: 'esm', write: false, platform: 'neutral',
});
const SCRIPT = bundled.outputFiles[0].text;

/** A fresh worker over an empty bucket. Nothing is shared between tests. */
export async function boot() {
  const mf = new Miniflare({
    script: SCRIPT,
    modules: true,
    compatibilityDate: '2026-07-01',
    r2Buckets: { PLAY: 'tsoi-play' },
    // Not the deployed secret and not meant to be: the token is HMAC'd with
    // whatever this is, so any stable string proves the same thing.
    bindings: { MAX_PUZZLE: '1', PEAKS_KEY: 'test-key-not-a-secret' },
  });
  const R2 = await mf.getR2Bucket('PLAY');
  const worker = await mf.getWorker();

  const api = {
    mf,
    R2,
    dispose: () => mf.dispose(),
    cron: (cron = FIVE) => worker.scheduled({ cron }),
    get: (path) => mf.dispatchFetch(`http://x${path}`),
    post: (path, body) => mf.dispatchFetch(`http://x${path}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }),

    async board() {
      const r = await api.get('/api/peaks-board.json');
      return r.status === 200 ? r.json() : null;
    },
    async health() {
      const r = await api.get('/api/peaks-health.json');
      return r.status === 200 ? r.json() : null;
    },
    /** The private file, read the only way anything can read it. */
    async state() {
      const o = await R2.get(STATE_KEY);
      return o ? o.json() : null;
    },
    /** Rewrites the private file, for the drifts a test cannot cause honestly:
     *  a raced histogram, a weight table that has moved under a live board. */
    async poke(fn) {
      await R2.put(STATE_KEY, JSON.stringify(fn(await api.state())));
    },
    async count(prefix) {
      let n = 0;
      let after;
      for (;;) {
        const l = await R2.list({ prefix, startAfter: after, limit: 1000 });
        n += l.objects.length;
        if (!l.objects.length || !l.truncated) break;
        after = l.objects[l.objects.length - 1].key;
      }
      return n;
    },
    file: (pid, bests) => api.post('/api/peaks-index', { pid, bests }),
  };
  return api;
}

/** A six-era basket. `months` and `secs` may be constants or functions of the
 *  era id; `skipSecs` leaves an era untimed, the way a page cached before the
 *  clock went universal files one. */
export function basket({ months, mode = 'medium', secs = 60, skipSecs = [] } = {}) {
  const out = {};
  for (const id of Object.keys(ERAS)) {
    const m = typeof months === 'function' ? months(id) : months;
    out[id] = { months: Math.min(m, ERAS[id]), mode };
    if (!skipSecs.includes(id)) out[id].secs = typeof secs === 'function' ? secs(id) : secs;
  }
  return out;
}

/** The index a basket scores, worked out here rather than asked of the worker,
 *  so an assertion is against the formula and not against the code under it. */
export const indexOf = (bests) => Math.round(1000 * Object.entries(bests)
  .reduce((a, [id, v]) => a + WEIGHTS[id] * (v.months / ERAS[id]) * PEAKS.modes[v.mode], 0)) / 10;

export const sum = (a) => a.reduce((x, y) => x + y, 0);

/** The board's bin for an index: one per tenth, matching the worker. */
export const bin = (index) => Math.min(Math.max(Math.round(index * 10), 0), 1400);

/** A reader's rank read off the histogram the way the page reads it: everyone
 *  strictly above them, plus one. */
export const rankIn = (hist, index) => {
  let above = 0;
  for (let i = bin(index) + 1; i < hist.length; i++) above += hist[i] || 0;
  return above + 1;
};

/** The table's bucket for a total time, matching the worker. */
export const bucket = (secs) => Math.min(1439, Math.max(0, Math.floor(secs / 5)));

/** How the page reads a time table: how many at your score were faster, and
 *  how many are there at all. */
export const clockIn = (times, index, secs) => {
  const cell = times?.[String(bin(index))];
  if (!cell) return null;
  const b = bucket(secs);
  let faster = 0;
  let total = 0;
  for (const [k, n] of Object.entries(cell)) { total += n; if (Number(k) < b) faster += n; }
  return { faster, total, place: faster + 1 };
};

/** The best anyone has filed: the highest bin with anything in it. */
export const topOf = (hist) => {
  for (let i = hist.length - 1; i >= 0; i--) if (hist[i] > 0) return i / 10;
  return null;
};

/** Pids must be at least eight characters, which is the endpoint's rule and a
 *  very easy one to fail a whole test file on. */
export const pid = (name, i) => `${name}-${String(i).padStart(6, '0')}`;
