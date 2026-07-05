#!/usr/bin/env python3
"""Download UPI P2P and P2M transaction statistics from NPCI."""
import json
import time
from pathlib import Path

from fetcher import fetch_all, iter_months, load_cached

YEARS = [2021, 2022, 2023, 2024, 2025, 2026]

out_dir = Path(__file__).parent / "raw_p2m"
out_dir.mkdir(exist_ok=True)

all_records, skipped = [], []

for year, month in iter_months(YEARS):
    fname = out_dir / f"{year}_{month}.json"
    if fname.exists():
        print(f"  skip: {fname.name}")
        all_records.extend(load_cached(fname))
        continue

    params = {
        "product_name": "UPI",
        "tab_name": "p2p-and-p2m-transactions",
        "year": year,
        "month": month,
    }
    try:
        results = fetch_all(params, page_size=10)
        if not results:
            print(f"  no data: {year} {month}")
            skipped.append((year, month))
            continue
        with open(fname, "w") as f:
            json.dump(results, f)
        all_records.extend(results)
        print(f"  saved: {fname.name} ({len(results)} rows)")
    except Exception as e:
        print(f"  error: {year} {month} — {e}")
        skipped.append((year, month))
    time.sleep(0.3)

combined = Path(__file__).parent / "all_p2m.json"
with open(combined, "w") as f:
    json.dump(all_records, f, indent=2)
print(f"\nDone. {len(all_records)} records -> {combined}")
if skipped:
    print(f"Skipped: {skipped}")
