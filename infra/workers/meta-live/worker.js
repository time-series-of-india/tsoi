// tsoi-meta-live — keeps R2 traffic.json fresh for the /meta page.
//
// Shape and clamps mirror site/scripts/build-meta.mjs exactly (that script
// remains the seeder and the source of the full DB-backed history +
// dispatch tags; this worker only merges the recent Cloudflare windows on
// top). The page never depends on this worker: its fetch falls back to the
// baked snapshot when this 404s or errors.
//
// scheduled (*/5): GraphQL (recent windows, same day/hour shapes the
//   seeder bakes) → upsert by day/hour key into the R2 object →
//   one atomic PUT.
// fetch: GET …/traffic.json → R2, revalidating cache (never immutable —
//   this file changes in place, unlike the hashed /data pipeline).

const API = 'https://api.cloudflare.com/client/v4/graphql';
const DAY = 864e5;

const todayUTC = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * DAY).toISOString().slice(0, 10);
const hoursAgoISO = (n) =>
  new Date(Date.now() - n * 3600e3).toISOString().slice(0, 13) + ':00:00Z';
const FIFTEEN = 9e5;                                   // 15 min in ms
const iso15 = (ms) => new Date(ms).toISOString().slice(0, 19) + 'Z';

async function gql(env, inner) {
  const r = await fetch(API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: `{ viewer { ${inner} } }` }),
  });
  if (!r.ok) throw new Error(`gql http ${r.status}`);
  const body = await r.json();
  if (body.errors?.length) throw new Error(`gql: ${JSON.stringify(body.errors).slice(0, 300)}`);
  return body.data.viewer;
}

// --- harvest: recent windows only (CF GraphQL retention is short: ~26h hourly) ---

async function freshDaily(env) {
  const d = await gql(env, `zones(filter: {zoneTag: "${env.ZONE_TAG}"}) {
    g: httpRequests1dGroups(limit: 10, filter: {date_geq: "${daysAgo(3)}"}, orderBy: [date_ASC])
    { dimensions { date } sum { requests pageViews } uniq { uniques } } }`);
  return d.zones[0].g.map((g) => ({
    day: g.dimensions.date, uniques: g.uniq.uniques,
    page_views: g.sum.pageViews, requests: g.sum.requests,
  }));
}

async function freshHourly(env) {
  const d = await gql(env, `zones(filter: {zoneTag: "${env.ZONE_TAG}"}) {
    g: httpRequests1hGroups(limit: 200, filter: {datetime_geq: "${hoursAgoISO(26)}"}, orderBy: [datetime_ASC])
    { dimensions { datetime } sum { pageViews } uniq { uniques } } }`);
  return d.zones[0].g.map((g) => ({
    ts: g.dimensions.datetime, page_views: g.sum.pageViews, uniques: g.uniq.uniques,
  }));
}

async function freshCountries(env) {
  // per-day queries (the adaptive dataset caps filters at 24h windows)
  const rows = [];
  for (let i = 2; i >= 0; i--) {
    const lo = daysAgo(i), hi = daysAgo(i - 1);
    const d = await gql(env, `zones(filter: {zoneTag: "${env.ZONE_TAG}"}) {
      g: httpRequestsAdaptiveGroups(limit: 2000,
        filter: {datetime_geq: "${lo}T00:00:00Z", datetime_lt: "${hi}T00:00:00Z"}, orderBy: [count_DESC])
      { sum { visits } dimensions { clientCountryName } } }`);
    for (const g of d.zones[0].g) {
      const c = g.dimensions.clientCountryName;
      if (c && g.sum.visits > 0) rows.push({ day: lo, country: c, visits: g.sum.visits });
    }
  }
  return rows;
}

async function freshReferrers(env) {
  // `visits` as well as `count`: the leaderboard ranks by arrivals (a visit is a
  // session start, which is what a referrer actually attributes), and summing
  // visits across referrers reconciles exactly with the day's total. Note the
  // self-referral filter below is a no-op for visits by construction — a
  // same-site navigation is not a session start, so that row is always 0 — but
  // it still matters for the pageloads figure, which is kept alongside.
  const d = await gql(env, `accounts(filter: {accountTag: "${env.ACCOUNT_TAG}"}) {
    g: rumPageloadEventsAdaptiveGroups(limit: 5000,
      filter: {date_geq: "${daysAgo(3)}"}, orderBy: [date_ASC])
    { count sum { visits } dimensions { date refererHost } } }`);
  return d.accounts[0].g
    .map((g) => ({
      day: g.dimensions.date,
      host: g.dimensions.refererHost || '(direct)',
      pageloads: g.count,
      visits: g.sum.visits,
    }))
    .filter((r) => r.host !== 'timeseriesofindia.com' && !r.host.endsWith('.cloudflareaccess.com'));
}

async function freshBeaconDaily(env) {
  const d = await gql(env, `accounts(filter: {accountTag: "${env.ACCOUNT_TAG}"}) {
    g: rumPageloadEventsAdaptiveGroups(limit: 400,
      filter: {date_geq: "${daysAgo(3)}"}, orderBy: [date_ASC])
    { count sum { visits } dimensions { date } } }`);
  return d.accounts[0].g.map((g) => ({
    day: g.dimensions.date, pageloads: g.count, visits: g.sum.visits,
  }));
}

// Edge visits (the hero's "All" session count) exist only in the adaptive
// dataset, which caps every query at a 24h window, so pull one ungrouped total
// per day rather than a single ranged query.
async function freshEdgeVisits(env) {
  const rows = [];
  for (let i = 2; i >= 0; i--) {
    const lo = daysAgo(i), hi = daysAgo(i - 1);
    const d = await gql(env, `zones(filter: {zoneTag: "${env.ZONE_TAG}"}) {
      g: httpRequestsAdaptiveGroups(limit: 1,
        filter: {datetime_geq: "${lo}T00:00:00Z", datetime_lt: "${hi}T00:00:00Z"})
      { sum { visits } } }`);
    const g = d.zones[0].g[0];
    if (g) rows.push({ day: lo, visits: g.sum.visits });
  }
  return rows;
}

// The beacon's country breakdown, so "countries reached" can answer the
// All | Human toggle. RUM has no 24h cap, so one ranged query covers the window.
async function freshCountriesHuman(env) {
  const d = await gql(env, `accounts(filter: {accountTag: "${env.ACCOUNT_TAG}"}) {
    g: rumPageloadEventsAdaptiveGroups(limit: 5000,
      filter: {date_geq: "${daysAgo(3)}"}, orderBy: [date_ASC])
    { sum { visits } dimensions { date countryName } } }`);
  return d.accounts[0].g
    .filter((g) => g.dimensions.countryName && g.sum.visits > 0)
    .map((g) => ({
      day: g.dimensions.date, country: g.dimensions.countryName, visits: g.sum.visits,
    }));
}

// Page views per format (play / read / explore). Classified inside the worker so
// no raw path list is ever published. Both URL eras are matched at once: the
// play/read/explore rename ships WITH dispatch-1, so everything recorded before
// it is on beats/reads/dashboards paths, and old links keep 301-ing in after.
// '/economy/read' covers read and reads; the other two need an explicit pair.
// Bare '/economy/' is deliberately unclassified (own page before the rename,
// redirects into the read shelf after, so either choice misattributes one era).
const formatOf = (p) => {
  if (!p) return null;
  if (p.startsWith('/economy/read')) return 'read';
  if (p.startsWith('/economy/play') || p.startsWith('/economy/beats')) return 'play';
  if (p.startsWith('/economy/explore') || p.startsWith('/economy/dashboards')) return 'explore';
  return null;
};

async function freshFormats(env) {
  const acc = new Map();
  const bump = (day, fmt, key, n) => {
    if (!fmt) return;
    const id = `${day}|${fmt}`;
    const row = acc.get(id) || { day, format: fmt, human_views: 0, all_views: 0 };
    row[key] += n;
    acc.set(id, row);
  };
  // Beacon side: one ranged query (RUM has no 24h cap).
  const r = await gql(env, `accounts(filter: {accountTag: "${env.ACCOUNT_TAG}"}) {
    g: rumPageloadEventsAdaptiveGroups(limit: 5000,
      filter: {date_geq: "${daysAgo(3)}"}, orderBy: [date_ASC])
    { count dimensions { date requestPath } } }`);
  for (const g of r.accounts[0].g) {
    bump(g.dimensions.date, formatOf(g.dimensions.requestPath), 'human_views', g.count);
  }
  // Edge side: requests to content paths are page loads (assets live under
  // /_astro/), plus the bot crawls that make this the All view. 24h cap, so one
  // call per day.
  for (let i = 2; i >= 0; i--) {
    const lo = daysAgo(i), hi = daysAgo(i - 1);
    const d = await gql(env, `zones(filter: {zoneTag: "${env.ZONE_TAG}"}) {
      g: httpRequestsAdaptiveGroups(limit: 2000,
        filter: {datetime_geq: "${lo}T00:00:00Z", datetime_lt: "${hi}T00:00:00Z"}, orderBy: [count_DESC])
      { count dimensions { clientRequestPath } } }`);
    for (const g of d.zones[0].g) {
      bump(lo, formatOf(g.dimensions.clientRequestPath), 'all_views', g.count);
    }
  }
  return [...acc.values()];
}

// --- intraday (15-minute) buckets for the two "today so far" panels ---
// 96 buckets works out to just under 24h (95 whole buckets plus the open one),
// which keeps every edge query inside its 1-day adaptive cap. Buckets with no
// traffic are real zeros rather than gaps, so the grid is generated here and the
// harvested rows are merged onto it. `all` is the edge visit count, `human` the
// RUM one — the two sides of the page's All/Human toggle.

async function freshRolling15(env) {
  const nowB = Math.floor(Date.now() / FIFTEEN) * FIFTEEN;
  const startB = nowB - 95 * FIFTEEN;
  const since = iso15(startB);
  const [edge, human] = await Promise.all([
    gql(env, `zones(filter: {zoneTag: "${env.ZONE_TAG}"}) {
      g: httpRequestsAdaptiveGroups(limit: 200, filter: {datetime_geq: "${since}"})
      { sum { visits } dimensions { datetimeFifteenMinutes } } }`),
    gql(env, `accounts(filter: {accountTag: "${env.ACCOUNT_TAG}"}) {
      g: rumPageloadEventsAdaptiveGroups(limit: 200, filter: {datetime_geq: "${since}"})
      { sum { visits } dimensions { datetimeFifteenMinutes } } }`),
  ]);
  const key = (g) => g.dimensions.datetimeFifteenMinutes.slice(0, 19) + 'Z';
  const eMap = new Map(edge.zones[0].g.map((g) => [key(g), g.sum.visits]));
  const hMap = new Map(human.accounts[0].g.map((g) => [key(g), g.sum.visits]));
  const out = [];
  for (let t = startB; t <= nowB; t += FIFTEEN) {
    const k = iso15(t);
    out.push({ t: k, all: eMap.get(k) ?? 0, human: hMap.get(k) ?? 0 });
  }
  return out;
}

// Yesterday's complete UTC day at 15-minute grain, for the optional "previous
// day" overlay. rolling15 can't supply this: its trailing-24h window reaches
// only into yesterday's evening late in the day and misses the early hours that
// make up most of the comparison. Fetched as a whole day, which on the edge side
// is exactly the 1-day cap.
async function freshPrevDay15(env) {
  const lo = daysAgo(1), hi = daysAgo(0);
  const [edge, human] = await Promise.all([
    gql(env, `zones(filter: {zoneTag: "${env.ZONE_TAG}"}) {
      g: httpRequestsAdaptiveGroups(limit: 200,
        filter: {datetime_geq: "${lo}T00:00:00Z", datetime_lt: "${hi}T00:00:00Z"})
      { sum { visits } dimensions { datetimeFifteenMinutes } } }`),
    gql(env, `accounts(filter: {accountTag: "${env.ACCOUNT_TAG}"}) {
      g: rumPageloadEventsAdaptiveGroups(limit: 200,
        filter: {datetime_geq: "${lo}T00:00:00Z", datetime_lt: "${hi}T00:00:00Z"})
      { sum { visits } dimensions { datetimeFifteenMinutes } } }`),
  ]);
  const key = (g) => g.dimensions.datetimeFifteenMinutes.slice(0, 19) + 'Z';
  const eMap = new Map(edge.zones[0].g.map((g) => [key(g), g.sum.visits]));
  const hMap = new Map(human.accounts[0].g.map((g) => [key(g), g.sum.visits]));
  const start = Date.parse(`${lo}T00:00:00Z`);
  const out = [];
  for (let i = 0; i < 96; i++) {           // a full UTC day is always 96 buckets
    const k = iso15(start + i * FIFTEEN);
    out.push({ t: k, all: eMap.get(k) ?? 0, human: hMap.get(k) ?? 0 });
  }
  return out;
}

// The same trailing-24h window as freshRolling15, but page views split by format
// (play / read / explore) — the formats current-day panel. Classified in the
// worker (no raw path list published); rows are { t, format, all, human }, sparse
// (only buckets with traffic), the client fills the grid.
async function freshFormatsRolling15(env) {
  const nowB = Math.floor(Date.now() / FIFTEEN) * FIFTEEN;
  const since = iso15(nowB - 95 * FIFTEEN);
  const acc = new Map();
  const bump = (t, fmt, key, n) => {
    if (!fmt) return;
    const id = `${t}|${fmt}`;
    const row = acc.get(id) || { t, format: fmt, human: 0, all: 0 };
    row[key] += n;
    acc.set(id, row);
  };
  const key15 = (g) => g.dimensions.datetimeFifteenMinutes.slice(0, 19) + 'Z';
  const [human, edge] = await Promise.all([
    gql(env, `accounts(filter: {accountTag: "${env.ACCOUNT_TAG}"}) {
      g: rumPageloadEventsAdaptiveGroups(limit: 5000, filter: {datetime_geq: "${since}"})
      { count dimensions { datetimeFifteenMinutes requestPath } } }`),
    gql(env, `zones(filter: {zoneTag: "${env.ZONE_TAG}"}) {
      g: httpRequestsAdaptiveGroups(limit: 5000,
        filter: {datetime_geq: "${since}", clientRequestPath_like: "/economy%"})
      { count dimensions { datetimeFifteenMinutes clientRequestPath } } }`),
  ]);
  for (const g of human.accounts[0].g) bump(key15(g), formatOf(g.dimensions.requestPath), 'human', g.count);
  for (const g of edge.zones[0].g) bump(key15(g), formatOf(g.dimensions.clientRequestPath), 'all', g.count);
  return [...acc.values()].sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0));
}

// Yesterday's complete UTC day, page views by format at 15-minute grain — the
// previous-day overlay for the formats current-day panel (freshPrevDay15's
// per-format twin). One UTC day is inside the edge cap, so one query per side.
async function freshFormatsPrevDay15(env) {
  const lo = daysAgo(1), hi = daysAgo(0);
  const acc = new Map();
  const bump = (t, fmt, key, n) => {
    if (!fmt) return;
    const id = `${t}|${fmt}`;
    const row = acc.get(id) || { t, format: fmt, human: 0, all: 0 };
    row[key] += n;
    acc.set(id, row);
  };
  const key15 = (g) => g.dimensions.datetimeFifteenMinutes.slice(0, 19) + 'Z';
  const [human, edge] = await Promise.all([
    gql(env, `accounts(filter: {accountTag: "${env.ACCOUNT_TAG}"}) {
      g: rumPageloadEventsAdaptiveGroups(limit: 5000,
        filter: {datetime_geq: "${lo}T00:00:00Z", datetime_lt: "${hi}T00:00:00Z"})
      { count dimensions { datetimeFifteenMinutes requestPath } } }`),
    gql(env, `zones(filter: {zoneTag: "${env.ZONE_TAG}"}) {
      g: httpRequestsAdaptiveGroups(limit: 5000,
        filter: {datetime_geq: "${lo}T00:00:00Z", datetime_lt: "${hi}T00:00:00Z", clientRequestPath_like: "/economy%"})
      { count dimensions { datetimeFifteenMinutes clientRequestPath } } }`),
  ]);
  for (const g of human.accounts[0].g) bump(key15(g), formatOf(g.dimensions.requestPath), 'human', g.count);
  for (const g of edge.zones[0].g) bump(key15(g), formatOf(g.dimensions.clientRequestPath), 'all', g.count);
  return [...acc.values()].sort((a, b) => (a.t < b.t ? -1 : a.t > b.t ? 1 : 0));
}

// --- merge (same clamps as build-meta.mjs) ---

const upsert = (base, fresh, key) => {
  const m = new Map((base || []).map((r) => [key(r), r]));
  for (const r of fresh) m.set(key(r), r);
  return [...m.values()];
};

async function refresh(env) {
  const cur = await env.META.get('traffic.json');
  const base = cur ? await cur.json() : null;
  if (!base?.daily?.length) throw new Error('no seed: PUT build-meta.mjs output to R2 first');

  const [daily, hourly, countries, referrers, beacon, edgeVisits, countriesHuman,
         formats, rolling15, prevDay15, formatsRolling15, formatsPrevDay15] = await Promise.all([
      freshDaily(env), freshHourly(env), freshCountries(env),
      freshReferrers(env), freshBeaconDaily(env),
      freshEdgeVisits(env), freshCountriesHuman(env), freshFormats(env),
      freshRolling15(env), freshPrevDay15(env),
      freshFormatsRolling15(env), freshFormatsPrevDay15(env),
    ]);

  // httpRequests1dGroups carries no `visits`, so splice the per-day adaptive
  // totals onto the daily rows. Fall back to whatever the base already held when
  // a day sits outside the adaptive window, so a re-run never nulls out history.
  const baseVisits = new Map((base.daily || []).map((r) => [r.day, r.visits]));
  const evMap = new Map(edgeVisits.map((r) => [r.day, r.visits]));
  const dailyRows = daily.map((r) => ({
    ...r,
    visits: evMap.has(r.day) ? evMap.get(r.day) : (baseVisits.get(r.day) ?? null),
  }));

  const today = todayUTC();
  // The current UTC day's partial row is in `daily`/`beacon` (both windows
  // include today) BEFORE the filters below drop it — `daily`'s contract is
  // complete days only, a partial day reads as a dip on the line. Grab it
  // here and publish it separately so the page can render an in-progress
  // point instead.
  const todayDaily = dailyRows.find((r) => r.day === today) ?? null;
  const todayBeacon = beacon.find((r) => r.day === today) ?? null;
  const mDaily = upsert(base.daily, dailyRows, (r) => r.day)
    .filter((r) => r.day < today).sort((a, b) => a.day.localeCompare(b.day));
  const minDay = mDaily[0].day;
  const clamp = (rows) => rows.filter((r) => r.day >= minDay && r.day < today)
    .sort((a, b) => a.day.localeCompare(b.day));

  const out = {
    built_at: new Date().toISOString(),
    daily: mDaily,
    hourly: upsert(base.hourly, hourly, (r) => r.ts).sort((a, b) => a.ts.localeCompare(b.ts)),
    beacon_daily: clamp(upsert(base.beacon_daily, beacon, (r) => r.day)),
    countries_daily: clamp(upsert(base.countries_daily, countries, (r) => `${r.day}|${r.country}`)),
    countries_human_daily: clamp(
      upsert(base.countries_human_daily, countriesHuman, (r) => `${r.day}|${r.country}`),
    ),
    referrers_daily: clamp(upsert(base.referrers_daily, referrers, (r) => `${r.day}|${r.host}`)),
    // The sealed arrays above stay complete-days-only so history never shifts.
    // Today's rows were already being fetched and then thrown away by clamp();
    // publish them separately and let the page merge them when its range
    // reaches the current day. Costs no extra GraphQL calls.
    today_countries: countries.filter((r) => r.day === today),
    today_countries_human: countriesHuman.filter((r) => r.day === today),
    today_referrers: referrers.filter((r) => r.day === today),
    // Formats needs the same treatment: freshFormats already fetches today
    // (daysAgo(3)..daysAgo(0)) and clamp() then dropped it, so the daily format
    // chart could never draw an in-progress point while the hero beside it did.
    // That also made the documented invariant unmeetable — "today so far, by
    // format" is supposed to sum to today's point on the chart above.
    today_formats: formats.filter((r) => r.day === today),
    formats_daily: clamp(upsert(base.formats_daily, formats, (r) => `${r.day}|${r.format}`)),
    // Intraday buckets for the two "today so far" panels. Not merged onto the
    // base: each is a full recompute of a fixed grid every tick (keyed by
    // time), so the fresh array IS the new value. The baked snapshot has none
    // of these (no 15-minute grain in the DB), which is what puts those panels
    // into their "live feed offline" state until the first worker run.
    rolling15,
    prev_day15: prevDay15,
    formats_rolling15: formatsRolling15,
    formats_prev_day15: formatsPrevDay15,
    dispatches: base.dispatches || [], // git tags: only the seeder knows these
    today: todayDaily ? {
      day: todayDaily.day, uniques: todayDaily.uniques,
      page_views: todayDaily.page_views, requests: todayDaily.requests,
      visits: todayDaily.visits,
      beacon: todayBeacon ? { pageloads: todayBeacon.pageloads, visits: todayBeacon.visits } : null,
    } : null,
  };
  await env.META.put('traffic.json', JSON.stringify(out) + '\n', {
    httpMetadata: { contentType: 'application/json' },
  });
  return {
    built_at: out.built_at, days: out.daily.length, hours: out.hourly.length,
    merged: { daily: daily.length, hourly: hourly.length, countries: countries.length,
      referrers: referrers.length, beacon: beacon.length,
      edge_visits: edgeVisits.length, countries_human: countriesHuman.length,
      formats: formats.length, rolling15: rolling15.length, prev_day15: prevDay15.length,
      formats_rolling15: formatsRolling15.length, formats_prev_day15: formatsPrevDay15.length },
  };
}

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(refresh(env));
  },

  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = { 'Access-Control-Allow-Origin': '*' };

    if (url.pathname.endsWith('/traffic.json') && (req.method === 'GET' || req.method === 'HEAD')) {
      const obj = await env.META.get('traffic.json');
      if (!obj) return new Response('not yet seeded', { status: 404, headers: cors });
      return new Response(req.method === 'HEAD' ? null : obj.body, {
        headers: {
          ...cors,
          'Content-Type': 'application/json',
          // Revalidating, never immutable — this URL's content changes in place.
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
          ETag: obj.httpEtag,
        },
      });
    }

    // Manual run for verification (guarded by the same runtime secret).
    if (url.pathname === '/__run' && req.method === 'POST') {
      if (req.headers.get('Authorization') !== `Bearer ${env.CF_ANALYTICS_TOKEN}`)
        return new Response(null, { status: 401 });
      try {
        return Response.json(await refresh(env));
      } catch (e) {
        return Response.json({ error: String(e) }, { status: 500 });
      }
    }

    return new Response(null, { status: 404, headers: cors });
  },
};
