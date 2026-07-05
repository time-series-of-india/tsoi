#!/usr/bin/env python3
"""Load UPI payer/payee PSP statistics from raw_psp/ into {SCHEMA_NAME}.upi_psp_statistics."""
import csv
import json
import os
import psycopg2
from psycopg2 import sql
from psycopg2.extras import execute_values
from collections import defaultdict
from pathlib import Path
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
    """Merge rows sharing (psp_name, type_name, date) after normalization.
    Volume summed; pct columns weighted-averaged by volume; rank kept minimum."""
    groups = defaultdict(list)
    for r in rows:
        groups[(r["psp_name"], r["type_name"], r["date"])].append(r)
    result = []
    for (psp, typ, date), group in sorted(groups.items()):
        if len(group) == 1:
            result.append(group[0])
            continue
        ranks = [_f(r["rank"]) for r in group if _f(r["rank"]) is not None]
        vols  = [_f(r["volume_mn"]) or 0 for r in group]
        total_vol = sum(vols)
        def wavg(col):
            pairs = [(_f(r[col]), _f(r["volume_mn"]) or 0) for r in group]
            pairs = [(v, w) for v, w in pairs if v is not None]
            if not pairs:
                return ""
            tw = sum(w for _, w in pairs)
            return str(sum(v * w for v, w in pairs) / tw) if tw else ""
        result.append({
            "psp_name":     psp,
            "type_name":    typ,
            "date":         date,
            "rank":         int(min(ranks)) if ranks else "",
            "volume_mn":    str(total_vol) if total_vol else "",
            "approved_pct": wavg("approved_pct"),
            "bd_pct":       wavg("bd_pct"),
            "td_pct":       wavg("td_pct"),
        })
    return result

raw_dir = Path(__file__).parent / "raw_psp"
csv_path = Path(__file__).parent / "upi_psp_stats.csv"

cols = ["psp_name", "type_name", "date", "rank",
        "volume_mn", "approved_pct", "bd_pct", "td_pct"]

rows = []
for f in sorted(raw_dir.glob("*.json")):
    parts = f.stem.split("_")  # {year}_{month}_{payer|payee}
    year, month, type_name = parts[0], parts[1], parts[2]
    date = f"{year}-{MONTHS[month]:02d}-01"

    with open(f) as fp:
        month_data = json.load(fp)
    for r in month_data:
        psp_name = r.get("payer_psp") or r.get("payee_psp", "")
        rows.append({
            "psp_name":     normalize_bank_name(psp_name.strip()),
            "type_name":    type_name,
            "date":         date,
            "rank":         r.get("sr_no", ""),
            "volume_mn":    parse_num(r.get("total_volume_in_mn")),
            "approved_pct": parse_num(r.get("approved_percent")),
            "bd_pct":       parse_num(r.get("bd_percent")),
            "td_pct":       parse_num(r.get("td_percent")),
        })

rows = aggregate_rows(rows)

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
                        psp_name      text    NOT NULL,
                        type_name     text    NOT NULL,
                        date          date    NOT NULL,
                        rank          integer,
                        volume_mn     numeric,
                        approved_pct  numeric,
                        bd_pct        numeric,
                        td_pct        numeric,
                        PRIMARY KEY (psp_name, type_name, date)
                    )
                """).format(sql.Identifier(SCHEMA_NAME, "upi_psp_statistics")))

                table = sql.Identifier(SCHEMA_NAME, "upi_psp_statistics")
                query = sql.SQL("""
                    INSERT INTO {} (psp_name, type_name, date, rank,
                        volume_mn, approved_pct, bd_pct, td_pct)
                    VALUES %s
                    ON CONFLICT (psp_name, type_name, date) DO UPDATE SET
                        rank         = EXCLUDED.rank,
                        volume_mn    = EXCLUDED.volume_mn,
                        approved_pct = EXCLUDED.approved_pct,
                        bd_pct       = EXCLUDED.bd_pct,
                        td_pct       = EXCLUDED.td_pct
                """).format(table)

                values = [
                    (
                        r["psp_name"], r["type_name"], r["date"],
                        _to_int(r["rank"]),
                        _to_float(r["volume_mn"]),
                        _to_float(r["approved_pct"]),
                        _to_float(r["bd_pct"]),
                        _to_float(r["td_pct"]),
                    )
                    for r in rows
                ]
                execute_values(cur, query.as_string(conn), values, page_size=500)
        print(f"Loaded {len(rows)} rows into {SCHEMA_NAME}.upi_psp_statistics")
    finally:
        conn.close()


print(f"\n--- Loading into {SCHEMA_NAME}.upi_psp_statistics ---")
load_to_db(rows)

print("\n--- Verification ---")
conn = psycopg2.connect(
    host="localhost", user="admin",
    password=os.environ["DB_PASSWORD"], dbname="npci", port=5432
)
try:
    with conn.cursor() as cur:
        cur.execute(
            sql.SQL("SELECT type_name, min(date), max(date), count(*) AS rows, count(DISTINCT psp_name) AS psps FROM {} GROUP BY type_name ORDER BY type_name").format(
                sql.Identifier(SCHEMA_NAME, "upi_psp_statistics")
            )
        )
        for row in cur.fetchall():
            print(f"  type={row[0]}, min={row[1]}, max={row[2]}, rows={row[3]}, psps={row[4]}")
finally:
    conn.close()
