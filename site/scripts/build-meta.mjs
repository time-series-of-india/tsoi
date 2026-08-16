// Meta page dataset — the site's own traffic ("Time Series Observing Itself").
// Reads the telemetry schema (the telemetry tables are refreshed from
// Cloudflare analytics every 4h into this machine's TimescaleDB) and
// emits one JSON snapshot the /meta island renders. Dispatch markers come from
// git tags (dispatch-0, dispatch-1, …) so release events are repo-verifiable.
//
// Zone counts (daily/hourly) are edge-measured: every request, bots included.
// Referrers come from the RUM beacon: human-ish, adblock-undercounted. The page
// says so — neither series is adjusted.
import pg from 'pg';
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(SITE, 'public/data/meta');

const client = new pg.Client({
  host: process.env.DB_HOST || '127.0.0.1',
  port: +(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'npci',
});
await client.connect();
mkdirSync(OUT, { recursive: true });

// Exclude the current (incomplete) day — a partial day dips the trailing point.
// `visits` is the edge-side session count (the hero's "All" series). It lives
// only in httpRequestsAdaptiveGroups, so cf_daily.visits is filled by a separate
// per-day pull and is null for days older than the country archive (~2026-07-05).
const daily = (await client.query(`
  SELECT to_char(day, 'YYYY-MM-DD') AS day, uniques::int, page_views::int,
         requests::int, visits::int
  FROM telemetry.cf_daily WHERE day < CURRENT_DATE ORDER BY day`)).rows;

const hourly = (await client.query(`
  SELECT to_char(ts AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:00:00"Z"') AS ts,
         page_views::int, uniques::int
  FROM telemetry.cf_hourly ORDER BY ts`)).rows;

// Beacon (human-leaning) daily totals — the hero's "Human visits" toggle.
// Rolled up from the per-path RUM table; same partial-day exclusion as daily.
// The beacon ran during pre-launch previews, so clamp to the public window
// (the edge series' first day) or stray dev-traffic days stretch the axis.
const beacon_daily = (await client.query(`
  SELECT to_char(day, 'YYYY-MM-DD') AS day,
         sum(pageloads)::int AS pageloads, sum(visits)::int AS visits
  FROM telemetry.rum_path_daily
  WHERE day < CURRENT_DATE AND day >= (SELECT min(day) FROM telemetry.cf_daily)
  GROUP BY day ORDER BY day`)).rows;

// Per-day breakdowns (not pre-summed): the meta island's comparison tables are
// range-aware (re-rank + re-aggregate to the reader's selected window, with a
// per-row sparkline), so the client needs each country/host's day-by-day
// series, not just an all-time total. Same day clamps as `daily` above (drop
// the current incomplete day; clamp to the public window so pre-launch
// preview traffic doesn't stretch it). ISO-2 country codes as Cloudflare
// reports them; the island names them via Intl.DisplayNames.
const countries_daily = (await client.query(`
  SELECT to_char(day, 'YYYY-MM-DD') AS day, country, visits::int
  FROM telemetry.cf_country_daily
  WHERE visits > 0 AND day < CURRENT_DATE AND day >= (SELECT min(day) FROM telemetry.cf_daily)
  ORDER BY day`)).rows;

// The beacon's own country breakdown, so "countries reached" can answer the
// All | Human toggle. Edge countries are inflated by crawler geography (many
// countries reach the edge and never a real browser), so the Human count is the
// meaningful reach figure and is what the tile shows by default.
const countries_human_daily = (await client.query(`
  SELECT to_char(day, 'YYYY-MM-DD') AS day, country, visits::int
  FROM telemetry.rum_country_daily
  WHERE visits > 0 AND day < CURRENT_DATE AND day >= (SELECT min(day) FROM telemetry.cf_daily)
  ORDER BY day`)).rows;

// Page views per format (play / read / explore), grouped here rather than in the
// client so no raw path list ever ships. Two naming eras have to be matched at
// once: the play/read/explore rename lands WITH dispatch-1, so every row
// recorded before it is on the old beats/reads/dashboards paths, and old links
// keep 301-ing in afterwards. '/economy/read%' covers read/ and reads/ in one
// go; the other two need an explicit pair. Bare '/economy/' is left out: it was
// its own page before the rename and redirects into the read shelf after, so
// counting it either way would misattribute one era.
const FORMAT_CASE = `CASE
  WHEN path LIKE '/economy/read%' THEN 'read'
  WHEN path LIKE '/economy/play%' OR path LIKE '/economy/beats%' THEN 'play'
  WHEN path LIKE '/economy/explore%' OR path LIKE '/economy/dashboards%' THEN 'explore'
  END`;

// Human side: beacon page loads. Edge side: requests to those paths, which is a
// fair page-view proxy because assets live under /_astro/, so a request to a
// content path is a page load (plus the bot crawls that make it the All view).
const formats_daily = (await client.query(`
  SELECT day, format, human_views::int, all_views::int FROM (
    SELECT to_char(d.day, 'YYYY-MM-DD') AS day, d.format,
           sum(d.human_views) AS human_views, sum(d.all_views) AS all_views
    FROM (
      SELECT day, ${FORMAT_CASE} AS format, pageloads AS human_views, 0 AS all_views
      FROM telemetry.rum_path_daily
      UNION ALL
      SELECT day, ${FORMAT_CASE} AS format, 0 AS human_views, requests AS all_views
      FROM telemetry.cf_path_daily
    ) d
    WHERE d.format IS NOT NULL
      AND d.day < CURRENT_DATE AND d.day >= (SELECT min(day) FROM telemetry.cf_daily)
    GROUP BY d.day, d.format
  ) x ORDER BY day, format`)).rows;

// Self-referrals and the Cloudflare Access preview host are navigation, not sources.
const referrers_daily = (await client.query(`
  SELECT to_char(day, 'YYYY-MM-DD') AS day, referer_host AS host, pageloads::int, visits::int
  FROM telemetry.rum_referer_daily
  WHERE referer_host <> 'timeseriesofindia.com'
    AND referer_host NOT LIKE '%.cloudflareaccess.com'
    AND day < CURRENT_DATE AND day >= (SELECT min(day) FROM telemetry.cf_daily)
  ORDER BY day`)).rows;

// The current (incomplete) UTC day, published separately so the page can draw
// it as a detached in-progress point instead of folding it into `daily` (see
// the exclusion note above). The telemetry tables refresh every 4h, so a
// partial row may already exist for today; if not, `today` is null. This
// snapshot value goes stale between builds — the page guards on the date, so
// a stale/mismatched `today` is simply ignored client-side.
const todayDailyRow = (await client.query(`
  SELECT to_char(day, 'YYYY-MM-DD') AS day, uniques::int, page_views::int,
         requests::int, visits::int
  FROM telemetry.cf_daily WHERE day = CURRENT_DATE`)).rows[0] ?? null;
const todayBeaconRow = (await client.query(`
  SELECT sum(pageloads)::int AS pageloads, sum(visits)::int AS visits
  FROM telemetry.rum_path_daily WHERE day = CURRENT_DATE`)).rows[0] ?? null;
const today = todayDailyRow ? {
  day: todayDailyRow.day, uniques: todayDailyRow.uniques,
  page_views: todayDailyRow.page_views, requests: todayDailyRow.requests,
  visits: todayDailyRow.visits,
  beacon: (todayBeaconRow && todayBeaconRow.pageloads != null)
    ? { pageloads: todayBeaconRow.pageloads, visits: todayBeaconRow.visits } : null,
} : null;

// Today's partial breakdowns, published separately from the sealed arrays
// above (which stay complete-days-only, so history never shifts underfoot). The
// page merges these into the leaderboards only when the selected range reaches
// the current day AND the payload's day is genuinely today, the same guard the
// hero's in-progress point uses. Without this the audience tables silently
// trailed every other panel by a day.
const today_countries = (await client.query(`
  SELECT to_char(day, 'YYYY-MM-DD') AS day, country, visits::int
  FROM telemetry.cf_country_daily WHERE day = CURRENT_DATE AND visits > 0`)).rows;
const today_countries_human = (await client.query(`
  SELECT to_char(day, 'YYYY-MM-DD') AS day, country, visits::int
  FROM telemetry.rum_country_daily WHERE day = CURRENT_DATE AND visits > 0`)).rows;
// Today's per-format rows, same split as formats_daily above. Published apart
// from the sealed array so the daily format chart can draw an in-progress point
// (the hero does), and so "today so far, by format" has a point to sum to.
const today_formats = (await client.query(`
  SELECT format, human_views::int, all_views::int FROM (
    SELECT d.format, sum(d.human_views) AS human_views, sum(d.all_views) AS all_views
    FROM (
      SELECT ${FORMAT_CASE} AS format, pageloads AS human_views, 0 AS all_views
      FROM telemetry.rum_path_daily WHERE day = CURRENT_DATE
      UNION ALL
      SELECT ${FORMAT_CASE} AS format, 0 AS human_views, requests AS all_views
      FROM telemetry.cf_path_daily WHERE day = CURRENT_DATE
    ) d
    WHERE d.format IS NOT NULL GROUP BY d.format
  ) x ORDER BY format`)).rows
  .map((r) => ({ day: new Date().toISOString().slice(0, 10), ...r }));

const today_referrers = (await client.query(`
  SELECT to_char(day, 'YYYY-MM-DD') AS day, referer_host AS host, pageloads::int, visits::int
  FROM telemetry.rum_referer_daily
  WHERE day = CURRENT_DATE
    AND referer_host <> 'timeseriesofindia.com'
    AND referer_host NOT LIKE '%.cloudflareaccess.com'`)).rows;

// ── per-piece visits, all time (the Content desk) ────────────────────────
// One row per piece per day, carrying both metrics side by side: edge visits
// (the All scope) and beacon visits (the Human scope). Three rules from the
// 2026-08-12 dispatch visit audit decide which paths belong to which piece,
// and all three are applied HERE, in SQL, never in the client:
//
//  1. Old-URL union. The 2026-07-24 rename (beats→play, reads→read singular,
//     dashboards→explore) left real traffic parked on the old paths: 85,365
//     visits sit on /economy/reads/upi-architecture/ against 1,870 on the new
//     one, nearly all of it a single Hacker News front page. Every piece that
//     predates the rename carries both forms, and the pages that were folded
//     into an explore desk carry the URLs they were folded from.
//  2. Multi-route pieces. The Rupee Time Machine's per-year pages and the
//     puzzle game's numbered archive are sub-routes of one piece, summed into
//     it rather than listed as dozens of near-empty rows.
//  3. Exact paths only. cf_path_daily.path is full of bot and log-injection
//     junk, %-encoded artefacts and doubled slashes, almost all of it at
//     visits = 0. A LIKE pattern sweeps that in; an equality join cannot.
//
// Hubs are not pieces: '/', the section indexes, the read shelf, the play
// rack, the explore gateway, /meta and /about are all left out. Someone who
// landed on a shelf has not read anything yet.
// `minor` marks the dispatch-1 payment shorts — lineage.mjs kind 'short', the
// eight one-chart pieces that were written to sit under the flagship read and
// are no longer linked from anywhere a reader can reach. Their traffic still
// counts and they keep their names here; the page bars them from ranking as
// rows so the table lists things that are still openable. Nothing else about
// them is special-cased, so un-marking one puts it straight back on the board.
const read = (slug, title, minor = false) => ({
  slug, title, format: 'read', minor,
  paths: [`/economy/read/${slug}/`, `/economy/reads/${slug}/`],
});
// Sub-route enumerations, written out rather than pattern-matched (rule 3).
// The ranges are deliberately wider than what is served today, so a new puzzle
// or a re-cut year range needs no edit here; a path that was never served
// simply contributes no rows.
const span = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const RTM = '/economy/explore/rupee-time-machine';
// The six dashboards that the Jul 2026 desks fold merged into one explore
// page. A many-to-one merge rather than a rename, which is why the audit left
// it alone; both legacy grammars 301 to the payments page today, so their
// traffic is that page's traffic.
const FOLDED = ['overview', 'product-view', 'bank-performance', 'upi-ecosystem', 'state-wise', 'mcc'];
const CONTENT = [
  read('upi-architecture', 'UPI: Anatomy of a Transaction'),
  read('price-of-nearly-everything', 'Inflation: The Price of Nearly Everything'),
  read('credit-vs-debit', 'The debit card faded as UPI rose, the credit card didn’t', true),
  read('duel', 'Two apps run four-fifths of UPI', true),
  read('where-india-pays', 'Half of India’s UPI comes from five states', true),
  read('how-india-moves', 'India runs on UPI, but its money moves on RTGS', true),
  read('where-money-lands', 'India pays from SBI, and into Yes Bank', true),
  read('what-india-buys', 'Most of what India buys on UPI is food', true),
  read('shops-vs-people', 'India pays shops more often than people', true),
  read('bank-reliability', 'The banks’ own UPI failures are rare, and falling', true),
  { slug: 'independence', title: 'The Walk through Midnight', format: 'film',
    paths: ['/independence/'] },
  { slug: 'inflation-peaks', title: 'Inflation Peaks', format: 'play',
    paths: ['/economy/play/inflation-peaks/'] },
  { slug: 'off-by-how-much', title: 'Off by How Much?', format: 'play',
    paths: ['/economy/play/off-by-how-much/', '/economy/beats/off-by-how-much/',
      ...span(1, 60).flatMap((n) => [
        `/economy/play/off-by-how-much/${n}/`, `/economy/beats/off-by-how-much/${n}/`])] },
  { slug: 'payments-deck', title: 'Six things India’s payment data knows', format: 'play',
    paths: ['/economy/play/payments/', '/economy/beats/payments/'] },
  { slug: 'explore-payments', title: 'India Payments', format: 'explore',
    paths: ['/economy/explore/payments/',
      ...FOLDED.flatMap((s) => [`/economy/explore/${s}/`, `/economy/dashboards/${s}/`])] },
  { slug: 'explore-inflation', title: 'India Inflation', format: 'explore',
    paths: ['/economy/explore/inflation/'] },
  { slug: 'rupee-time-machine', title: 'Rupee Time Machine', format: 'explore',
    paths: [`${RTM}/`, ...span(1947, 2035).map((y) => `${RTM}/${y}/`)] },
];
// Unlike every other array here the current (incomplete) day is NOT excluded:
// this desk is all-time by definition, it carries no range control and no live
// feed, and dropping today would put it permanently behind the Total visits
// tile beside it. Beacon days before the site was public are still clamped
// away (the beacon ran during pre-launch previews).
const contentRows = (await client.query(`
  WITH item(slug, path) AS (SELECT * FROM unnest($1::text[], $2::text[]))
  SELECT i.slug, to_char(d.day, 'YYYY-MM-DD') AS day,
         sum(d.visits)::int AS visits, sum(d.rum_visits)::int AS rum_visits
  FROM (
    SELECT day, path, visits, 0 AS rum_visits FROM telemetry.cf_path_daily
    UNION ALL
    SELECT day, path, 0 AS visits, visits AS rum_visits FROM telemetry.rum_path_daily
  ) d
  JOIN item i ON i.path = d.path
  WHERE d.day >= (SELECT min(day) FROM telemetry.cf_daily)
  GROUP BY i.slug, d.day
  HAVING sum(d.visits) > 0 OR sum(d.rum_visits) > 0
  ORDER BY i.slug, d.day`,
  [CONTENT.flatMap((c) => c.paths.map(() => c.slug)), CONTENT.flatMap((c) => c.paths)])).rows;
const contentBySlug = new Map();
for (const r of contentRows) {
  const list = contentBySlug.get(r.slug) ?? contentBySlug.set(r.slug, []).get(r.slug);
  list.push({ day: r.day, visits: r.visits, rum_visits: r.rum_visits });
}
// A piece nobody has opened yet ships no empty row — the table would show it
// as a zero and the "Rest (n)" tally would count it as a piece with traffic.
const content = CONTENT
  .filter((c) => contentBySlug.has(c.slug))
  .map((c) => ({
    slug: c.slug, title: c.title, format: c.format,
    ...(c.minor ? { minor: true } : {}),
    daily: contentBySlug.get(c.slug),
  }));

// Dispatch markers from git tags — each release event traceable to a commit.
const dispatches = execSync("git tag -l 'dispatch-*'", { cwd: SITE, encoding: 'utf8' })
  .split('\n').filter(Boolean).sort()
  .map((tag) => {
    const [sha, date, ...subject] = execSync(
      `git log -1 --date=format-local:%Y-%m-%d --format='%h %ad %s' ${tag}`,
      { cwd: SITE, encoding: 'utf8', env: { ...process.env, TZ: 'UTC' } },
    ).trim().split(' ');
    return { id: tag, sha, date, label: subject.join(' ') };
  });

const out = {
  built_at: new Date().toISOString(),
  daily, hourly, beacon_daily, countries_daily, countries_human_daily,
  referrers_daily, formats_daily, content, dispatches, today,
  today_countries, today_countries_human, today_referrers, today_formats,
};
writeFileSync(resolve(OUT, 'traffic.json'), JSON.stringify(out) + '\n');
const nDistinct = (rows, key) => new Set(rows.map((r) => r[key])).size;
console.log(
  `meta/traffic.json: ${daily.length} days (${beacon_daily.length} beacon), ${hourly.length} hours, ` +
  `${nDistinct(countries_daily, 'country')} countries all / ` +
  `${nDistinct(countries_human_daily, 'country')} human, ` +
  `${nDistinct(referrers_daily, 'host')} referrers (${referrers_daily.length} day-rows), ` +
  `${nDistinct(formats_daily, 'format')} formats (${formats_daily.length} day-rows), ` +
  `${content.length} content pieces (${contentRows.length} day-rows, ` +
  `${content.reduce((s, c) => s + c.daily.reduce((n, d) => n + d.visits, 0), 0)} visits all / ` +
  `${content.reduce((s, c) => s + c.daily.reduce((n, d) => n + d.rum_visits, 0), 0)} human), ` +
  `${dispatches.length} dispatches (${dispatches.map((d) => d.id).join(', ')})`,
);
await client.end();
