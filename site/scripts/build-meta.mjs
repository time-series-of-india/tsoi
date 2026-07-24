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

// Dispatch markers from git tags — each release event traceable to a commit.
const dispatches = execSync("git tag -l 'dispatch-*'", { cwd: SITE, encoding: 'utf8' })
  .split('\n').filter(Boolean).sort()
  .map((tag) => {
    const [sha, date, ...subject] = execSync(
      `git log -1 --format='%h %as %s' ${tag}`, { cwd: SITE, encoding: 'utf8' },
    ).trim().split(' ');
    return { id: tag, sha, date, label: subject.join(' ') };
  });

const out = {
  built_at: new Date().toISOString(),
  daily, hourly, beacon_daily, countries_daily, countries_human_daily,
  referrers_daily, formats_daily, dispatches, today,
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
  `${dispatches.length} dispatches (${dispatches.map((d) => d.id).join(', ')})`,
);
await client.end();
