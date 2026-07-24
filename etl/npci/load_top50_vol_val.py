#!/usr/bin/env python3
"""Load UPI top-50 member vol/val stats from raw_top50_vol_val/ into {SCHEMA_NAME}.upi_top50_vol_val_statistics."""
import csv
import json
import os
import psycopg2
from psycopg2 import sql
from psycopg2.extras import execute_values
from collections import defaultdict
from pathlib import Path
from etl_util import connect, drop_exact_duplicates
from normalize import normalize_bank_name

SCHEMA_NAME = os.environ.get("SCHEMA_NAME", "economy_dev")

MONTHS = {"Jan":1,"Feb":2,"Mar":3,"Apr":4,"May":5,"Jun":6,
          "Jul":7,"Aug":8,"Sep":9,"Oct":10,"Nov":11,"Dec":12}

def parse_num(v):
    if v in (None, "-", ""):
        return ""
    try:
        return str(float(str(v).strip().replace(",", "")))
    except ValueError:
        return ""

def _f(v):
    try:
        return float(v) if v not in (None, "") else None
    except (ValueError, TypeError):
        return None

def _to_float(v):
    return float(v) if v not in (None, "") else None

def _to_int(v):
    return int(float(v)) if v not in (None, "") else None

def aggregate_rows(rows):
    """Merge rows sharing (date, bank_name) after normalization. Volumes summed; rank kept minimum."""
    groups = defaultdict(list)
    for r in rows:
        groups[(r["date"], r["bank_name"])].append(r)
    result = []
    for (date, bank), group in sorted(groups.items()):
        if len(group) == 1:
            result.append(group[0])
            continue
        print(f"  merge: {bank} / {date}: {len(group)} variant rows summed"
              f" (vol={[r['volume_mn'] for r in group]})")
        ranks = [_f(r["rank"]) for r in group if _f(r["rank"]) is not None]
        vols  = [_f(r["volume_mn"]) for r in group if _f(r["volume_mn"]) is not None]
        vals  = [_f(r["value_cr"])  for r in group if _f(r["value_cr"])  is not None]
        result.append({
            "date":      date,
            "bank_name": bank,
            "rank":      int(min(ranks)) if ranks else "",
            "volume_mn": str(sum(vols)) if vols else "",
            "value_cr":  str(sum(vals)) if vals else "",
        })
    return result

raw_dir = Path(__file__).parent / "raw_top50_vol_val"
csv_path = Path(__file__).parent / "upi_top50_vol_val_stats.csv"

cols = ["date", "bank_name", "rank", "volume_mn", "value_cr"]

rows = []
for f in sorted(raw_dir.glob("*.json")):
    year, month = f.stem.split("_")
    date = f"{year}-{MONTHS[month]:02d}-01"
    with open(f) as fp:
        month_data = json.load(fp)
    for r in month_data:
        if r.get("is_total"):       # skip grand-total row
            continue
        rows.append({
            "date":      date,
            "bank_name": normalize_bank_name(r.get("bank_name", "").strip()),
            "rank":      r.get("sr_no", ""),
            "volume_mn": parse_num(r.get("volume_mn")),
            "value_cr":  parse_num(r.get("value_cr")),
        })

rows = aggregate_rows(drop_exact_duplicates(rows))

with open(csv_path, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=cols)
    w.writeheader()
    w.writerows(rows)
print(f"Parsed {len(rows)} rows → {csv_path}")


def load_to_db(rows):
    conn = connect()
    try:
        with conn:
            with conn.cursor() as cur:
                # PK is (date, bank_name) — semantically cleaner than the old (date, rank)
                # since bank_name is unique per date after normalization/aggregation.
                cur.execute(sql.SQL("""
                    CREATE TABLE IF NOT EXISTS {} (
                        date      date NOT NULL,
                        bank_name text NOT NULL,
                        rank      integer,
                        volume_mn numeric,
                        value_cr  numeric,
                        PRIMARY KEY (date, bank_name)
                    )
                """).format(sql.Identifier(SCHEMA_NAME, "upi_top50_vol_val_statistics")))

                table = sql.Identifier(SCHEMA_NAME, "upi_top50_vol_val_statistics")
                query = sql.SQL("""
                    INSERT INTO {} (date, bank_name, rank, volume_mn, value_cr)
                    VALUES %s
                    ON CONFLICT (date, bank_name) DO UPDATE SET
                        rank      = EXCLUDED.rank,
                        volume_mn = EXCLUDED.volume_mn,
                        value_cr  = EXCLUDED.value_cr
                """).format(table)

                values = [
                    (
                        r["date"],
                        r["bank_name"],
                        _to_int(r["rank"]),
                        _to_float(r["volume_mn"]),
                        _to_float(r["value_cr"]),
                    )
                    for r in rows
                ]
                execute_values(cur, query.as_string(conn), values, page_size=500)
        print(f"Loaded {len(rows)} rows into {SCHEMA_NAME}.upi_top50_vol_val_statistics")
    finally:
        conn.close()


print(f"\n--- Loading into {SCHEMA_NAME}.upi_top50_vol_val_statistics ---")
load_to_db(rows)

print("\n--- Verification ---")
conn = connect()
try:
    with conn.cursor() as cur:
        cur.execute(
            sql.SQL("SELECT min(date), max(date), count(*) AS rows, count(DISTINCT bank_name) AS banks FROM {}").format(
                sql.Identifier(SCHEMA_NAME, "upi_top50_vol_val_statistics")
            )
        )
        row = cur.fetchone()
        print(f"  min_date={row[0]}, max_date={row[1]}, rows={row[2]}, banks={row[3]}")
finally:
    conn.close()
