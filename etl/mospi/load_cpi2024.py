#!/usr/bin/env python3
"""Load raw2024/*.json into economy_dev.mospi_cpi_coicop.

The 2024-base counterpart to load_cpi.py, and deliberately a separate script
writing a separate table: five hierarchy levels instead of two, a different
basket, different weights. The two series must never merge implicitly.

Transforms:

  * year + month NAME become a real date at the first of the month.
  * index and inflation arrive as STRINGS. A null inflation is expected and
    correct for all of 2025 -- that is the back-cast, which has no year-ago
    base on this series. Neither null is zero.
  * the CPI (General) rollup carries no code upstream; it is stored as 'GEN'
    so the natural key has no nullable column.
  * state and sector names are resolved back to codes via codes2024.py, which
    uses the 2024 endpoint's own numbering (1 = All India, not 99).

Upserts are idempotent on (date, base_year, series, state, sector, code).

    SCHEMA_NAME=economy_dev python load_cpi2024.py
    SCHEMA_NAME=economy_dev python load_cpi2024.py --parse   # no DB
"""
import json
import os
import sys
from pathlib import Path

import codes2024

RAW_DIR = Path(__file__).parent / "raw2024"
SCHEMA_NAME = os.environ.get("SCHEMA_NAME", "economy_dev")
TABLE = "mospi_cpi_coicop"

COLS = ["date", "base_year", "series", "state", "sector", "code",
        "division", "group_name", "class_name", "sub_class", "item",
        "index_value", "inflation", "imputation", "state_code", "sector_code"]
KEYLEN = 6   # date, base_year, series, state, sector, code

STATE_CODES = {v.lower(): k for k, v in codes2024.STATES.items()}
SECTOR_CODES = {v.lower(): k for k, v in codes2024.SECTORS.items()}


def _num(v):
    if v is None:
        return None
    try:
        return float(str(v).strip())
    except (TypeError, ValueError):
        return None


def _s(v):
    v = (v or "").strip()
    return v or None


def parse(path):
    rows = json.loads(path.read_text())
    out = []
    for r in rows:
        m = codes2024.MONTH_NUM.get((r.get("month") or "").strip().lower())
        if not m:
            raise SystemExit(f"{path.name}: unrecognised month {r.get('month')!r}")
        state, sector = (r.get("state") or "").strip(), (r.get("sector") or "").strip()
        if not (state and sector):
            continue
        out.append((
            f"{int(r['year']):04d}-{m:02d}-01",
            str(r.get("base_year")), (r.get("series") or "").strip(),
            state, sector,
            # Only the General rollup lacks a code upstream.
            (r.get("code") or "").strip() or "GEN",
            _s(r.get("division")), _s(r.get("group")), _s(r.get("class")),
            _s(r.get("sub_class")), _s(r.get("item")),
            _num(r.get("index")), _num(r.get("inflation")), _s(r.get("imputation")),
            STATE_CODES.get(state.lower()), SECTOR_CODES.get(sector.lower()),
        ))
    return out


def _load(conn, rows):
    from psycopg2 import sql
    from psycopg2.extras import execute_values

    updates = sql.SQL(", ").join(
        sql.SQL("{c} = EXCLUDED.{c}").format(c=sql.Identifier(c))
        for c in COLS[KEYLEN:])
    query = sql.SQL(
        "INSERT INTO {} ({}) VALUES %s ON CONFLICT ({}) DO UPDATE SET {}"
    ).format(
        sql.Identifier(SCHEMA_NAME, TABLE),
        sql.SQL(", ").join(sql.Identifier(c) for c in COLS),
        sql.SQL(", ").join(sql.Identifier(c) for c in COLS[:KEYLEN]),
        updates)
    with conn:
        with conn.cursor() as cur:
            execute_values(cur, query.as_string(conn), rows, page_size=5000)


def main():
    parse_only = "--parse" in sys.argv
    files = sorted(RAW_DIR.glob("cpi2024_*.json"))
    if not files:
        print(f"No files in {RAW_DIR} -- run fetch_cpi2024.py --backfill first")
        return

    rows = []
    for f in files:
        rows.extend(parse(f))
    print(f"parsed {len(rows)} rows from {len(files)} slices")

    # Last write wins, but a collision here means the API paged badly.
    uniq = {r[:KEYLEN]: r for r in rows}
    if len(uniq) != len(rows):
        print(f"WARNING: {len(rows) - len(uniq)} duplicate keys collapsed -- "
              f"check for pagination overlap", file=sys.stderr)
    rows = list(uniq.values())

    # The published hierarchy sizes are a cheap upstream-change alarm.
    for field, i in [("division", 6), ("group", 7), ("class", 8),
                     ("sub_class", 9), ("item", 10)]:
        n = len({r[i] for r in rows if r[i]})
        want = codes2024.EXPECTED[field]
        if n != want:
            print(f"NOTE: {field} has {n} distinct values, expected {want}",
                  file=sys.stderr)

    if parse_only:
        return

    import psycopg2
    conn = psycopg2.connect(
        host="localhost", user="admin",
        password=os.environ["DB_PASSWORD"], dbname="npci", port=5432,
    )
    try:
        _load(conn, rows)
        print(f"loaded {len(rows)} rows into {SCHEMA_NAME}.{TABLE}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
