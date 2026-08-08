#!/usr/bin/env python3
"""Load raw/*.json into economy_dev.mospi_cpi_index and mospi_cpi_item_index.

Each raw/<dataset>_<base>_<series>_<year>.json is the data array fetch_cpi.py
pulled for one year of one series. Two shapes land in two tables: the cpi_*
files carry state/sector/group/subgroup, the item_* files carry item names at
all-India only.

Three transforms happen here:

  * year + month NAME become a real date at the first of the month, so these
    join to the other price tables on a shared calendar.
  * index and inflation arrive as STRINGS and may be null. A null index is a
    month the series does not cover; a null inflation is normal for the first
    year of any series, where there is no year-ago base yet. Neither is zero.
  * display names are resolved back to the workbook's codes via codes.py, so a
    later upstream rename breaks a lookup loudly instead of breaking joins
    quietly. Names that legitimately have no code (the "-Overall" rollups) load
    with a null code, not a failure.

Upserts are idempotent on the natural key, so re-running is safe and a refetch
overwrites. base_year and series are part of that key: the 2012 and 2024 series
are not comparable and must never merge.

    SCHEMA_NAME=economy_dev python load_cpi.py          # load all
    SCHEMA_NAME=economy_dev python load_cpi.py --parse  # parse only, no DB
"""
import csv
import json
import os
import sys
from pathlib import Path

import codes

RAW_DIR = Path(__file__).parent / "raw"
CSV_DIR = Path(__file__).parent
SCHEMA_NAME = os.environ.get("SCHEMA_NAME", "economy_dev")

CPI_COLS = ["date", "base_year", "series", "state", "sector", "cpi_group",
            "subgroup", "index_value", "inflation", "status",
            "state_code", "group_code", "subgroup_code"]
ITEM_COLS = ["date", "base_year", "series", "item", "index_value", "inflation",
             "status", "item_code"]


def _num(v):
    """'198.0' → 198.0, or None. Blank and null both mean 'not published'."""
    if v is None:
        return None
    try:
        return float(str(v).strip())
    except (TypeError, ValueError):
        return None


def _date(row, path):
    """year + month name → first of that month."""
    m = codes.MONTHS.get(codes.norm(row.get("month")))
    if not m:
        raise SystemExit(f"{path.name}: unrecognised month {row.get('month')!r}")
    return f"{int(row['year']):04d}-{m:02d}-01"


def parse_cpi(path):
    rows = json.loads(path.read_text())
    out = []
    for r in rows:
        state, group = r.get("state"), r.get("group")
        sub, sector = r.get("subgroup"), r.get("sector")
        if not (state and group and sub and sector):
            continue
        out.append((
            _date(r, path), str(r.get("baseyear")), path.stem.split("_")[2],
            state.strip(), sector.strip(), group.strip(), sub.strip(),
            _num(r.get("index")), _num(r.get("inflation")), r.get("status"),
            codes.STATE_CODES.get(codes.norm(state)),
            codes.GROUP_CODES.get(codes.norm(group)),
            # None for the eight "<Group>-Overall" rollups, which are group
            # totals reported in the subgroup column and have no subgroup code.
            codes.SUBGROUP_CODES.get(codes.norm(sub)),
        ))
    print(f"  {path.name}: {len(out)} rows")
    return out


def parse_item(path):
    rows = json.loads(path.read_text())
    out = []
    for r in rows:
        item = r.get("item")
        if not item:
            continue
        out.append((
            _date(r, path), str(r.get("baseyear")), path.stem.split("_")[2],
            item.strip(), _num(r.get("index")), _num(r.get("inflation")),
            r.get("status"), codes.ITEM_CODES.get(codes.norm(item)),
        ))
    print(f"  {path.name}: {len(out)} rows")
    return out


def _dedupe(rows, keylen):
    """Last write wins on the natural key. Back and Current overlap in 2013,
    but they differ in the series column, which is inside the key."""
    return list({r[:keylen]: r for r in rows}.values())


def _write_csv(name, cols, rows):
    path = CSV_DIR / name
    with open(path, "w", newline="") as fp:
        w = csv.writer(fp)
        w.writerow(cols)
        w.writerows(rows)
    print(f"Parsed {len(rows)} unique rows → {path}")


def _load(conn, table_name, cols, rows, keylen):
    from psycopg2 import sql
    from psycopg2.extras import execute_values

    table = sql.Identifier(SCHEMA_NAME, table_name)
    updates = sql.SQL(", ").join(
        sql.SQL("{c} = EXCLUDED.{c}").format(c=sql.Identifier(c))
        for c in cols[keylen:])
    query = sql.SQL("INSERT INTO {} ({}) VALUES %s ON CONFLICT ({}) DO UPDATE SET {}").format(
        table,
        sql.SQL(", ").join(sql.Identifier(c) for c in cols),
        sql.SQL(", ").join(sql.Identifier(c) for c in cols[:keylen]),
        updates)
    with conn:
        with conn.cursor() as cur:
            execute_values(cur, query.as_string(conn), rows, page_size=5000)
    print(f"Loaded {len(rows)} rows into {SCHEMA_NAME}.{table_name}")


def main():
    parse_only = "--parse" in sys.argv
    cpi_files = sorted(RAW_DIR.glob("cpi_*.json"))
    item_files = sorted(RAW_DIR.glob("item_*.json"))
    if not cpi_files and not item_files:
        print(f"No files in {RAW_DIR} — run fetch_cpi.py --backfill first")
        return

    # The PK is the first 7 CPI columns and the first 4 item columns.
    cpi_rows = _dedupe([r for f in cpi_files for r in parse_cpi(f)], 7)
    item_rows = _dedupe([r for f in item_files for r in parse_item(f)], 4)

    _write_csv("mospi_cpi_index.csv", CPI_COLS, cpi_rows)
    _write_csv("mospi_cpi_item_index.csv", ITEM_COLS, item_rows)

    unresolved = {r[6] for r in cpi_rows if r[12] is None}
    rollups = {u for u in unresolved if u.endswith("-Overall")}
    if unresolved - rollups:
        print(f"WARNING: {len(unresolved - rollups)} subgroup name(s) have no "
              f"code — upstream may have renamed something: "
              f"{sorted(unresolved - rollups)[:5]}", file=sys.stderr)

    if parse_only:
        return

    import psycopg2
    conn = psycopg2.connect(
        host="localhost", user="admin",
        password=os.environ["DB_PASSWORD"], dbname="npci", port=5432,
    )
    # DDL: infra/db/init-economy-dev-mospi-cpi.sql — apply it first.
    try:
        if cpi_rows:
            _load(conn, "mospi_cpi_index", CPI_COLS, cpi_rows, 7)
        if item_rows:
            _load(conn, "mospi_cpi_item_index", ITEM_COLS, item_rows, 4)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
