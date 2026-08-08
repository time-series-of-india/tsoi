#!/usr/bin/env python3
"""Load parsed CPI-IW observations into {SCHEMA_NAME}.cpi_iw_index.

Raw in, raw out: (date, base_year, index_value) exactly as published. No
base linking, no year-on-year. See parse_cpi_iw.py for why that work sits
in the generator instead.

Usage:
    SCHEMA_NAME=economy_dev python load_cpi_iw.py
    SCHEMA_NAME=economy_dev python load_cpi_iw.py --json-file cpi_iw_index.json
"""
import argparse
import json
import os
from pathlib import Path

import psycopg2
from psycopg2 import sql
from psycopg2.extras import execute_values

SCHEMA_NAME = os.environ.get("SCHEMA_NAME", "economy_dev")
DEFAULT_JSON = Path(__file__).parent / "cpi_iw_index.json"


def connect():
    """Same env-override contract as the NPCI loaders' etl_util.connect, kept
    local because each ETL directory stands on its own — etl/rbi does the
    same. One small function duplicated beats a cross-directory import that
    makes two pipelines fail together."""
    return psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=int(os.environ.get("DB_PORT", "5432")),
        user=os.environ.get("DB_USER", "admin"),
        password=os.environ["DB_PASSWORD"],
        dbname=os.environ.get("DB_NAME", "npci"),
    )


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--json-file", type=Path, default=DEFAULT_JSON)
    args = ap.parse_args()

    rows = json.loads(args.json_file.read_text())
    if not rows:
        raise SystemExit(f"{args.json_file} is empty — run parse_cpi_iw.py first")

    values = [(r["date"], r["base_year"], r["index_value"]) for r in rows]

    conn = connect()
    try:
        with conn, conn.cursor() as cur:
            # Re-runnable: the source is a full-history page, so every load is
            # a restatement of the same series. Upsert rather than append.
            execute_values(
                cur,
                sql.SQL(
                    """
                    INSERT INTO {}.cpi_iw_index (date, base_year, index_value)
                    VALUES %s
                    ON CONFLICT (date, base_year)
                    DO UPDATE SET index_value = EXCLUDED.index_value
                    """
                ).format(sql.Identifier(SCHEMA_NAME)),
                values,
            )
            cur.execute(
                sql.SQL(
                    "SELECT base_year, min(date), max(date), count(*) "
                    "FROM {}.cpi_iw_index GROUP BY 1 ORDER BY 2"
                ).format(sql.Identifier(SCHEMA_NAME))
            )
            print(f"  loaded {len(values)} rows into {SCHEMA_NAME}.cpi_iw_index")
            for base, lo, hi, n in cur.fetchall():
                print(f"    base {base}=100: {lo} .. {hi} ({n} months)")
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
