#!/usr/bin/env python3
"""Rebuild the combined all_*.json files from the per-month raw_*/ caches.

The download_*.py scripts historically rebuilt these, but their urllib
transport is Akamai-blocked; fetching now happens in fetch_browser.mjs, which
writes only the per-month files. This script derives the combined artifacts
(what the site read-generators consume) from the raw cache, concatenated in
(year, month) order. Refuses to shrink an existing combined file, same policy
as fetcher.write_combined.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

SOURCES = [
    ("raw", "all_data.json"),
    ("raw_apps", "all_apps.json"),
    ("raw_mcc", "all_mcc.json"),
    ("raw_p2m", "all_p2m.json"),
    ("raw_psp", "all_psp.json"),
    ("raw_statewise", "all_statewise.json"),
    ("raw_top50_vol_val", "all_top50_vol_val.json"),
    ("raw_imps_bank", "all_imps_bank.json"),
]


def month_sort_key(path):
    parts = path.stem.split("_")
    return (int(parts[0]), MONTHS.index(parts[1]), parts[2] if len(parts) > 2 else "")


for raw_dir, combined_name in SOURCES:
    d = HERE / raw_dir
    if not d.exists() or not any(d.glob("*.json")):
        print(f"skip {combined_name}: no {raw_dir}/ files")
        continue
    records = []
    for f in sorted(d.glob("*.json"), key=month_sort_key):
        with open(f) as fp:
            data = json.load(fp)
        records.extend(data if isinstance(data, list) else data.get("data", {}).get("results", []))
    out = HERE / combined_name
    existing = 0
    if out.exists():
        try:
            existing = len(json.load(open(out)))
        except Exception:
            existing = 0
    if len(records) < existing:
        print(f"KEPT {combined_name}: rebuild would shrink {existing} -> {len(records)} records")
        continue
    with open(out, "w") as f:
        json.dump(records, f)
    print(f"wrote {combined_name} ({len(records)} records, was {existing})")
