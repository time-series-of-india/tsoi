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

play-score needs no runtime token — R2 access is via bucket binding.

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
```

## Prod routes — NOT attached yet (needs the double-approval deploy rule)

When approved, add to each wrangler.toml and redeploy:

```toml
# meta-live:   routes = [{ pattern = "timeseriesofindia.com/data/live/*",  zone_name = "timeseriesofindia.com" }]
# play-score:  routes = [{ pattern = "timeseriesofindia.com/api/play-*",   zone_name = "timeseriesofindia.com" }]
```

Until then both are reachable on workers.dev only; the /meta preview points
at workers.dev via `PUBLIC_META_LIVE_URL` (see site/.env usage in meta.astro).

## Post-deploy hardening (dashboard, once)

- WAF rate-limit rule: `/api/play-score` POST, ~10 req/10 s per IP.
- R2 lifecycle rule on `tsoi-play`: delete `raw/` objects older than 30 days
  (backstop for the aggregator's post-commit deletes).
- Token hygiene (meta plan P0 §3): after launch week, rotate the old
  all-purpose deploy token that lived in three checkouts.

## Puzzle releases

Bump `MAX_PUZZLE` in play-score/wrangler.toml with each puzzle release and
redeploy — the ingest whitelist rejects unknown puzzle numbers.
