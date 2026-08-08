#!/usr/bin/env python3
"""Fetch the 2024-base CPI series from /api/cpi/getCPIData.

This is a different endpoint from the one fetch_cpi.py uses, and a different
shape of job. getCPIIndex serves the closed 2012 series a whole year at a time;
getCPIData serves the live 2024 series and caps `limit` at 100, so the same
volume costs ~500x more requests.

Slicing: one file per (year, month, state), paged. That keeps page depth to ~19
instead of ~688 for a whole month, which matters because deep pagination on a
backend with no guaranteed ORDER BY is how you silently lose rows. Each slice
carries its own totalRecords, so every file is independently verifiable and a
failure costs one small slice rather than a whole month.

Rate limiting is the same trap as the 2012 endpoints -- an empty body with HTTP
200, never a 429 -- but bites harder here. Measured 2026-07-26: 3 concurrent
workers sustained cleanly, 6 failed every request instantly.

    python fetch_cpi2024.py --backfill        # everything the API offers
    python fetch_cpi2024.py --month 2026 6    # one month, all states
    python fetch_cpi2024.py --latest          # newest month only, for the cron
"""
import argparse
import json
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import codes2024

API = "https://api.mospi.gov.in/api/cpi/getCPIData"
RAW_DIR = Path(__file__).parent / "raw2024"
BASE_YEAR = "2024"
SERIES = "Current"
PAGE_LIMIT = 100          # hard server cap; over it the API errors
WORKERS = 3               # measured ceiling; 6 trips the rate limiter
DELAY = 0.4               # per-worker pause between pages
MAX_PAGES = 400           # guard against a runaway pager


def _get(params, attempt=0):
    """One request. Empty/unparseable body means rate limited, so back off."""
    url = API + "?" + "&".join(f"{k}={v}" for k, v in params.items())
    r = subprocess.run(["curl", "-s", "-m", "90", url],
                       capture_output=True, text=True)
    body = r.stdout.strip()
    if body.startswith("<"):
        raise SystemExit(f"HTML from {url} -- the endpoint moved. Re-read the "
                         f"portal bundle; see docs/mospi-cpi-api.md")
    try:
        d = json.loads(body)
    except ValueError:
        d = None
    if d is None or (isinstance(d, dict) and "error" in d):
        if attempt >= 6:
            raise SystemExit(f"giving up after {attempt} retries: {url}\n"
                             f"body: {body[:200]!r}")
        wait = min(60, 5 * 2 ** attempt)
        print(f"    rate limited, waiting {wait}s", file=sys.stderr)
        time.sleep(wait)
        return _get(params, attempt + 1)
    return d


def fetch_slice(year, month, state_code):
    """All rows for one (year, month, state). Returns None if the API has none."""
    out = RAW_DIR / f"cpi2024_{year}_{month:02d}_{state_code:02d}.json"
    if out.exists():
        return json.loads(out.read_text())

    base = {"base_year": BASE_YEAR, "series": SERIES, "level": "Group",
            "year": year, "month_code": month, "state_code": state_code,
            "limit": PAGE_LIMIT}
    rows, page, total = [], 1, None
    while page <= MAX_PAGES:
        d = _get({**base, "page": page})
        chunk = d.get("data") or []
        if total is None:
            total = (d.get("meta_data") or {}).get("totalRecords", 0)
            if not total:
                return None          # month not published; do not cache
        rows.extend(chunk)
        if len(rows) >= total or not chunk:
            break
        page += 1
        time.sleep(DELAY)

    # The whole point of slicing small: this assertion is meaningful.
    if len(rows) != total:
        raise SystemExit(f"{out.name}: got {len(rows)} rows, API said {total}. "
                         f"Refusing to cache a short slice.")

    RAW_DIR.mkdir(exist_ok=True)
    out.write_text(json.dumps(rows))
    return rows


def run(targets):
    """targets: list of (year, month). Fans out over states."""
    jobs = [(y, m, sc) for (y, m) in targets for sc in sorted(codes2024.STATES)]
    todo = [j for j in jobs
            if not (RAW_DIR / f"cpi2024_{j[0]}_{j[1]:02d}_{j[2]:02d}.json").exists()]
    print(f"{len(jobs)} slices, {len(jobs) - len(todo)} already cached, "
          f"{len(todo)} to fetch")
    done = [0]

    def one(job):
        y, m, sc = job
        rows = fetch_slice(y, m, sc)
        done[0] += 1
        n = len(rows) if rows else 0
        print(f"  [{done[0]}/{len(todo)}] {y}-{m:02d} "
              f"{codes2024.STATES[sc]}: {n} rows" + ("" if rows else "  (no data)"))
        return n

    t0 = time.time()
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        counts = list(ex.map(one, todo))
    print(f"fetched {sum(counts)} rows in {time.time() - t0:.0f}s")


def known_months():
    """(year, month) pairs the API admits to having, newest last."""
    out = []
    for y in (2025, 2026):
        for m in range(1, 13):
            out.append((y, m))
    return out


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--backfill", action="store_true")
    p.add_argument("--latest", action="store_true")
    p.add_argument("--month", nargs=2, type=int, metavar=("YEAR", "MONTH"))
    a = p.parse_args()

    if a.month:
        run([tuple(a.month)])
    elif a.backfill:
        run(known_months())
    elif a.latest:
        # Walk back from today until a month returns data.
        from datetime import date
        d = date.today()
        for _ in range(6):
            if fetch_slice(d.year, d.month, 1):
                run([(d.year, d.month)])
                return
            d = (d.replace(day=1) - __import__("datetime").timedelta(days=1))
        print("no published month found in the last 6")
    else:
        p.error("one of --backfill / --latest / --month is required")


if __name__ == "__main__":
    main()
