#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE_DIR="$REPO_ROOT/site"

if [ ! -d "$SITE_DIR" ]; then
    echo "ERROR: site/ does not exist. Run Story 2.1 to initialize the Astro project first."
    echo "Rebuild aborted — nothing deployed."
    exit 1
fi

# Load DB credentials for the build-time data steps.
if [ -f "$REPO_ROOT/.env" ]; then
    set -a; source "$REPO_ROOT/.env"; set +a
else
    echo "ERROR: .env not found at repo root — required for build-time data steps."
    exit 1
fi

cd "$SITE_DIR"

echo "==> Generating spec-driven dashboard datasets from TimescaleDB..."
node scripts/build-dashboard-data.mjs

# NOTE: parity caveat — reads etl/npci/*.json (raw NPCI), not TimescaleDB. Fine
# locally; for prod parity ensure those JSONs are present or port to DB. (TODO.md)
echo "==> Generating short-read datasets..."
node scripts/build-reads-data.mjs

echo "==> Generating flagship read dataset (UPI: Anatomy of a Tap)..."
node scripts/build-read-upi-architecture.mjs

echo "==> Generating meta page dataset (site's own traffic)..."
node scripts/build-meta.mjs

# Per-content social cards (public/og/* — gitignored, so regenerated every deploy).
# Editorial OG cards driven off the reads + dashboards registries. Needs `chromium`
# on PATH (no DB). The committed og-default.png fallback is rebuilt separately via
# scripts/build-og-default.mjs when the tagline/wordmark changes.
echo "==> Generating per-content OG cards..."
node scripts/build-og-cards.mjs

# Reads-landing thumbnails (public/thumbs/reads/*) are COMMITTED, not rebuilt
# here — regenerate manually with scripts/build-read-thumbs.mjs when a chart's
# look or data changes materially, and commit the diff.

echo "==> Building Astro site..."
npm run build

echo "==> Deploying to /srv/www/tsoi/..."
rsync -a dist/ /srv/www/tsoi/

echo "==> Done. Site deployed to /srv/www/tsoi/"
