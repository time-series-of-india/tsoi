#!/usr/bin/env python3
"""Snapshot the Labour Bureau's all-India CPI-IW general index page.

One page holds the entire monthly series, Aug 1968 onward, as four HTML
tables — one per index base. There is no API and no CSV; the HTML is the
source of record, so we keep a dated snapshot in data/sources/ and parse
from the file rather than from the network. Reruns are cheap and the
snapshot is what makes a build reproducible after the site changes.

The page also carries a second, unrelated series (Agricultural and Rural
Labourers, base 1986-87=100). The parser rejects it; see parse_cpi_iw.py.

Usage:
    python download_cpi_iw.py           # snapshot today's page
    python download_cpi_iw.py --force   # re-fetch even if today's file exists
"""
import argparse
import ssl
import sys
import urllib.request
from datetime import date
from pathlib import Path

URL = "https://www.labourbureau.gov.in/allindiageneralindex-1"

# data/sources/ is gitignored: raw downloads stay local, like the RBI
# spreadsheets and the NPCI fetches.
DEST_DIR = Path(__file__).resolve().parents[2] / "data" / "sources"


def fetch(url: str) -> bytes:
    """GET the page with certificate verification disabled.

    labourbureau.gov.in serves a chain Python will not verify (the equivalent
    of `curl -k`). This is a public, unauthenticated government page carrying
    published statistics, we send no credentials, and the fetched bytes are
    validated downstream by the parser's structural checks and by the
    generator's seam and landmark gates. Nothing here is trusted on the
    strength of the transport.
    """
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(url, headers={"User-Agent": "tsoi-etl/1.0"})
    with urllib.request.urlopen(req, context=ctx, timeout=120) as resp:
        return resp.read()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--force", action="store_true", help="re-fetch if today's snapshot exists")
    args = ap.parse_args()

    DEST_DIR.mkdir(parents=True, exist_ok=True)
    dest = DEST_DIR / f"cpi-iw-general-index-{date.today().isoformat()}.html"

    if dest.exists() and not args.force:
        print(f"  have: {dest} ({dest.stat().st_size} bytes) — pass --force to re-fetch")
        return 0

    print(f"  fetching {URL}")
    body = fetch(URL)
    # A short body means an error page, not the series. Fail loudly rather
    # than overwriting a good snapshot with a redirect notice.
    if len(body) < 50_000:
        print(f"  error: got {len(body)} bytes, expected ~145 KB — refusing to write", file=sys.stderr)
        return 1

    dest.write_bytes(body)
    print(f"  saved: {dest} ({len(body)} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
