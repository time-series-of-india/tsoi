#!/usr/bin/env python3
"""Rebuild per-month raw_*/ files from the combined all_*.json artifacts.

Recovery path for when the raw dirs are lost (they are gitignored): the
combined files carry every record's year/month, so the raw cache — the files
the load_*.py scripts read, and the fetch scripts' skip-list — can be
reconstructed exactly. Existing raw files are never overwritten.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent


def bank_split(r):  # raw/{year}_{month}_{remitter|beneficiary}.json
    t = "remitter" if "upi_remitter_banks" in r else "beneficiary"
    return HERE / "raw" / f"{r['year']}_{r['month']}_{t}.json"


def simple(dirname):
    return lambda r: HERE / dirname / f"{r['year']}_{r['month']}.json"


SOURCES = [
    ("all_data.json", bank_split),
    ("all_apps.json", simple("raw_apps")),
    ("all_mcc.json", simple("raw_mcc")),
    ("all_p2m.json", simple("raw_p2m")),
    ("all_psp.json", lambda r: HERE / "raw_psp" / f"{r['year']}_{r['month']}_{r['type_name']}.json"),
    ("all_statewise.json", simple("raw_statewise")),
    ("all_top50_vol_val.json", simple("raw_top50_vol_val")),
    ("all_imps_bank.json", simple("raw_imps_bank")),
]

for fname, path_for in SOURCES:
    src = HERE / fname
    if not src.exists():
        print(f"skip {fname}: not present")
        continue
    records = json.load(open(src))
    if not records:
        print(f"skip {fname}: empty")
        continue
    missing = [k for k in ("year", "month") if k not in records[0]]
    if missing:
        print(f"skip {fname}: records lack {missing} — cannot split by month")
        continue
    groups = {}
    for r in records:
        groups.setdefault(path_for(r), []).append(r)
    written = skipped = 0
    for path, recs in sorted(groups.items()):
        path.parent.mkdir(exist_ok=True)
        if path.exists():
            skipped += 1
            continue
        with open(path, "w") as f:
            json.dump(recs, f)
        written += 1
    print(f"{fname}: {written} month files written, {skipped} already present")
