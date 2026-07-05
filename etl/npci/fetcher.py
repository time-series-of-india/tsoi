"""Shared fetch utilities for NPCI ecosystem statistics API."""
import datetime
import json
import time
import urllib.request
from pathlib import Path

BASE_URL = "https://www.npci.org.in/api/ecosystem-statistics/get-statistics"
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
_HEADERS = {"User-Agent": "Mozilla/5.0"}


def _get(params: dict, timeout: int = 15) -> dict:
    qs = "&".join(f"{k}={v}" for k, v in params.items())
    req = urllib.request.Request(f"{BASE_URL}?{qs}", headers=_HEADERS)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())


def fetch_all(params: dict, page_size: int = 100, inter_page_delay: float = 0.3) -> list:
    """Fetch all paginated results for given params. Returns combined list of records."""
    results = []
    page = 1
    while True:
        data = _get({**params, "page_no": page, "size": page_size,
                     "sort_by": "asc", "locale": "en"})
        batch = data.get("data", {}).get("results", [])
        total = data.get("data", {}).get("totalCount", 0)
        results.extend(batch)
        if not batch or len(results) >= total:
            break
        page += 1
        time.sleep(inter_page_delay)
    return results


def load_cached(fname: Path) -> list:
    """Load results from a cached file. Handles both list[] and full API-response formats."""
    with open(fname) as f:
        data = json.load(f)
    if isinstance(data, list):
        return data
    return data.get("data", {}).get("results", [])


def fetch_table_detail(params: dict) -> list:
    """Fetch a single-page response where results is {tableDetail: [...], ...}.
    Used for endpoints like tab_name=mcc that return a nested structure."""
    data = _get({**params, "page_no": 1, "size": 200, "sort_by": "asc", "locale": "en"})
    results = data.get("data", {}).get("results", {})
    if isinstance(results, list):
        return results
    return results.get("tableDetail", [])


def iter_months(years: list, max_months_current_year: int = None):
    """Yield (year, month) pairs, capping the latest year at the current month.

    Unpublished months come back "no data" from the API, so the cap only avoids
    pointless future-month requests. (Was a hardcoded 4, which silently stopped
    ingestion at April once the calendar moved past it.)
    """
    if max_months_current_year is None:
        max_months_current_year = datetime.date.today().month
    latest = max(years)
    for year in years:
        months = MONTHS if year < latest else MONTHS[:max_months_current_year]
        for month in months:
            yield year, month
