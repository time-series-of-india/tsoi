// tsoi-play-score — see wrangler.toml header for the design summary.
// Invariant: the game never depends on this worker; every failure here
// degrades to "the percentile line is absent" on the finale screen.

const HIST_SIZE = 13; // scores 0..12 (4 rounds × 0–3 pts)
const COUNT_CAP = 1_000_000; // per-puzzle poisoning ceiling
const RUN_CAP = 5000; // raw objects per aggregation run; backlog drains next run

const statsKey = (p) => `stats/p${p}.json`;
const rawPrefix = (p) => `raw/p${p}/`;

function validate(body, maxPuzzle) {
  let b;
  try { b = JSON.parse(body); } catch { return null; }
  if (!Number.isInteger(b?.puzzle) || b.puzzle < 1 || b.puzzle > maxPuzzle) return null;
  if (!Array.isArray(b?.pts) || b.pts.length !== 4) return null;
  if (!b.pts.every((x) => Number.isInteger(x) && x >= 0 && x <= 3)) return null;
  return { puzzle: b.puzzle, pts: b.pts };
}

async function ingest(req, env) {
  if (req.method !== 'POST') return new Response(null, { status: 405 });
  const len = Number(req.headers.get('Content-Length') || 0);
  if (len > 1024) return new Response(null, { status: 413 });
  const body = await req.text();
  if (body.length > 1024) return new Response(null, { status: 413 });
  const v = validate(body, Number(env.MAX_PUZZLE || 1));
  if (!v) return new Response(null, { status: 400 });
  // Key is 100% server-generated; zero client input touches a storage path.
  const key = `${rawPrefix(v.puzzle)}${String(Date.now()).padStart(14, '0')}-${crypto.randomUUID().slice(0, 8)}.json`;
  await env.PLAY.put(key, JSON.stringify({ pts: v.pts, t: Date.now() }));
  return new Response(null, { status: 204 });
}

async function aggregate(env, puzzle) {
  const cur = await env.PLAY.get(statsKey(puzzle));
  const st = cur
    ? await cur.json()
    : { cursor: '', plays: 0, hist: Array(HIST_SIZE).fill(0), dropped: 0 };

  const processed = [];
  let after = st.cursor || undefined;
  while (processed.length < RUN_CAP) {
    const l = await env.PLAY.list({ prefix: rawPrefix(puzzle), startAfter: after, limit: 500 });
    if (!l.objects.length) break;
    for (let i = 0; i < l.objects.length; i += 25) {
      const chunk = l.objects.slice(i, i + 25);
      const bodies = await Promise.all(chunk.map((o) => env.PLAY.get(o.key)));
      for (const obj of bodies) {
        try {
          const b = await obj.json();
          const score = b.pts.reduce((a, x) => a + x, 0);
          if (!(score >= 0 && score < HIST_SIZE)) throw new Error('range');
          if (st.plays < COUNT_CAP) { st.hist[score]++; st.plays++; }
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
  await env.PLAY.put(statsKey(puzzle), JSON.stringify(st), {
    httpMetadata: { contentType: 'application/json' },
  });
  // Delete only after the commit. A failed delete leaves orphans behind the
  // cursor (never re-counted); the bucket lifecycle rule is the backstop.
  for (let i = 0; i < processed.length; i += 500) {
    await env.PLAY.delete(processed.slice(i, i + 500));
  }
  return processed.length;
}

export default {
  async scheduled(_event, env, ctx) {
    const maxP = Number(env.MAX_PUZZLE || 1);
    ctx.waitUntil((async () => {
      for (let p = 1; p <= maxP; p++) await aggregate(env, p);
    })());
  },

  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = { 'Access-Control-Allow-Origin': '*' };

    if (url.pathname === '/api/play-score') return ingest(req, env);

    const m = url.pathname.match(/^\/api\/play-stats\/(\d{1,4})\.json$/);
    if (m && (req.method === 'GET' || req.method === 'HEAD')) {
      const obj = await env.PLAY.get(statsKey(Number(m[1])));
      if (!obj) return new Response(null, { status: 404, headers: cors });
      const st = await obj.json();
      // Public shape only — cursor stays internal.
      const pub = { plays: st.plays, hist: st.hist, updated_at: st.updated_at };
      return new Response(req.method === 'HEAD' ? null : JSON.stringify(pub), {
        headers: {
          ...cors,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      });
    }

    return new Response(null, { status: 404, headers: cors });
  },
};
