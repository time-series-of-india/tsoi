#!/usr/bin/env bash
# Deploy the ALREADY-BUILT site/dist/ to Cloudflare — the exact bytes you previewed
# with scripts/stage.sh. It does NOT rebuild, so what you approved is what ships.
#
# Flow:
#   ./scripts/stage.sh      # build fresh data + preview locally, eyeball it
#   ./scripts/publish.sh    # then this — deploy that same dist/
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE_DIR="$REPO_ROOT/site"

if [ ! -f "$SITE_DIR/dist/index.html" ]; then
    echo "ERROR: $SITE_DIR/dist is not built. Run ./scripts/stage.sh first." >&2
    exit 1
fi

if [ -f "$REPO_ROOT/.env" ]; then
    set -a; source "$REPO_ROOT/.env"; set +a
else
    echo "ERROR: .env not found — required for CLOUDFLARE_API_TOKEN." >&2
    exit 1
fi

cd "$SITE_DIR"
echo "==> Deploying site/dist/ to Cloudflare (Workers Static Assets)..."
npx wrangler deploy
echo "==> Done. Verify: https://timeseriesofindia.com"
