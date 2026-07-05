#!/usr/bin/env python3
"""Load UPI P2P/P2M statistics from raw_p2m/ into {SCHEMA_NAME}.upi_p2p_p2m_statistics."""
import csv
import json
import os
import psycopg2
from psycopg2 import sql
from psycopg2.extras import execute_values
from pathlib import Path

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

raw_dir = Path(__file__).parent / "raw_p2m"
csv_path = Path(__file__).parent / "upi_p2m_stats.csv"

cols = [
    "date",
    "total_volume_mn", "total_value_cr",
    "p2p_volume_mn",   "p2p_value_cr",
    "p2m_volume_mn",   "p2m_value_cr",
]

rows = []
for f in sorted(raw_dir.glob("*.json")):
    year, month = f.stem.split("_")
    date = f"{year}-{MONTHS[month]:02d}-01"
    with open(f) as fp:
        month_data = json.load(fp)
    for r in month_data:
        rows.append({
            "date":             date,
            "total_volume_mn":  parse_num(r.get("total_volume_mn")),
            "total_value_cr":   parse_num(r.get("total_value_cr")),
            "p2p_volume_mn":    parse_num(r.get("p_2_p_volume_mn")),
            "p2p_value_cr":     parse_num(r.get("p_2_p_value_cr")),
            "p2m_volume_mn":    parse_num(r.get("p_2_m_volume_mn")),
            "p2m_value_cr":     parse_num(r.get("p_2_m_value_cr")),
        })

with open(csv_path, "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=cols)
    w.writeheader()
    w.writerows(rows)
print(f"Parsed {len(rows)} rows → {csv_path}")


def load_to_db(rows):
    conn = psycopg2.connect(
        host="localhost", user="admin",
        password=os.environ["DB_PASSWORD"], dbname="npci", port=5432
    )
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(sql.SQL("""
                    CREATE TABLE IF NOT EXISTS {} (
                        date            date    PRIMARY KEY,
                        total_volume_mn numeric,
                        total_value_cr  numeric,
                        p2p_volume_mn   numeric,
                        p2p_value_cr    numeric,
                        p2m_volume_mn   numeric,
                        p2m_value_cr    numeric
                    )
                """).format(sql.Identifier(SCHEMA_NAME, "upi_p2p_p2m_statistics")))

                table = sql.Identifier(SCHEMA_NAME, "upi_p2p_p2m_statistics")
                query = sql.SQL("""
                    INSERT INTO {} (date, total_volume_mn, total_value_cr,
                        p2p_volume_mn, p2p_value_cr, p2m_volume_mn, p2m_value_cr)
                    VALUES %s
                    ON CONFLICT (date) DO UPDATE SET
                        total_volume_mn = EXCLUDED.total_volume_mn,
                        total_value_cr  = EXCLUDED.total_value_cr,
                        p2p_volume_mn   = EXCLUDED.p2p_volume_mn,
                        p2p_value_cr    = EXCLUDED.p2p_value_cr,
                        p2m_volume_mn   = EXCLUDED.p2m_volume_mn,
                        p2m_value_cr    = EXCLUDED.p2m_value_cr
                """).format(table)

                values = [
                    (
                        r["date"],
                        _to_float(r["total_volume_mn"]),
                        _to_float(r["total_value_cr"]),
                        _to_float(r["p2p_volume_mn"]),
                        _to_float(r["p2p_value_cr"]),
                        _to_float(r["p2m_volume_mn"]),
                        _to_float(r["p2m_value_cr"]),
                    )
                    for r in rows
                ]
                execute_values(cur, query.as_string(conn), values, page_size=500)
        print(f"Loaded {len(rows)} rows into {SCHEMA_NAME}.upi_p2p_p2m_statistics")
    finally:
        conn.close()


print(f"\n--- Loading into {SCHEMA_NAME}.upi_p2p_p2m_statistics ---")
load_to_db(rows)

print("\n--- Verification ---")
conn = psycopg2.connect(
    host="localhost", user="admin",
    password=os.environ["DB_PASSWORD"], dbname="npci", port=5432
)
try:
    with conn.cursor() as cur:
        cur.execute(
            sql.SQL("SELECT min(date), max(date), count(*) AS rows FROM {}").format(
                sql.Identifier(SCHEMA_NAME, "upi_p2p_p2m_statistics")
            )
        )
        row = cur.fetchone()
        print(f"  min_date={row[0]}, max_date={row[1]}, rows={row[2]}")
finally:
    conn.close()
