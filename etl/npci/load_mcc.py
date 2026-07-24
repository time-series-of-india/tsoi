#!/usr/bin/env python3
"""Load UPI MCC statistics from raw_mcc/ into {SCHEMA_NAME}.upi_mcc_statistics."""
import csv
import json
import os
import psycopg2
from psycopg2 import sql
from psycopg2.extras import execute_values
from pathlib import Path
from etl_util import connect, drop_exact_duplicates

SCHEMA_NAME = os.environ.get("SCHEMA_NAME", "economy_dev")

MONTHS = {"Jan":1,"Feb":2,"Mar":3,"Apr":4,"May":5,"Jun":6,
          "Jul":7,"Aug":8,"Sep":9,"Oct":10,"Nov":11,"Dec":12}

def parse_num(v):
    if v in (None, "-", ""):
        return ""
    try:
        return str(float(str(v).replace(",", "")))
    except ValueError:
        return ""

def _to_float(v):
    return float(v) if v not in (None, "") else None

raw_dir = Path(__file__).parent / "raw_mcc"
csv_path = Path(__file__).parent / "upi_mcc_stats.csv"

cols = ["date", "mcc", "category_type", "description", "volume_mn", "value_cr"]

rows = []
for f in sorted(raw_dir.glob("*.json")):
    year, month = f.stem.split("_")
    date = f"{year}-{MONTHS[month]:02d}-01"
    with open(f) as fp:
        month_data = json.load(fp)
    for r in month_data:
        mcc = r.get("mcc")
        if mcc is None or str(mcc).strip() == "0":  # skip Total and placeholder rows
            continue
        rows.append({
            "date":          date,
            "mcc":           str(mcc).strip(),
            "category_type": r.get("type", ""),
            "description":   (r.get("description") or "").strip(),  # NPCI pads some months
            "volume_mn":     parse_num(r.get("volume_in_mn")),
            "value_cr":      parse_num(r.get("value_in_cr")),
        })

rows = drop_exact_duplicates(rows)

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
                cur.execute(sql.SQL("""
                    CREATE TABLE IF NOT EXISTS {} (
                        date          date  NOT NULL,
                        mcc           text  NOT NULL,
                        category_type text,
                        description   text,
                        volume_mn     numeric,
                        value_cr      numeric,
                        PRIMARY KEY (date, mcc)
                    )
                """).format(sql.Identifier(SCHEMA_NAME, "upi_mcc_statistics")))

                table = sql.Identifier(SCHEMA_NAME, "upi_mcc_statistics")
                query = sql.SQL("""
                    INSERT INTO {} (date, mcc, category_type, description, volume_mn, value_cr)
                    VALUES %s
                    ON CONFLICT (date, mcc) DO UPDATE SET
                        category_type = EXCLUDED.category_type,
                        description   = EXCLUDED.description,
                        volume_mn     = EXCLUDED.volume_mn,
                        value_cr      = EXCLUDED.value_cr
                """).format(table)

                values = [
                    (
                        r["date"],
                        r["mcc"],
                        r["category_type"] or None,
                        r["description"] or None,
                        _to_float(r["volume_mn"]),
                        _to_float(r["value_cr"]),
                    )
                    for r in rows
                ]
                execute_values(cur, query.as_string(conn), values, page_size=500)
        print(f"Loaded {len(rows)} rows into {SCHEMA_NAME}.upi_mcc_statistics")
    finally:
        conn.close()


print(f"\n--- Loading into {SCHEMA_NAME}.upi_mcc_statistics ---")
load_to_db(rows)

print("\n--- Verification ---")
conn = connect()
try:
    with conn.cursor() as cur:
        cur.execute(
            sql.SQL("SELECT min(date), max(date), count(*) AS rows, count(DISTINCT mcc) AS unique_mccs FROM {}").format(
                sql.Identifier(SCHEMA_NAME, "upi_mcc_statistics")
            )
        )
        row = cur.fetchone()
        print(f"  min_date={row[0]}, max_date={row[1]}, rows={row[2]}, unique_mccs={row[3]}")
finally:
    conn.close()
