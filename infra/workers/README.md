# Edge workers (meta-live · play-score)

Two scheduled Workers, provisioned 2026-07-18. Neither is on the site's
serving path: the static site (`site/wrangler.toml`, worker `tsoi`) never
depends on them — /meta falls back to its baked snapshot, the game's
percentile line simply doesn't render.

## Tokens (never in this repo; live in the ops env file, outside this repo)

| Purpose | Env var | Cloudflare permissions |
|---|---|---|
| Provisioning (wrangler on the Mac) | `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` | Account → Workers Scripts:Edit, Workers R2 Storage:Edit, Account Settings:Read; Zone (timeseriesofindia.com) → Workers Routes:Edit |
| meta-live runtime (Worker secret) | `CF_ANALYTICS_TOKEN` | Account → Account Analytics:Read; Zone (timeseriesofindia.com) → Analytics:Read |
| play-score runtime (Worker secret) | `PEAKS_KEY` | none — a local HMAC key, not a Cloudflare credential |

R2 access is via bucket binding, so nothing on the score path needs a
Cloudflare token. `PEAKS_KEY` signs the Inflation Peaks run tokens: any long
random string, piped straight into the secret without ever being stored
(`openssl rand -hex 32 | npx wrangler secret put PEAKS_KEY`). It needs no copy
anywhere — rotating it merely invalidates run tokens in flight, which cost one
unfiled run each. Locally it lives in `play-score/.dev.vars` as
`PEAKS_KEY=local-dev-key`, which is gitignored. Without it `/api/peaks-token`
answers 503 and the game files nothing, which is the same quiet degradation as
the worker being down.

## Deploy (from each worker's directory; env sourced from the ops env file)

```sh
set -a; source <path-to-ops-env>; set +a
npx wrangler r2 bucket create tsoi-meta        # once
npx wrangler r2 bucket create tsoi-play        # once

# meta-live
cd infra/workers/meta-live
npx wrangler deploy --var ACCOUNT_TAG:"$CLOUDFLARE_ACCOUNT_ID"
echo "$CF_ANALYTICS_TOKEN" | npx wrangler secret put CF_ANALYTICS_TOKEN

# seed (full history + dispatch tags come only from the DB path):
#   tools/mac-db-refresh.sh → node site/scripts/build-meta.mjs →
npx wrangler r2 object put tsoi-meta/traffic.json \
  --file ../../../site/public/data/meta/traffic.json \
  --content-type application/json

# manual first run + check
curl -s -X POST -H "Authorization: Bearer $CF_ANALYTICS_TOKEN" \
  https://tsoi-meta-live.<subdomain>.workers.dev/__run
curl -s https://tsoi-meta-live.<subdomain>.workers.dev/data/live/traffic.json | head -c 300

# play-score
cd ../play-score && npx wrangler deploy
echo "$PEAKS_KEY" | npx wrangler secret put PEAKS_KEY
```

## Prod routes — attached

Both workers carry their prod routes in wrangler.toml and are deployed on
them: meta-live on `timeseriesofindia.com/data/live/*`, play-score on
`/api/play-*` **and** `/api/peaks-*` (attached 2026-08-08, with the peaks
endpoints). Both play-score patterns are needed — `/api/play-*` alone leaves
every Inflation Peaks endpoint on workers.dev, where the site's own origin
will not reach it.

A preview can still point at workers.dev via `PUBLIC_META_LIVE_URL` /
`PUBLIC_PLAY_API` (build-time vars; see meta.astro and the game component).

## Post-deploy hardening (dashboard, once)

- WAF rate-limit rule: `/api/play-score` POST, ~10 req/10 s per IP.
- **WAF rate-limit rule: `/api/peaks-run` and `/api/peaks-index` POST, ~10
  req/10 s per IP. This one is a precondition of shipping, not a nicety.**
  The zone's plan allows exactly one rate-limit rule, so in practice all three
  paths live in that single rule ("play + peaks rate limit"): block, 10 req/10 s
  per `ip.src`, path-only match — the paths serve nothing but the POST
  endpoints, so a method filter would add nothing.
  `/api/peaks-index` takes no token, so it is the whole of what stands between
  a script and the board — and the board used to read at most 5,000 filings,
  which accidentally bounded what pid-spam could cost. That cap is gone.
  `peaks/index/` is never swept by design, so every junk pid is now a permanent
  line item in every nightly rescore.
- R2 lifecycle rule on `tsoi-play`: delete `raw/`, `peaks/raw/` and
  `peaks/journal/` objects older than 30 days. Backstop for post-commit
  deletes that failed; anything it catches is already behind a cursor and can
  never be counted again. `peaks/index/` is never swept — a filing is a
  permanent fact and the rescore is derived from all of them.
- Token hygiene (meta plan P0 §3): after launch week, rotate the old
  all-purpose deploy token that lived in three checkouts.

## Puzzle releases

Bump `MAX_PUZZLE` in play-score/wrangler.toml with each puzzle release and
redeploy — the ingest whitelist rejects unknown puzzle numbers.

## Inflation Peaks endpoints (play-score)

Same worker, same bucket, everything under a `peaks/` prefix.

| Endpoint | What it does |
|---|---|
| `GET /api/peaks-token` | Issues `t.nonce.sig`, signed with `PEAKS_KEY`. Stateless, uncached. 503 when the secret is missing. |
| `POST /api/peaks-run` | `{ era, mode, months, token }`. The token's age has to cover 50 ms per month claimed and stay under six hours. Files one object under `peaks/raw/{era}-{mode}/`. |
| `POST /api/peaks-index` | `{ pid, bests }` — a whole six-era basket, each era's `secs` optional. No name, no token. Last write per pid wins. Writes `peaks/index/<pid>.json`, then a note under `peaks/journal/`. |
| `GET /api/peaks-stats/{era}-{mode}.json` | The per-stretch histogram, 60 s cache with SWR 300, same as `/api/play-stats/`. 404 until the first aggregation. |
| `GET /api/peaks-board.json` | The filed-index histogram and the top band's time table, streamed verbatim from `peaks/board.json`. Same headers. 404 until somebody has filed. |
| `GET /api/peaks-health.json` | Every cap and backlog the board can hit, and nothing else: `plays`, `config`, `filings`, `scored`, `journal`, `folded`, `budget`, `paused`, `capped`, `rescored_at`, `updated_at`. Named field by field, not "everything except", so the next field added to the state file is not published by accident. |

`/meta` reads the health endpoint into a Scoring desk, using the same
`PUBLIC_PLAY_API` the game uses so a preview can point at workers.dev. It is
fetched without being awaited and the desk stays hidden on any failure: a
different worker on a different bucket must not delay or dent a page about
traffic. The point of it is that a cap should be a figure someone looks at.
The board once reported half its players for as long as nobody thought to
check, and the whole of the warning was one line in a log.

The cron folds runs into eighteen `{era}-{mode}` histograms behind a cursor, the
way the puzzle path does. The board is maintained rather than rebuilt: each
filing appends a journal note saying what that pid scored and what it scored
before, and the cron folds the notes since its cursor. Work is proportional to
how many people just played rather than to how many have ever played, and a
quiet five minutes costs about two operations.

### Two board files, and why

| Key | Served? | Holds |
|---|---|---|
| `peaks/board-state.json` | only through `/api/peaks-health.json`, shaped field by field | cursor, config version, histogram, time table, the ops figures, and any rescore in flight |
| `peaks/board.json` | yes, verbatim | `plays`, `hist`, `times` (the top band's time buckets), `updated_at` |

The split used to be a secrecy measure, back when the board was a maintained
top-N whose rows carried pids. The board is a histogram now: no top-N, no
alias, no pid anywhere downstream of a filing, and nothing in the state file a
reader could not be shown. What remains is a serve-path argument — board.json
is the exact bytes a reader wants, so it is streamed rather than reshaped on
every request, and reads outnumber folds by orders of magnitude. The state
file is never served verbatim; its one reader is the health shape, which
names every field it publishes.

### The rescore

`peaks/index/<pid>.json` is the source of truth and, in normal operation,
nothing reads it. The rescore does: it re-derives the whole board from those
files, and it is the bootstrap path, the config-change path, the recovery path
and the nightly self-heal all at once. Incremental state drifts — two filings
racing on one pid, a moderation delete, any bug in the fold — and every one of
those turns from "wrong forever" into "wrong until tonight".

It runs when the deployed weight table no longer matches the one the state was
built on, and once nightly regardless (`30 18 * * *`, which is midnight IST).
Above roughly 8,500 filings one invocation cannot finish the scan inside the
subrequest limit, so it saves its progress into the state file and the next
invocation continues; folding is suspended and the journal accumulates until
it finishes.

### The subrequest budget

Workers count every R2 binding call against a limit of **10,000 per
invocation**, and one cron tick is one invocation. The local runtime does not
enforce it, so this ceiling cannot be found by testing on the Mac. The whole
scheduled handler therefore draws from one allowance and every bulk loop asks
before it reads. The board folds first: filings are far rarer than runs, and
letting eighteen stretch aggregations go first would let a busy hour of driving
starve the board. Run backlogs drain on the next cron by design.

### The weight table

`play-score/peaks-config.json` holds the six era weights, their month targets
and the three mode credits. It is written by
`site/scripts/build-inflation-peaks.mjs` alongside the terrain JSON, so the page
and the board weigh a basket identically.

**Rerunning that generator means redeploying this worker.** A worker still
carrying the old copy scores filed baskets on a table the page no longer uses.
Since the terrain was frozen (`SPINE_END` in that generator) this should stop
happening: new CPI months no longer move a weight or a target, so the file
should now rebuild byte-identical. If it ever does change, the worker hashes
the table into a config version, notices the mismatch on the next cron and
rescores every filing without being asked.
