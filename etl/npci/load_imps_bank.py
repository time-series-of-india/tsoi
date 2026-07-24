#!/usr/bin/env python3
"""Load IMPS bank performance statistics from raw_imps_bank/ into {SCHEMA_NAME}.imps_bank_performance."""
import csv
import json
import os
import psycopg2
from psycopg2 import sql
from psycopg2.extras import execute_values
from pathlib import Path
from etl_util import connect, drop_exact_duplicates
from normalize import normalize_bank_name

SCHEMA_NAME = os.environ.get("SCHEMA_NAME", "economy_dev")

MONTHS = {"Jan":1,"Feb":2,"Mar":3,"Apr":4,"May":5,"Jun":6,
          "Jul":7,"Aug":8,"Sep":9,"Oct":10,"Nov":11,"Dec":12}


def parse_num(v):
    if v in (None, "-", ""):
        return ""
    v = str(v).replace(",", "").replace("%", "").strip()
    try:
        return str(float(v))
    except ValueError:
        return ""

def _to_float(v):
    return float(v) if v not in (None, "") else None

def _to_int(v):
    return int(float(v)) if v not in (None, "") else None


raw_dir = Path(__file__).parent / "raw_imps_bank"
csv_path = Path(__file__).parent / "imps_bank_stats.csv"

cols = ["date", "bank_name", "rank", "volume_mn",
        "approved_pct", "bd_pct", "td_pct", "deemed_approved_pct"]

rows = []
first_by_key = {}  # deduplicate (date, bank_name) — some months are double-loaded in NPCI's DB.
                   # Identical re-listings are dropped silently; a duplicate key carrying
                   # *different* values is still dropped (first wins) but warned about,
                   # since that can hide a genuine variant split.
for f in sorted(raw_dir.glob("*.json")):
    year, month = f.stem.split("_")
    date = f"{year}-{MONTHS[month]:02d}-01"
    with open(f) as fp:
        month_data = json.load(fp)
    for r in month_data:
        bank = normalize_bank_name(r.get("imps_beneficiary_banks", "").strip())
        row = {
            "date":                date,
            "bank_name":           bank,
            "rank":                r.get("sr_no", ""),
            "volume_mn":           parse_num(r.get("total_volume_mn")),
            "approved_pct":        parse_num(r.get("approved_percent")),
            "bd_pct":              parse_num(r.get("bd_percent")),
            "td_pct":              parse_num(r.get("td_percent")),
            "deemed_approved_pct": parse_num(r.get("deemed_approved_percent")),
        }
        key = (date, bank)
        prev = first_by_key.get(key)
        if prev is not None:
            if row != prev:
                print(f"  WARN: {date} {bank}: duplicate with differing values dropped"
                      f" (vol {row['volume_mn']} vs kept {prev['volume_mn']})")
            continue
        first_by_key[key] = row
        rows.append(row)

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
                        date                date NOT NULL,
                        bank_name           text NOT NULL,
                        rank                integer,
                        volume_mn           numeric,
                        approved_pct        numeric,
                        bd_pct              numeric,
                        td_pct              numeric,
                        deemed_approved_pct numeric,
                        PRIMARY KEY (date, bank_name)
                    )
                """).format(sql.Identifier(SCHEMA_NAME, "imps_bank_performance")))

                table = sql.Identifier(SCHEMA_NAME, "imps_bank_performance")
                query = sql.SQL("""
                    INSERT INTO {} (date, bank_name, rank, volume_mn,
                        approved_pct, bd_pct, td_pct, deemed_approved_pct)
                    VALUES %s
                    ON CONFLICT (date, bank_name) DO UPDATE SET
                        rank                = EXCLUDED.rank,
                        volume_mn           = EXCLUDED.volume_mn,
                        approved_pct        = EXCLUDED.approved_pct,
                        bd_pct              = EXCLUDED.bd_pct,
                        td_pct              = EXCLUDED.td_pct,
                        deemed_approved_pct = EXCLUDED.deemed_approved_pct
                """).format(table)

                values = [
                    (
                        r["date"],
                        r["bank_name"],
                        _to_int(r["rank"]),
                        _to_float(r["volume_mn"]),
                        _to_float(r["approved_pct"]),
                        _to_float(r["bd_pct"]),
                        _to_float(r["td_pct"]),
                        _to_float(r["deemed_approved_pct"]),
                    )
                    for r in rows
                ]
                execute_values(cur, query.as_string(conn), values, page_size=500)
        print(f"Loaded {len(rows)} rows into {SCHEMA_NAME}.imps_bank_performance")
    finally:
        conn.close()


print(f"\n--- Loading into {SCHEMA_NAME}.imps_bank_performance ---")
load_to_db(rows)

print("\n--- Verification ---")
conn = connect()
try:
    with conn.cursor() as cur:
        cur.execute(
            sql.SQL("SELECT min(date), max(date), count(*) AS rows, count(DISTINCT bank_name) AS banks FROM {}").format(
                sql.Identifier(SCHEMA_NAME, "imps_bank_performance")
            )
        )
        row = cur.fetchone()
        print(f"  min_date={row[0]}, max_date={row[1]}, rows={row[2]}, banks={row[3]}")
finally:
    conn.close()
