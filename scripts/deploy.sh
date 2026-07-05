#!/usr/bin/env bash
# Build-and-push deploy to Cloudflare Workers Static Assets.
#
#   ETL (assumed already loaded)
#     → generators (build-*.mjs, need TimescaleDB reachable)
#     → hash-data.mjs (content-hash runtime data files + write the manifest)
#     → astro build (bundles the manifest, copies public/ → dist/)
#     → wrangler deploy (upload dist/ to the edge)
#
# The old rsync-to-VM path (scripts/rebuild.sh) is kept as a documented fallback
# for ~2 weeks post-cutover.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE_DIR="$REPO_ROOT/site"

if [ ! -d "$SITE_DIR" ]; then
    echo "ERROR: site/ does not exist." >&2
    exit 1
fi

# Build-time data steps need DB credentials.
if [ -f "$REPO_ROOT/.env" ]; then
    set -a; source "$REPO_ROOT/.env"; set +a
else
    echo "ERROR: .env not found at repo root — required for build-time data steps." >&2
    exit 1
fi

cd "$SITE_DIR"

echo "==> Generating spec-driven dashboard datasets from TimescaleDB..."
node scripts/build-dashboard-data.mjs

echo "==> Generating short-read datasets..."
node scripts/build-reads-data.mjs

echo "==> Generating flagship read dataset (UPI: Anatomy of a Tap)..."
node scripts/build-read-upi-architecture.mjs

echo "==> Generating per-content OG cards..."
node scripts/build-og-cards.mjs

echo "==> Content-hashing runtime data files + writing manifest..."
node scripts/hash-data.mjs

echo "==> Building Astro site..."
npm run build

echo "==> Deploying dist/ to Cloudflare (Workers Static Assets)..."
npx wrangler deploy

echo "==> Done. Verify: curl -I the site for per-path Cache-Control, and confirm"
echo "    hashed /data/*.json URLs in the network tab (hard refresh a dashboard)."
