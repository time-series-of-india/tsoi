#!/usr/bin/env python3
"""Load UPI bank statistics from raw/ into {SCHEMA_NAME}.upi_bank_statistics."""
import csv
import json
import os
import psycopg2
from psycopg2 import sql
from psycopg2.extras import execute_values
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
    """Parse float or return None."""
    try:
        return float(v) if v not in (None, "") else None
    except (ValueError, TypeError):
        return None

def _to_float(v):
    return float(v) if v not in (None, "") else None

def _to_int(v):
    return int(float(v)) if v not in (None, "") else None

def aggregate_rows(rows):
    """Merge rows sharing (bank_name, type_name, date) after normalization.
    Volumes are summed; pct columns are weighted-averaged by volume; rank keeps the minimum."""
    from collections import defaultdict
    groups = defaultdict(list)
    for r in rows:
        groups[(r["bank_name"], r["type_name"], r["date"])].append(r)

    result = []
    for (bank, typ, date), group in sorted(groups.items()):
        if len(group) == 1:
            result.append(group[0])
            continue
        vol = sum(_f(r["volume_mn"]) or 0 for r in group)
        dr  = sum(_f(r["debit_reversal_mn"]) or 0 for r in group)
        def wavg(col):
            pairs = [(_f(r[col]), _f(r["volume_mn"]) or 0) for r in group]
            pairs = [(v, w) for v, w in pairs if v is not None]
            if not pairs:
                return ""
            total_w = sum(w for _, w in pairs)
            return str(sum(v * w for v, w in pairs) / total_w) if total_w else ""
        ranks = [_f(r["rank"]) for r in group if _f(r["rank"]) is not None]
        rank = int(min(ranks)) if ranks else ""
        result.append({
            "bank_name": bank,
            "type_name": typ,
            "date": date,
            "rank": rank,
            "volume_mn": str(vol) if vol else "",
            "approved_pct": wavg("approved_pct"),
            "bd_pct": wavg("bd_pct"),
            "td_pct": wavg("td_pct"),
            "deemed_approved_pct": wavg("deemed_approved_pct"),
            "debit_reversal_mn": str(dr) if dr else "",
            "debit_reversal_success_pct": wavg("debit_reversal_success_pct"),
        })
    return result

raw_dir = Path(__file__).parent / "raw"
csv_path = Path(__file__).parent / "upi_bank_stats.csv"

rows = []
for f in sorted(raw_dir.glob("*.json")):
    parts = f.stem.split("_")  # e.g. 2022_Jan_remitter
    year, month, type_name = parts[0], parts[1], parts[2]
    date = f"{year}-{MONTHS[month]:02d}-01"

    with open(f) as fp:
        data = json.load(fp)
    if isinstance(data, list):
        results = data
    else:
        results = data.get("data", {}).get("results", [])

    for r in results:
        if type_name == "remitter":
            bank = r.get("upi_remitter_banks", "")
            rank = r.get("sr_no", "")
        else:
            bank = r.get("upi_beneficiary_banks", "")
            rank = r.get("srno", "")

        rows.append({
            "bank_name": normalize_bank_name(bank),
            "type_name": type_name,
            "date": date,
            "rank": rank,
            "volume_mn": parse_num(r.get("total_volume_in_mn")),
            "approved_pct": parse_num(r.get("approved_percent")),
            "bd_pct": parse_num(r.get("bd_percent")),
            "td_pct": parse_num(r.get("td_percent")),
            "deemed_approved_pct": parse_num(r.get("deemed_approved_percent")),
            "debit_reversal_mn": parse_num(r.get("total_debit_reversal_count_in_mn")),
            "debit_reversal_success_pct": parse_num(r.get("debit_reversal_success_percent")),
        })

rows = aggregate_rows(rows)

cols = ["bank_name","type_name","date","rank","volume_mn","approved_pct",
        "bd_pct","td_pct","deemed_approved_pct","debit_reversal_mn","debit_reversal_success_pct"]

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
                        bank_name                  text    NOT NULL,
                        type_name                  text    NOT NULL,
                        date                       date    NOT NULL,
                        rank                       integer,
                        volume_mn                  numeric,
                        approved_pct               numeric,
                        bd_pct                     numeric,
                        td_pct                     numeric,
                        deemed_approved_pct        numeric,
                        debit_reversal_mn          numeric,
                        debit_reversal_success_pct numeric,
                        PRIMARY KEY (bank_name, type_name, date)
                    )
                """).format(sql.Identifier(SCHEMA_NAME, "upi_bank_statistics")))

                table = sql.Identifier(SCHEMA_NAME, "upi_bank_statistics")
                query = sql.SQL("""
                    INSERT INTO {} (bank_name, type_name, date, rank, volume_mn,
                        approved_pct, bd_pct, td_pct, deemed_approved_pct,
                        debit_reversal_mn, debit_reversal_success_pct)
                    VALUES %s
                    ON CONFLICT (bank_name, type_name, date) DO UPDATE SET
                        rank                       = EXCLUDED.rank,
                        volume_mn                  = EXCLUDED.volume_mn,
                        approved_pct               = EXCLUDED.approved_pct,
                        bd_pct                     = EXCLUDED.bd_pct,
                        td_pct                     = EXCLUDED.td_pct,
                        deemed_approved_pct        = EXCLUDED.deemed_approved_pct,
                        debit_reversal_mn          = EXCLUDED.debit_reversal_mn,
                        debit_reversal_success_pct = EXCLUDED.debit_reversal_success_pct
                """).format(table)

                values = [
                    (
                        r["bank_name"], r["type_name"], r["date"],
                        _to_int(r["rank"]),
                        _to_float(r["volume_mn"]),
                        _to_float(r["approved_pct"]),
                        _to_float(r["bd_pct"]),
                        _to_float(r["td_pct"]),
                        _to_float(r["deemed_approved_pct"]),
                        _to_float(r["debit_reversal_mn"]),
                        _to_float(r["debit_reversal_success_pct"]),
                    )
                    for r in rows
                ]
                execute_values(cur, query.as_string(conn), values, page_size=500)
        print(f"Loaded {len(rows)} rows into {SCHEMA_NAME}.upi_bank_statistics")
    finally:
        conn.close()


print(f"\n--- Loading into {SCHEMA_NAME}.upi_bank_statistics ---")
load_to_db(rows)

print("\n--- Verification ---")
conn = psycopg2.connect(
    host="localhost", user="admin",
    password=os.environ["DB_PASSWORD"], dbname="npci", port=5432
)
try:
    with conn.cursor() as cur:
        cur.execute(
            sql.SQL("SELECT type_name, count(*) FROM {} GROUP BY type_name ORDER BY type_name").format(
                sql.Identifier(SCHEMA_NAME, "upi_bank_statistics")
            )
        )
        for row in cur.fetchall():
            print(f"  type={row[0]}, rows={row[1]}")
finally:
    conn.close()
