// tsoi-play-score — see wrangler.toml header for the design summary.
// Invariant: the game never depends on this worker; every failure here
// degrades to "the percentile line is absent" on the finale screen.

import PEAKS from './peaks-config.json';

const HIST_SIZE = 13; // scores 0..12 (4 rounds × 0–3 pts)
const COUNT_CAP = 1_000_000; // per-puzzle poisoning ceiling
const RUN_CAP = 5000; // raw objects per aggregation run; backlog drains next run

const statsKey = (p) => `stats/p${p}.json`;
const rawPrefix = (p) => `raw/p${p}/`;

/* ── Inflation Peaks ───────────────────────────────────────────────────── */

// Flat-ground top speed is ~7.5 months/s on Medium and ~8.6 on Hard, and
// downhill bursts run past both; 20 months/s sustained over a whole run is
// not reachable. This kills one-line curl forgery, not fractions of a second.
const MIN_MS_PER_MONTH = 50;
const TOKEN_TTL_MS = 6 * 60 * 60 * 1000; // a tab left open over lunch still files
const PEAKS_MODES = Object.keys(PEAKS.modes);
const PEAKS_ERAS = Object.keys(PEAKS.eras);
/* One bin per tenth of an index, 0.0 to 140.0, the ceiling being all six
   stretches cleared on Hard. A tenth rather than a whole point because the
   histogram is now the only thing the board publishes, and a reader's position
   is read off it: at a whole point, "342nd" would mean "somewhere inside a bin
   of forty people" while printing as though it did not. A tenth is the
   precision the index itself is published at, so a shared bin is a real tie. */
const BOARD_HIST_SIZE = 1401;

/* The clock, for the top of the curve only.

   The index saturates: there are only so many months and the ceiling is 140.0,
   so once people are good the score stops separating them. Duration does not
   saturate, which is why every run is timed. But a time table for the WHOLE
   curve is the wrong instrument twice over. It is large — at a hundred
   thousand filings, 129KB gzipped against the board's own 0.1KB — and it
   stops working exactly as the board succeeds, because the popular scores
   hold hundreds of people whose totals cluster inside a few seconds of each
   other. Measured: a five-second bucket leaves 5% of ties unresolved at a
   thousand filings and 85% at a hundred thousand.

   The top does not behave that way. Scores up there are sparse, ties are
   small, and a clock settles almost all of them. So the table covers the
   leading TIME_COVER players and nobody else: under 3KB gzipped at every
   board size from a thousand to a hundred thousand, resolving 90 to 97% of
   the ties in the band where a tie actually stings. Cut by player count
   rather than by index, so it covers the same crowd whatever shape the board
   takes. */
const TIME_COVER = 1000;
const TIME_BUCKET_S = 5;
const TIME_BUCKETS = 1440; // 5s buckets to two hours; anything longer piles into the last
const timeBucket = (secs) => Math.min(TIME_BUCKETS - 1, Math.max(0, Math.floor(secs / TIME_BUCKET_S)));

/** The lowest score bin the time table covers: walk down from the ceiling
 *  until TIME_COVER players are behind you. Derived from the histogram, so it
 *  needs nothing stored and moves on its own as the board fills up. */
function timeCutoff(hist) {
  let n = 0;
  for (let i = hist.length - 1; i >= 0; i--) {
    n += Number(hist[i]) || 0;
    if (n >= TIME_COVER) return i;
  }
  return 0;
}

/* Workers count every R2 binding call — list, get, put, delete — against a
   subrequest limit of 10,000 per invocation, and one cron tick is one
   invocation. The local runtime does not enforce it, which is why measuring
   locally cannot find the ceiling: under real traffic the code does not
   degrade at it, it dies at it. So the whole scheduled handler draws from one
   budget and every loop that reads in bulk asks before it reads. Held back
   from 10,000 for the lists, the writes and the deletes. */
const SUBREQUEST_BUDGET = 9000;

/* Midnight IST. Must match the second entry in wrangler.toml's crons, which is
   the only thing that tells this handler which trigger woke it. */
const NIGHTLY_CRON = '30 18 * * *';

/** A shared allowance. `take` reports whether the caller may spend. */
function budget(total) {
  let left = total;
  return {
    take(n = 1) {
      if (left < n) return false;
      left -= n;
      return true;
    },
    left: () => left,
  };
}

/* A version of the scoring table rather than of the file it lives in.
   `generated` moves every time the generator runs, so keying on it would
   order a full rescore of every filed basket on any Tuesday somebody
   rebuilt the terrain. What must trigger one is a weight, a target or a mode
   credit actually changing, which is exactly what this hashes. FNV-1a, for
   no better reason than that it is four lines and needs no crypto await. */
const CONFIG_VERSION = (() => {
  const canon = JSON.stringify([
    Object.keys(PEAKS.modes).sort().map((m) => [m, PEAKS.modes[m]]),
    PEAKS_ERAS.map((id) => [id, PEAKS.eras[id].target, PEAKS.eras[id].weight]),
  ]);
  let h = 0x811c9dc5;
  for (let i = 0; i < canon.length; i++) {
    h ^= canon.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `w${h.toString(16).padStart(8, '0')}`;
})();


const peaksStatsKey = (era, mode) => `peaks/stats/${era}-${mode}.json`;
const peaksRawPrefix = (era, mode) => `peaks/raw/${era}-${mode}/`;
const INDEX_PREFIX = 'peaks/index/';
const JOURNAL_PREFIX = 'peaks/journal/';
const indexKey = (pid) => `${INDEX_PREFIX}${pid}.json`;
/* Still two files, but no longer for secrecy. The split existed because the
   maintained top-N carried pids and a pid is permission to overwrite a row;
   with the leaderboard gone there is no top-N, no pid anywhere downstream of a
   filing, and nothing in the state file a reader could not be shown. What is
   left is a serve-path argument: board.json is the exact bytes a reader wants,
   so it is streamed rather than parsed and reshaped on every request, and
   fourteen hundred numbers is enough for that to be worth one extra PUT per
   fold. Reads outnumber folds by orders of magnitude. */
const BOARD_KEY = 'peaks/board.json'; // public, streamed verbatim
const BOARD_STATE_KEY = 'peaks/board-state.json'; // bookkeeping: cursor, config, ops

const enc = new TextEncoder();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

async function hmac(secret, msg) {
  const k = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(msg)));
}

// Compare in constant time — the sig is the only thing standing between a
// forged run and the histogram.
function sameSig(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/** Age of a valid token in ms, or null if it does not parse or verify. */
async function tokenAge(token, secret) {
  if (typeof token !== 'string' || token.length > 128) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [ts, nonce, sig] = parts;
  if (!/^\d{10,16}$/.test(ts) || !/^[0-9a-f]{16}$/.test(nonce) || !/^[0-9a-f]{64}$/.test(sig)) return null;
  if (!sameSig(await hmac(secret, `${ts}.${nonce}`), sig)) return null;
  return Date.now() - Number(ts);
}

function validateRun(body) {
  let b;
  try { b = JSON.parse(body); } catch { return null; }
  const era = PEAKS.eras[b?.era];
  if (!era || !(b?.mode in PEAKS.modes)) return null;
  if (!Number.isInteger(b?.months) || b.months < 0 || b.months > era.target) return null;
  return { era: b.era, mode: b.mode, months: b.months, token: b.token };
}

function validateIndex(body) {
  let b;
  try { b = JSON.parse(body); } catch { return null; }
  if (typeof b?.pid !== 'string' || !/^[a-z0-9-]{8,64}$/.test(b.pid)) return null;
  if (!b?.bests || typeof b.bests !== 'object') return null;
  // Rebuilt key by key rather than stored as sent: the board only ever reads
  // the six, and an object echoed back into R2 should carry nothing else.
  const bests = {};
  for (const id of PEAKS_ERAS) {
    const v = b.bests[id];
    if (!v || typeof v !== 'object') return null;
    // 0 is a run: the page counts an instant crash as reporting, at credit 0,
    // and the publication rule is "all six have a run", not "a good one".
    if (!Number.isInteger(v.months) || v.months < 0 || v.months > PEAKS.eras[id].target) return null;
    if (!(v.mode in PEAKS.modes)) return null;
    const e = { months: v.months, mode: v.mode };
    /* Optional forever, and deliberately: a page cached before the clock went
       universal files times for cleared stretches only, and a missing time is
       a legal filing. Only a present impossible one is refused.
       The floor is the run token's own physics applied to the filing: the
       same 50ms a month the token already enforces on a reported run. It is
       load-bearing now that the time table ranks within a score, though what a
       forged total buys is a place inside one anonymous tie, with no name on
       either end of it. Compared in whole milliseconds because months × 0.05
       is not exact in binary and would refuse a legitimate 6.2 at 124
       months. */
    if (v.secs != null) {
      if (typeof v.secs !== 'number' || !Number.isFinite(v.secs) || v.secs <= 0 || v.secs >= 86400) return null;
      if (v.secs * 1000 < v.months * MIN_MS_PER_MONTH) return null;
      e.secs = v.secs;
    }
    bests[id] = e;
  }
  return { pid: b.pid, bests };
}

/** The published figure for a basket, rounded the way paintIndex rounds. */
function basketIndex(bests) {
  let sum = 0;
  for (const id of PEAKS_ERAS) {
    const b = bests?.[id];
    if (!b) return null;
    const cfg = PEAKS.eras[id];
    const credit = PEAKS.modes[b.mode];
    if (credit == null || !Number.isFinite(b.months)) return null;
    sum += cfg.weight * (b.months / cfg.target) * credit;
  }
  return Math.round(sum * 1000) / 10;
}

/** The basket's clock: the six counting runs added up, or null if any one of
 *  them has no time. All six or nothing — five runs added up is not a smaller
 *  total, it is a different quantity. Filings made before the clock went
 *  universal have times for their clears only, so they carry no total and the
 *  time table simply does not hold them. */
function basketSecs(bests) {
  let sum = 0;
  for (const id of PEAKS_ERAS) {
    const s = bests?.[id]?.secs;
    if (s == null) return null;
    sum += s;
  }
  return Math.round(sum * 10) / 10;
}

/** The histogram bin an index falls in. The index arrives already rounded to a
 *  tenth, so this is exact rather than a floor onto a coarser scale. */
const boardBin = (index) => Math.min(Math.max(Math.round(index * 10), 0), BOARD_HIST_SIZE - 1);

/* ── Ingest ────────────────────────────────────────────────────────────── */

function validate(body, maxPuzzle) {
  let b;
  try { b = JSON.parse(body); } catch { return null; }
  if (!Number.isInteger(b?.puzzle) || b.puzzle < 1 || b.puzzle > maxPuzzle) return null;
  if (!Array.isArray(b?.pts) || b.pts.length !== 4) return null;
  if (!b.pts.every((x) => Number.isInteger(x) && x >= 0 && x <= 3)) return null;
  return { puzzle: b.puzzle, pts: b.pts };
}

/** Body text under a byte ceiling, or a Response to return instead. */
async function readBody(req, max) {
  if (req.method !== 'POST') return { res: new Response(null, { status: 405 }) };
  const len = Number(req.headers.get('Content-Length') || 0);
  if (len > max) return { res: new Response(null, { status: 413 }) };
  const body = await req.text();
  if (body.length > max) return { res: new Response(null, { status: 413 }) };
  return { body };
}

// Key is 100% server-generated; zero client input touches a storage path.
const rawKey = (prefix) => `${prefix}${String(Date.now()).padStart(14, '0')}-${crypto.randomUUID().slice(0, 8)}.json`;

async function ingest(req, env) {
  const { body, res } = await readBody(req, 1024);
  if (res) return res;
  const v = validate(body, Number(env.MAX_PUZZLE || 1));
  if (!v) return new Response(null, { status: 400 });
  await env.PLAY.put(rawKey(rawPrefix(v.puzzle)), JSON.stringify({ pts: v.pts, t: Date.now() }));
  return new Response(null, { status: 204 });
}

async function peaksToken(env, cors) {
  if (!env.PEAKS_KEY) return new Response(null, { status: 503, headers: cors });
  const t = Date.now();
  const nonce = hex(crypto.getRandomValues(new Uint8Array(8)));
  return new Response(JSON.stringify({ token: `${t}.${nonce}.${await hmac(env.PEAKS_KEY, `${t}.${nonce}`)}` }), {
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

async function peaksRun(req, env) {
  const { body, res } = await readBody(req, 512);
  if (res) return res;
  if (!env.PEAKS_KEY) return new Response(null, { status: 503 });
  const v = validateRun(body);
  if (!v) return new Response(null, { status: 400 });
  const age = await tokenAge(v.token, env.PEAKS_KEY);
  if (age == null || age < v.months * MIN_MS_PER_MONTH || age > TOKEN_TTL_MS) {
    return new Response(null, { status: 400 });
  }
  await env.PLAY.put(rawKey(peaksRawPrefix(v.era, v.mode)), JSON.stringify({ months: v.months, t: Date.now() }));
  return new Response(null, { status: 204 });
}

/* No token, no name, and nothing to ask permission for. The page files as
   soon as an index publishes and again whenever it changes, the way the run
   beacon already reports every run: what goes up is a bounded basket and an
   opaque browser id, and what comes back is one point on a curve.
   The server recomputes every figure it publishes, so a forged filing can
   claim a basket and not a score, and the WAF rate limit is the backstop. */
async function peaksIndex(req, env) {
  const { body, res } = await readBody(req, 1024);
  if (res) return res;
  const v = validateIndex(body);
  if (!v) return new Response(null, { status: 400 });
  const index = basketIndex(v.bests);
  if (index == null) return new Response(null, { status: 400 });

  const now = Date.now();
  /* What this pid scored before, which is the whole of what lets the cron
     maintain the histogram without reading anybody else: a note carrying a
     previous figure moves one player between two bins, and a note carrying
     none is a new player.
     A stored file that will not parse or will not score counts as none, and
     that is right rather than merciful: an unscorable filing was never on the
     board, so this pid has never been counted and `plays` owes it one. */
  let prev = null;
  let prevSecs = null;
  const old = await env.PLAY.get(indexKey(v.pid));
  if (old) {
    try {
      const b = (await old.json()).bests;
      prev = basketIndex(b);
      prevSecs = basketSecs(b);
    } catch { /* see above */ }
  }

  /* Per-pid file first, journal note second, and the order is a rule rather
     than a style. The rescore captures a journal position and then reads
     per-pid files, which is only sound if a note's file is already there. A
     journal write that fails after the file landed hides the filing until the
     next rescore, which is the tolerable direction; the reverse would fold a
     note whose file never arrived.
     Two tabs filing the same pid at once both read the old file here and both
     stamp the same `prev`. R2 has no transactions, so it is not preventable:
     the histogram clamps at zero and the nightly rescore repairs it. */
  await env.PLAY.put(indexKey(v.pid), JSON.stringify({ bests: v.bests, t: now }));
  await env.PLAY.put(rawKey(JOURNAL_PREFIX), JSON.stringify({
    pid: v.pid, index, secs: basketSecs(v.bests), prev, prevSecs, t: now,
  }));
  return new Response(null, { status: 204 });
}

/* ── Aggregation ───────────────────────────────────────────────────────── */

/** Fold raws past the cursor into a histogram. `bin` reads a raw body; a bin
 *  outside the histogram, or a body that will not parse, counts as dropped. */
async function aggregate(env, { prefix, key, histSize, bin }, ops) {
  if (!ops.take()) return 0;
  const cur = await env.PLAY.get(key);
  const st = cur
    ? await cur.json()
    : { cursor: '', plays: 0, hist: Array(histSize).fill(0), dropped: 0 };

  const processed = [];
  let after = st.cursor || undefined;
  while (processed.length < RUN_CAP) {
    // A whole page reserved before it is listed, so the run always stops on a
    // page boundary and the cursor is always somewhere it can resume from.
    if (!ops.take(1 + 500)) break;
    const l = await env.PLAY.list({ prefix, startAfter: after, limit: 500 });
    if (!l.objects.length) break;
    for (let i = 0; i < l.objects.length; i += 25) {
      const chunk = l.objects.slice(i, i + 25);
      const bodies = await Promise.all(chunk.map((o) => env.PLAY.get(o.key)));
      for (const obj of bodies) {
        try {
          const v = bin(await obj.json());
          if (!(v >= 0 && v < histSize)) throw new Error('range');
          if (st.plays < COUNT_CAP) { st.hist[v]++; st.plays++; }
        } catch { st.dropped++; }
      }
    }
    for (const o of l.objects) processed.push(o.key);
    after = l.objects[l.objects.length - 1].key;
    if (!l.truncated) break;
  }
  if (!processed.length) return 0; // early-exit: quiet run costs ~2 ops

  // Cursor + hist commit together in one atomic PUT — reruns are idempotent.
  st.cursor = processed[processed.length - 1];
  st.updated_at = new Date().toISOString();
  await env.PLAY.put(key, JSON.stringify(st), {
    httpMetadata: { contentType: 'application/json' },
  });
  // Delete only after the commit. A failed delete leaves orphans behind the
  // cursor (never re-counted); the bucket lifecycle rule is the backstop.
  for (let i = 0; i < processed.length; i += 500) {
    await env.PLAY.delete(processed.slice(i, i + 500));
  }
  return processed.length;
}

/* ── The board ─────────────────────────────────────────────────────────────
   One histogram of every filed index, and nothing else. No names, no ordering,
   no top ten. A reader's own mark on that curve, the top of it, and their
   exact position in it are all read off the same fourteen hundred numbers.

   It used to be rebuilt from scratch every five minutes: read every filing,
   score every basket, sort, write. Almost none of those objects had changed,
   and the cost was set by how many people had ever played rather than by how
   many had just played. Worse, it was capped at 5,000 objects, and pids are
   random uuids that R2 lists lexicographically — so the 5,000 it read were
   chosen by alphabetical order of a random number and were the same 5,000
   every time.

   So the board is maintained instead. Every filing appends a note saying what
   this pid scored and what it scored before; the cron folds the notes since
   its cursor and writes the result. Work is proportional to activity, and a
   quiet five minutes costs about two operations.

   The price is drift — R2 has no transactions and scheduled invocations have
   no mutual exclusion — and the answer to all of it is the rescore below,
   which re-derives everything from the per-pid files. That is why those files
   are kept and why, in normal operation, nothing reads them. */

/* Every cap and backlog this worker can hit, written down where something can
   read them. They used to be a console.log, which is a place numbers go to not
   be looked at: the board quietly reported half its players for as long as
   nobody thought to check, and one line in a log was the whole of the warning.
   Growth, organic or hostile, should be a figure on a page rather than a bill
   at the end of the month. Served, without the board beside it, at
   /api/peaks-health.json. */
const freshOps = () => ({
  filings: 0, // peaks/index/ objects, counted at the last rescore
  scored: 0, // how many of them could be scored
  journal: 0, // notes still waiting after the last fold
  folded: 0, // notes the last fold applied
  budget: null, // subrequests left when the last board pass ended
  paused: false, // a rescore is part-way through its scan
  capped: false, // COUNT_CAP reached; plays has stopped counting
  rescored_at: null,
});

const freshState = () => ({
  config: null,
  cursor: '',
  plays: 0,
  hist: Array(BOARD_HIST_SIZE).fill(0),
  // { "<score bin>": { "<time bucket>": count } }, for the covered band only.
  times: {},
  ops: freshOps(),
  updated_at: null,
});

/** The state and the etag any write of it must be conditioned on. A body that
 *  will not parse is treated as no state at all, which sends the next step
 *  down the rescore path and rebuilds it from the filings. */
async function readState(env) {
  const obj = await env.PLAY.get(BOARD_STATE_KEY);
  if (!obj) return { state: freshState(), etag: null };
  try {
    return { state: await obj.json(), etag: obj.etag };
  } catch {
    return { state: freshState(), etag: obj.etag };
  }
}

/** Compare-and-swap on the state file. Cloudflare gives scheduled invocations
 *  no mutual exclusion, so a slow run and the next cron can overlap; the loser
 *  writes nothing, deletes nothing, and the notes it folded are still in the
 *  journal for the next run to fold again from unchanged state. The outcome of
 *  any overlap is that one run was a no-op. Reports whether this run won. */
async function writeState(env, state, etag) {
  const put = await env.PLAY.put(BOARD_STATE_KEY, JSON.stringify(state), {
    httpMetadata: { contentType: 'application/json' },
    onlyIf: etag == null ? { etagDoesNotMatch: '*' } : { etagMatches: etag },
  });
  return put != null;
}

/** The public file: the curve, the count, and when it was last touched. The
 *  top score is not a field because it does not need to be — it is the highest
 *  bin with anything in it, and so is every rank read off this. */
const publicBoard = (state) => ({
  plays: state.plays,
  hist: state.hist,
  // Nested by score rather than flattened to "bin:bucket" keys, so a reader
  // looks up their own score once instead of scanning the whole table.
  times: state.times ?? {},
  updated_at: state.updated_at,
});

/** Writes the served file. Skipped while nobody has filed, so a fresh bucket
 *  keeps 404ing and the page keeps hiding the panels rather than showing a
 *  chart of nothing. */
async function publishBoard(env, state) {
  if (!state.plays) return;
  await env.PLAY.put(BOARD_KEY, JSON.stringify(publicBoard(state)), {
    httpMetadata: { contentType: 'application/json' },
  });
}

/** Every journal key from `after`, in order, until the budget or the listing
 *  runs out. Keys only — the bodies are fetched by the caller that wants them. */
async function journalKeys(env, after, ops, cap) {
  const keys = [];
  let cursor = after || undefined;
  while (keys.length < cap) {
    if (!ops.take()) break;
    const l = await env.PLAY.list({ prefix: JOURNAL_PREFIX, startAfter: cursor, limit: 1000 });
    if (!l.objects.length) break;
    for (const o of l.objects) keys.push(o.key);
    cursor = l.objects[l.objects.length - 1].key;
    if (!l.truncated) break;
  }
  return keys;
}

/** Journal notes through to a key, deleted. Anything the budget cannot reach
 *  sits behind the cursor and is never folded again; the bucket lifecycle rule
 *  is the backstop, the same arrangement the run aggregation makes. */
async function dropJournalThrough(env, through, ops) {
  const keys = (await journalKeys(env, '', ops, 20000)).filter((k) => k <= through);
  for (let i = 0; i < keys.length; i += 500) {
    if (!ops.take()) return;
    await env.PLAY.delete(keys.slice(i, i + 500));
  }
}

/** Folds the notes since the cursor into the board. Returns how many it
 *  applied; 0 covers both "nothing new" and "lost the race". */
async function foldBoard(env, ops) {
  if (!ops.take()) return 0;
  const { state, etag } = await readState(env);

  // A rescore in flight owns the board until it finishes, and a weight table
  // that no longer matches the one the state was built on starts one.
  if (state.rescore) return rescoreBoard(env, state, etag, ops);
  if (state.config !== CONFIG_VERSION) {
    console.log(`peaks board: config ${state.config} → ${CONFIG_VERSION}, rescoring`);
    return rescoreBoard(env, state, etag, ops);
  }

  const keys = await journalKeys(env, state.cursor, ops, 20000);
  if (!keys.length) return 0; // the quiet case: one read and one list

  const notes = [];
  const applied = [];
  for (let i = 0; i < keys.length; i += 25) {
    const chunk = keys.slice(i, i + 25);
    if (!ops.take(chunk.length)) break;
    const bodies = await Promise.all(chunk.map((k) => env.PLAY.get(k)));
    for (let j = 0; j < bodies.length; j++) {
      applied.push(chunk[j]);
      try {
        if (bodies[j]) notes.push(await bodies[j].json());
      } catch { /* a note that will not parse is consumed and dropped */ }
    }
  }
  if (!applied.length) return 0;

  /* Keys begin with a zero-padded millisecond, so listing them gives
     chronological order and two filings from one pid inside a single window
     apply in the sequence they were made and net out correctly. */
  for (const n of notes) {
    if (!n || typeof n.pid !== 'string' || !Number.isFinite(n.index)) continue;
    if (n.prev == null) {
      if (state.plays < COUNT_CAP) state.plays++;
    } else if (Number.isFinite(n.prev)) {
      /* Clamped, and not defensively. Two filings racing on one pid both
         carry the same `prev`, so the second decrement can legitimately
         arrive at an already-empty bin. A negative count must never reach the
         public histogram; the nightly rescore is what makes it right again. */
      const b = boardBin(n.prev);
      if (state.hist[b] > 0) state.hist[b]--;
    }
    state.hist[boardBin(n.index)]++;
  }

  /* The time table, in a second pass over the same notes, because the cutoff
     is derived from the histogram and the histogram only settles once every
     note in the batch has landed. Cells below the cutoff are dropped after,
     so a note that arrived above it and was pushed below by the rest of the
     batch costs one cell for one fold. */
  applyTimes(state, notes);

  state.cursor = applied[applied.length - 1];
  state.ops = {
    ...freshOps(),
    ...state.ops,
    journal: keys.length - applied.length,
    folded: notes.length,
    budget: ops.left(),
    capped: state.plays >= COUNT_CAP,
    paused: false,
  };
  state.updated_at = new Date().toISOString();
  if (!(await writeState(env, state, etag))) return 0;
  await publishBoard(env, state);
  // Only after the commit, and only what this run actually read.
  for (let i = 0; i < applied.length; i += 500) {
    if (!ops.take()) break;
    await env.PLAY.delete(applied.slice(i, i + 500));
  }
  return notes.length;
}

/** Folds a batch of notes into the time table and trims it to the covered
 *  band. Called after the histogram has settled, and safe to call on a state
 *  whose table is empty or stale — every count clamps at zero and the nightly
 *  rescore rebuilds the whole thing from the filings. */
function applyTimes(state, notes) {
  const times = (state.times ??= {});
  const cut = timeCutoff(state.hist);
  for (const n of notes) {
    if (!n || !Number.isFinite(n.index)) continue;
    // Out of the band, or a basket with a gap in it and so no total to place.
    if (Number.isFinite(n.prevSecs) && Number.isFinite(n.prev) && boardBin(n.prev) >= cut) {
      const cell = times[boardBin(n.prev)];
      const k = timeBucket(n.prevSecs);
      if (cell && cell[k] > 0 && --cell[k] === 0) delete cell[k];
    }
    if (Number.isFinite(n.secs) && boardBin(n.index) >= cut) {
      const b = boardBin(n.index);
      const cell = (times[b] ??= {});
      cell[timeBucket(n.secs)] = (cell[timeBucket(n.secs)] || 0) + 1;
    }
  }
  for (const k of Object.keys(times)) {
    if (Number(k) < cut || !Object.keys(times[k]).length) delete times[k];
  }
}

/* The self-heal, and the bootstrap, and the config-change path, and the
   recovery path: all the same function. It re-derives the board from the
   per-pid files, which are the source of truth, so every drift §3.7 of the
   design note names — a same-pid race, a deliberately worse re-file pushed
   out of the keep buffer, a moderation delete, a bug in the fold — turns from
   "wrong forever" into "wrong for at most a day".

   The subrequest budget shapes it. Below roughly 9,000 filings it is one
   pass; above that it persists its progress into the state file and the next
   invocation continues the scan, while the journal simply accumulates. */
async function rescoreBoard(env, state, etag, ops) {
  let r = state.rescore;
  if (!r) {
    /* K, fixed BEFORE anything is read. The filing path writes the per-pid
       file before the journal note, so every note written before this instant
       has its file in place and is inside the scan below; everything after it
       folds normally on the next pass. Leaving the cursor where it was instead
       would re-apply every note filed in the minutes before the rescore, which
       would make the self-heal a drift source of its own.

       Not a key that exists but a bound on the keys that do: journal keys are
       a zero-padded millisecond then a dash, so this string sorts immediately
       before every note of its own millisecond and after every earlier one.
       Reading the real last key would mean listing the whole journal, and a
       listing that ran out of budget would silently return a K far short of
       the truth. A bound cannot be short. */
    r = {
      k: `${JOURNAL_PREFIX}${String(Date.now()).padStart(14, '0')}`,
      listCursor: '',
      plays: 0,
      // Objects seen, whether or not they scored. The difference between this
      // and `plays` is how much of the bucket is junk, which is the number
      // that tells spam from success.
      filings: 0,
      hist: Array(BOARD_HIST_SIZE).fill(0),
      /* A running top of (index, secs) pairs, which is what the time table
         has to be built from. The cutoff cannot be known until the histogram
         is complete, so the scan cannot decide as it goes which filings the
         table will want; it keeps a generous margin above the covered band
         and trims. No pid and no alias in it, and it is discarded the moment
         the table is written. */
      lead: [],
    };
  }

  const PAGE = 500;
  let after = r.listCursor || undefined;
  let done = false;
  for (;;) {
    // A page and its reads reserved together, so the scan always stops on a
    // page boundary and `listCursor` is always a key it can resume after.
    if (!ops.take(1 + PAGE)) break;
    const l = await env.PLAY.list({ prefix: INDEX_PREFIX, startAfter: after, limit: PAGE });
    if (!l.objects.length) { done = true; break; }
    for (let i = 0; i < l.objects.length; i += 25) {
      const chunk = l.objects.slice(i, i + 25);
      const bodies = await Promise.all(chunk.map((o) => env.PLAY.get(o.key)));
      for (let j = 0; j < bodies.length; j++) {
        r.filings++;
        try {
          const b = await bodies[j].json();
          const index = basketIndex(b.bests);
          if (index == null) continue;
          if (r.plays < COUNT_CAP) { r.plays++; r.hist[boardBin(index)]++; }
          const secs = basketSecs(b.bests);
          if (secs != null) r.lead.push([boardBin(index), timeBucket(secs)]);
        } catch { /* an unreadable filing is simply not on the board */ }
      }
    }
    /* Trimmed as it goes, so a scan over a large bucket does not build a list
       of every player in memory — and trimmed by the running cutoff rather
       than by a count. The histogram only grows, so the cutoff only rises,
       so anything already below it can never come back into the band. A
       count-based trim would have been wrong the moment a single score held
       more players than the margin. */
    if (r.lead.length > TIME_COVER * 4) {
      const running = timeCutoff(r.hist);
      r.lead = r.lead.filter(([b]) => b >= running);
      // Backstop against a distribution nothing here anticipates: one score
      // holding tens of thousands of people. It would make the count inside
      // that score low rather than the table wrong, and it is logged.
      if (r.lead.length > TIME_COVER * 40) {
        r.lead.length = TIME_COVER * 40;
        console.log(`peaks board: time table truncated at ${r.lead.length} leaders`);
      }
    }
    after = l.objects[l.objects.length - 1].key;
    r.listCursor = after;
    if (!l.truncated) { done = true; break; }
  }

  if (!done) {
    // Out of budget with the scan unfinished. Progress goes in the state file
    // and the next invocation picks it up; folding stays suspended until then.
    state.rescore = r;
    state.ops = { ...freshOps(), ...state.ops, paused: true, budget: ops.left() };
    state.updated_at = new Date().toISOString();
    await writeState(env, state, etag);
    console.log(`peaks board: rescore paused at ${r.plays} filings`);
    return 0;
  }

  /* The table, rebuilt from the leaders the scan kept. The cutoff is known
     now that the histogram is whole, so this is the one place the band is
     drawn exactly rather than approached. */
  const cut = timeCutoff(r.hist);
  const times = {};
  for (const [b, t] of r.lead) {
    if (b < cut) continue;
    const cell = (times[b] ??= {});
    cell[t] = (cell[t] || 0) + 1;
  }

  const now = new Date().toISOString();
  const next = {
    config: CONFIG_VERSION,
    cursor: r.k,
    plays: r.plays,
    hist: r.hist,
    times,
    ops: {
      ...freshOps(),
      ...state.ops,
      filings: r.filings,
      scored: r.plays,
      // The rescore consumed everything at or before K, so nothing is pending
      // that it knows about. Notes filed during the scan fold on the next pass
      // and that pass reports its own backlog.
      journal: 0,
      folded: 0,
      budget: ops.left(),
      capped: r.plays >= COUNT_CAP,
      paused: false,
      rescored_at: now,
    },
    updated_at: now,
  };
  if (!(await writeState(env, next, etag))) return 0;
  await publishBoard(env, next);
  await dropJournalThrough(env, r.k, ops);
  console.log(`peaks board: rescored ${r.plays} filings on ${CONFIG_VERSION}`);
  return r.plays;
}

/* ── Routing ───────────────────────────────────────────────────────────── */

const CACHE = 'public, max-age=60, stale-while-revalidate=300';

/** Serves a stored object, reshaped if the stored form holds more than the
 *  public one. No shape means the file on disk IS the public file and is
 *  streamed: there is no reshaping step, so there is none to forget. */
async function serve(env, key, req, cors, shape) {
  const obj = await env.PLAY.get(key);
  if (!obj) return new Response(null, { status: 404, headers: cors });
  const headers = { ...cors, 'Content-Type': 'application/json', 'Cache-Control': CACHE };
  if (req.method === 'HEAD') return new Response(null, { headers });
  if (!shape) return new Response(obj.body, { headers });
  return new Response(JSON.stringify(shape(await obj.json())), { headers });
}

// Public shape only — cursor stays internal.
const statsShape = (st) => ({ plays: st.plays, hist: st.hist, updated_at: st.updated_at });

/* The board's working conditions, without the board. Built by naming the
   fields rather than by deleting them: the state file is where the pids live,
   and a shape that says "everything except" would publish the next field
   somebody adds. `config` is the hash of a weight table that ships in the
   terrain JSON anyway, and it is the one number that answers "is the deployed
   worker scoring on the table the page is drawn from". */
const healthShape = (st) => ({
  plays: st.plays,
  config: st.config,
  filings: st.ops?.filings ?? null,
  scored: st.ops?.scored ?? null,
  journal: st.ops?.journal ?? null,
  folded: st.ops?.folded ?? null,
  budget: st.ops?.budget ?? null,
  paused: st.ops?.paused ?? false,
  capped: st.ops?.capped ?? false,
  rescored_at: st.ops?.rescored_at ?? null,
  updated_at: st.updated_at,
});

export default {
  async scheduled(event, env, ctx) {
    const maxP = Number(env.MAX_PUZZLE || 1);
    ctx.waitUntil((async () => {
      const ops = budget(SUBREQUEST_BUDGET);
      /* The nightly self-heal, on its own trigger rather than a flag inside
         the five-minute one, for two reasons that both matter. Cron handlers
         at intervals of an hour or more get fifteen minutes of CPU where a
         sub-hourly one gets thirty seconds. And keeping the rescore out of the
         five-minute invocation leaves that invocation's subrequest allowance
         to the run aggregation, which is what actually needs it. Nothing else
         runs on this tick: the five-minute one is along in a moment. */
      if (event.cron === NIGHTLY_CRON) {
        const { state, etag } = await readState(env);
        await rescoreBoard(env, state, etag, ops);
        return;
      }
      /* The board first, and the order matters. One invocation's subrequests
         are one allowance shared by everything here, and the run aggregation
         can want 5,000 reads per stretch across eighteen stretches. Filings
         are far rarer than runs, so the board's need is small and bounded;
         letting the aggregation go first would let a busy hour of driving
         starve it and leave the journal growing. Run backlogs drain on the
         next cron by design. Board backlogs do too, but a board nobody can
         see is the thing this whole design exists to prevent. */
      await foldBoard(env, ops);
      for (let p = 1; p <= maxP; p++) {
        await aggregate(env, {
          prefix: rawPrefix(p),
          key: statsKey(p),
          histSize: HIST_SIZE,
          bin: (b) => b.pts.reduce((a, x) => a + x, 0),
        }, ops);
      }
      for (const era of PEAKS_ERAS) {
        for (const mode of PEAKS_MODES) {
          await aggregate(env, {
            prefix: peaksRawPrefix(era, mode),
            key: peaksStatsKey(era, mode),
            histSize: PEAKS.eras[era].target + 1, // index = months survived
            bin: (b) => b.months,
          }, ops);
        }
      }
    })());
  },

  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = { 'Access-Control-Allow-Origin': '*' };
    const get = req.method === 'GET' || req.method === 'HEAD';

    // Every peaks response carries CORS, rejections included: a status is
    // only readable cross-origin when the response says who may read it, and
    // the page needs to be able to tell a refused filing from a taken one.
    // The puzzle ingest stays as it was: its caller never looks.
    const withCors = (p) => p.then((r) => { r.headers.set('Access-Control-Allow-Origin', '*'); return r; });

    if (url.pathname === '/api/play-score') return ingest(req, env);
    if (url.pathname === '/api/peaks-run') return withCors(peaksRun(req, env));
    if (url.pathname === '/api/peaks-index') return withCors(peaksIndex(req, env));
    if (url.pathname === '/api/peaks-token') {
      return get ? peaksToken(env, cors) : new Response(null, { status: 405, headers: cors });
    }

    const m = url.pathname.match(/^\/api\/play-stats\/(\d{1,4})\.json$/);
    if (m && get) return serve(env, statsKey(Number(m[1])), req, cors, statsShape);

    const pm = url.pathname.match(/^\/api\/peaks-stats\/([A-Za-z0-9]{1,8})-([a-z]{1,8})\.json$/);
    if (pm && get && PEAKS.eras[pm[1]] && pm[2] in PEAKS.modes) {
      return serve(env, peaksStatsKey(pm[1], pm[2]), req, cors, statsShape);
    }

    // Verbatim. The file it reads has never held a pid, so there is nothing
    // to strip and no route that could reach the state file beside it.
    if (url.pathname === '/api/peaks-board.json' && get) {
      return serve(env, BOARD_KEY, req, cors, null);
    }

    // The one reader of the state file, and it names every field it takes.
    if (url.pathname === '/api/peaks-health.json' && get) {
      return serve(env, BOARD_STATE_KEY, req, cors, healthShape);
    }

    return new Response(null, { status: 404, headers: cors });
  },
};
