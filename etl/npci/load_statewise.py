#!/usr/bin/env python3
"""Load UPI state-wise statistics from raw_statewise/ into {SCHEMA_NAME}.upi_statewise_statistics.

For months with only state-level rows (totalCount ~37), all rows are taken directly.
For months with district-level rows (e.g. Mar 2026, totalCount ~817), only the
"STATE Total" subtotal rows are used — the district breakdown is skipped because
district names are not available in the API.
"""
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

# Normalize inconsistent state names across API versions
STATE_ALIASES = {
    "ANDAMAN AND NICOBAR ISLANDS": "ANDAMAN & NICOBAR",
    "Unclassified #": "UNCLASSIFIED",
    "Unclassified#":  "UNCLASSIFIED",
    "UNCLASSIFIED#":  "UNCLASSIFIED",
}

def parse_num(v):
    if v in (None, "-", ""):
        return ""
    try:
        return str(float(str(v).strip().replace(",", "")))
    except ValueError:
        return ""

def _to_float(v):
    return float(v) if v not in (None, "") else None

def _to_int(v):
    return int(float(v)) if v not in (None, "") else None

raw_dir = Path(__file__).parent / "raw_statewise"
csv_path = Path(__file__).parent / "upi_statewise_stats.csv"

cols = ["date", "state", "rank", "volume_mn", "volume_contribution_pct",
        "value_cr", "value_contribution_pct"]

rows = []
for f in sorted(raw_dir.glob("*.json")):
    year, month = f.stem.split("_")
    date = f"{year}-{MONTHS[month]:02d}-01"
    with open(f) as fp:
        data = json.load(fp)

    # Detect district-level month: any row has state ending in " Total"
    has_totals = any(r.get("state_union_territory", "").endswith(" Total") for r in data)

    for r in data:
        name = r.get("state_union_territory", "")
        if has_totals:
            # District-level month: keep only state subtotal rows
            if not name.endswith(" Total"):
                continue
            name = name.removesuffix(" Total").strip()
        name = STATE_ALIASES.get(name.strip(), name.strip())
        rows.append({
            "date":                    date,
            "state":                   name,
            "rank":                    r.get("sr_no", ""),
            "volume_mn":               parse_num(r.get("volume_in_mn")),
            "volume_contribution_pct": parse_num(r.get("volume_contribution")),
            "value_cr":                parse_num(r.get("value_in_cr")),
            "value_contribution_pct":  parse_num(r.get("value_contribution")),
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
                        date                    date NOT NULL,
                        state                   text NOT NULL,
                        rank                    integer,
                        volume_mn               numeric,
                        volume_contribution_pct numeric,
                        value_cr                numeric,
                        value_contribution_pct  numeric,
                        PRIMARY KEY (date, state)
                    )
                """).format(sql.Identifier(SCHEMA_NAME, "upi_statewise_statistics")))

                table = sql.Identifier(SCHEMA_NAME, "upi_statewise_statistics")
                query = sql.SQL("""
                    INSERT INTO {} (date, state, rank, volume_mn,
                        volume_contribution_pct, value_cr, value_contribution_pct)
                    VALUES %s
                    ON CONFLICT (date, state) DO UPDATE SET
                        rank                    = EXCLUDED.rank,
                        volume_mn               = EXCLUDED.volume_mn,
                        volume_contribution_pct = EXCLUDED.volume_contribution_pct,
                        value_cr                = EXCLUDED.value_cr,
                        value_contribution_pct  = EXCLUDED.value_contribution_pct
                """).format(table)

                values = [
                    (
                        r["date"], r["state"],
                        _to_int(r["rank"]),
                        _to_float(r["volume_mn"]),
                        _to_float(r["volume_contribution_pct"]),
                        _to_float(r["value_cr"]),
                        _to_float(r["value_contribution_pct"]),
                    )
                    for r in rows
                ]
                execute_values(cur, query.as_string(conn), values, page_size=500)
        print(f"Loaded {len(rows)} rows into {SCHEMA_NAME}.upi_statewise_statistics")
    finally:
        conn.close()


print(f"\n--- Loading into {SCHEMA_NAME}.upi_statewise_statistics ---")
load_to_db(rows)

print("\n--- Verification ---")
conn = connect()
try:
    with conn.cursor() as cur:
        cur.execute(
            sql.SQL("SELECT min(date), max(date), count(*) AS rows, count(DISTINCT state) AS states FROM {}").format(
                sql.Identifier(SCHEMA_NAME, "upi_statewise_statistics")
            )
        )
        row = cur.fetchone()
        print(f"  min_date={row[0]}, max_date={row[1]}, rows={row[2]}, states={row[3]}")
finally:
    conn.close()
