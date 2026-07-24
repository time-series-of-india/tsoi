#!/usr/bin/env bash
# Build the site with fresh data and serve dist/ LOCALLY so you can eyeball the
# exact bytes before publishing. Pairs with scripts/publish.sh:
#   ./scripts/stage.sh      # build + preview (this script)
#   ./scripts/publish.sh    # deploy the previewed dist/ to Cloudflare
#
# Generators need TimescaleDB up (cd infra && docker compose up -d). Pass
# --skip-generators to reuse the data already in site/public/data/ (DB down, or
# you only changed layout/prose).
#
# NOTE: this is a plain static preview — Cloudflare's _headers/_redirects do NOT
# apply here, so it's for checking CONTENT/DATA/CHARTS, not edge behaviour.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE_DIR="$REPO_ROOT/site"
PORT="${PORT:-4321}"
SKIP_GEN=0
[ "${1:-}" = "--skip-generators" ] && SKIP_GEN=1

if [ -f "$REPO_ROOT/.env" ]; then set -a; source "$REPO_ROOT/.env"; set +a; fi

cd "$SITE_DIR"

if [ "$SKIP_GEN" -eq 0 ]; then
    echo "==> Generating datasets from TimescaleDB (needs the DB up)..."
    node scripts/build-dashboard-data.mjs
    node scripts/build-reads-data.mjs
    node scripts/build-read-upi-architecture.mjs
    node scripts/build-og-cards.mjs
    node scripts/build-meta.mjs
else
    echo "==> Skipping generators (--skip-generators): reusing site/public/data/."
fi

echo "==> Content-hashing data + writing manifest..."
node scripts/hash-data.mjs

echo "==> Building the site..."
npm run build

# Detect a Tailscale magic-DNS name at runtime, if present — nothing hard-coded,
# so this is safe in a public repo and simply no-ops when Tailscale isn't installed.
TS_HOST=""
if command -v tailscale >/dev/null 2>&1; then
    TS_HOST="$(tailscale status --json 2>/dev/null \
        | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write((JSON.parse(s).Self.DNSName||"").replace(/\.$/,""))}catch(e){}})' 2>/dev/null || true)"
fi

echo
echo "==> Preview server (Ctrl-C to stop). Open on any device on your network:"
[ -n "$TS_HOST" ] && echo "    Tailscale:  http://$TS_HOST:$PORT"
echo "    Local:      http://localhost:$PORT"
echo "    (serve also prints your LAN address below.)"
echo "    Reminder: _headers/_redirects are Cloudflare-only — not reflected here."
echo
exec npx --yes serve "$SITE_DIR/dist" -l "tcp://0.0.0.0:$PORT"
