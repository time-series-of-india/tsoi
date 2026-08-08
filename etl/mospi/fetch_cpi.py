#!/usr/bin/env python3
"""Fetch CPI index and inflation from the MoSPI API platform.

GET api.mospi.gov.in/api/cpi/getCPIIndex (group/subgroup, by state and sector)
and /api/cpi/getItemIndex (item level, all-India). No authentication: these are
open endpoints serving open government data. See docs/mospi-cpi-api.md for the
full contract; the parts that matter here:

  * The published CPI API User Manual is out of date and will not work. Paths
    gained a /cpi/ segment, params lost their capitals, Series split into
    base_year + series, and the token flow it describes no longer exists.
  * A whole YEAR fits in one response — 25,884 rows for 2025 in about three
    seconds with limit=40000. So this walks years, not months, and the entire
    backfill is roughly 25 requests.
  * Rate limiting returns AN EMPTY BODY WITH HTTP 200, not a 429. A loader that
    trusts the status code writes nothing and calls it success. _get() treats an
    unparseable body as retryable, and only a well-formed
    {"data":[],"msg":"No Data Found"} counts as a real empty result.

Base 2012 is a closed dataset: Jan 2013 - Dec 2025, every row final, never to be
revised. Base 2024 (the series that took over in Jan 2026) is a valid parameter
that currently returns nothing — MoSPI publishes it by press release but does
not yet serve it. The 2024 plan entries below are therefore a cheap monthly
poll: the day MoSPI turns it on, this starts collecting it with no code change.

    python fetch_cpi.py --backfill          # everything the plan covers
    python fetch_cpi.py --poll              # only the not-yet-published years
    python fetch_cpi.py --year 2025         # one year, all datasets
    python fetch_cpi.py --backfill --force  # ignore the raw/ cache

Output: raw/<dataset>_<base>_<series>_<year>.json, one file per request, holding
the response's data array. Load with load_cpi.py.
"""
import argparse
import json
import subprocess
import sys
import time
from datetime import date
from pathlib import Path

API = "https://api.mospi.gov.in/api/cpi"
RAW_DIR = Path(__file__).parent / "raw"

# limit is a page size, and one year always fits inside this in a single page.
# If a future series ever exceeds it the pagination guard in _fetch() catches it
# rather than silently truncating.
PAGE_LIMIT = 40000

THIS_YEAR = date.today().year

# (dataset, endpoint, base_year, series, first_year, last_year)
#
# 2012/Back covers 2011-2013 and is the only pre-2013 history the API has; it
# back-casts the 2012 base onto the older collection. Its 2013 rows overlap
# 2012/Current, which is why series is part of the primary key downstream.
PLAN = [
    ("cpi",  "getCPIIndex",  "2012", "Current", 2013, 2025),
    ("cpi",  "getCPIIndex",  "2012", "Back",    2011, 2013),
    ("item", "getItemIndex", "2012", "Current", 2014, 2025),
    # Not yet published — polled, not backfilled. Harmless while empty.
    ("cpi",  "getCPIIndex",  "2024", "Current", 2025, THIS_YEAR),
    ("item", "getItemIndex", "2024", "Current", 2025, THIS_YEAR),
]

# Years that are expected to return nothing today. Kept separate so --backfill
# can report "13 fetched, 4 not yet published" instead of looking half-broken.
POLL_ONLY = {"2024"}


def _get(endpoint, params, tries=5, delay=6.0):
    """One API call, with backoff. Returns the decoded envelope.

    Uses curl rather than urllib for the same reason the NPCI fetchers do:
    Python's HTTP stacks are unreliable against these hosts from the Pi.

    An empty or unparseable body is the rate limiter talking, so it retries.
    """
    qs = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"{API}/{endpoint}?{qs}"
    last = None
    for attempt in range(tries):
        try:
            out = subprocess.run(
                ["curl", "-sS", "--max-time", "180", url],
                capture_output=True, text=True, timeout=240)
            if out.returncode != 0:
                raise RuntimeError(f"curl exit {out.returncode}: {out.stderr[:200]}")
            body = out.stdout.strip()
            if not body:
                raise RuntimeError("empty body (rate limited)")
            if body.startswith("<"):
                # The pre-/cpi/ paths fall through to the portal's SPA and return
                # HTML with a 200. If this fires, the endpoint moved again.
                raise RuntimeError("HTML response — endpoint path may have changed")
            d = json.loads(body)
            if "data" not in d:
                raise RuntimeError(d.get("msg") or body[:200])
            return d
        except Exception as e:  # noqa: BLE001 - retry any transient failure
            last = e
            time.sleep(delay * (2 ** attempt))
    raise SystemExit(f"{endpoint} {params} failed after {tries} tries: {last}")


def _fetch(dataset, endpoint, base, series, year, delay):
    """One year of one series. Returns the data rows, possibly empty."""
    d = _get(endpoint, {
        "base_year": base, "series": series, "year": year,
        "Format": "JSON", "limit": PAGE_LIMIT,
    }, delay=delay)
    rows = d.get("data") or []
    meta = d.get("meta_data") or {}
    total = meta.get("totalRecords", len(rows))
    # One year has always fit in one page. Fail loudly rather than truncate if
    # that ever stops being true.
    if total > len(rows):
        raise SystemExit(
            f"{dataset} {base}/{series} {year}: {total} records but only "
            f"{len(rows)} returned. A year no longer fits in one page — "
            f"raise PAGE_LIMIT or add paging. Refusing to archive a partial year.")
    return rows


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--backfill", action="store_true",
                   help="every year in the plan")
    g.add_argument("--poll", action="store_true",
                   help="only the base years that are not yet published")
    g.add_argument("--year", type=int, help="a single year, all datasets")
    ap.add_argument("--force", action="store_true", help="refetch cached years")
    ap.add_argument("--delay", type=float, default=6.0,
                    help="seconds between calls (default 6; the API rate-limits "
                         "by returning empty 200s)")
    args = ap.parse_args()

    jobs = []
    for dataset, endpoint, base, series, first, last in PLAN:
        if args.poll and base not in POLL_ONLY:
            continue
        years = [args.year] if args.year else range(first, last + 1)
        for y in years:
            if args.year and not (first <= y <= last):
                continue
            jobs.append((dataset, endpoint, base, series, y))

    if not jobs:
        sys.exit("Nothing to do for that selection.")

    RAW_DIR.mkdir(exist_ok=True)

    def path_for(dataset, base, series, year):
        return RAW_DIR / f"{dataset}_{base}_{series}_{year}.json"

    todo = [j for j in jobs
            if args.force or not path_for(j[0], j[2], j[3], j[4]).exists()]
    print(f"{len(jobs)} year-series; {len(jobs) - len(todo)} already cached, "
          f"{len(todo)} to fetch")

    ok = failed = empty = 0
    for i, (dataset, endpoint, base, series, year) in enumerate(todo, 1):
        label = f"{dataset} {base}/{series} {year}"
        try:
            rows = _fetch(dataset, endpoint, base, series, year, args.delay)
        except SystemExit as e:
            # One bad year should not abandon the rest of the backfill.
            print(f"  [{i}/{len(todo)}] {label} FAILED: {e}", file=sys.stderr)
            failed += 1
            continue
        if not rows:
            # Genuinely unpublished. Deliberately NOT cached, so the next run
            # asks again — this is what makes --poll work for base 2024.
            note = "not yet published" if base in POLL_ONLY else "no data"
            print(f"  [{i}/{len(todo)}] {label}: {note}")
            empty += 1
            continue
        path_for(dataset, base, series, year).write_text(json.dumps(rows))
        print(f"  [{i}/{len(todo)}] {label}: {len(rows)} rows")
        ok += 1
        time.sleep(args.delay)

    print(f"\nFetched {ok} year-series → {RAW_DIR}"
          + (f"; {empty} empty" if empty else "")
          + (f"; {failed} failed" if failed else ""))
    if failed:
        sys.exit(f"{failed} year-series failed; rerun to retry just those")


if __name__ == "__main__":
    main()
