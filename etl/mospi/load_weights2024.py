#!/usr/bin/env python3
"""Load the CPI 2024 weighing diagram into economy_dev.mospi_cpi_item_weights.

Source: Annexure 5.3 of MoSPI's base-revision report, sheet 5.3d -- every
(state, sector, item) share of household spending, carrying its full COICOP
lineage (item -> sub-class -> class -> group -> division). 23,208 rows, 358
items, and the only published table from which the middle of the CPI tree can
be reconstructed: MoSPI publishes weights at division, group and item level,
never at class or sub-class, but those are just sums of their members.

    https://www.mospi.gov.in/uploads/documents/documents/1769670019171-Annex_5.3.xlsx

The workbook's own aggregate sheets are the check. 5.3a (divisions) and 5.3b
(groups) are published independently, so summing 5.3d up to those two levels
and comparing is a real verification, not a tautology -- it agrees to 1e-13
weight points. The loader refuses to write if that ever stops holding.

Two share columns come across, and they answer different questions:
  share_all_india  -- share of the national 100, rural and urban summing to
                      55.42 / 44.58. Summing both sectors gives the Combined
                      weight the press releases quote.
  share_in_state   -- share of that state's own 100, for state-level indices.

Sheet 5.3d encodes sector as 1/2; stored as the same 'Rural'/'Urban' strings
mospi_cpi_coicop uses, so the two tables join without a lookup.

    SCHEMA_NAME=economy_dev python load_weights2024.py --xlsx Annex_5.3.xlsx
    SCHEMA_NAME=economy_dev python load_weights2024.py --xlsx … --check
"""
import argparse
import os
import sys
import zipfile
from collections import defaultdict
from xml.etree import ElementTree as ET

NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
SCHEMA_NAME = os.environ.get("SCHEMA_NAME", "economy_dev")
TABLE = "mospi_cpi_item_weights"
SECTORS = {"1": "Rural", "2": "Urban"}
# the hierarchy the 2024 series publishes; a change here is an upstream change
EXPECTED = {"item": 358, "sub_class": 162, "class": 92, "group": 43, "division": 12}
TOLERANCE = 1e-9   # weight points; the observed disagreement is ~1e-13

COLS = ["state_code", "state", "sector", "item_code", "item",
        "sub_class_code", "sub_class", "class_code", "class_name",
        "group_code", "group_name", "division_code", "division",
        "share_all_india", "share_in_state"]
KEYLEN = 4   # state_code, state, sector, item_code -> natural key is 1st/3rd/4th

DDL = f"""
CREATE TABLE IF NOT EXISTS {{schema}}.{TABLE} (
  state_code      text NOT NULL,
  state           text NOT NULL,
  sector          text NOT NULL,
  item_code       text NOT NULL,
  item            text,
  sub_class_code  text,
  sub_class       text,
  class_code      text,
  class_name      text,
  group_code      text,
  group_name      text,
  division_code   text,
  division        text,
  share_all_india numeric,
  share_in_state  numeric,
  PRIMARY KEY (state_code, sector, item_code)
);
CREATE INDEX IF NOT EXISTS {TABLE}_code_idx
  ON {{schema}}.{TABLE} (item_code, state_code, sector);
"""


def _sheets(path):
    """Read every sheet of the workbook as lists of cell strings."""
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        root = ET.fromstring(z.read("xl/sharedStrings.xml"))
        for si in root.findall(f"{NS}si"):
            shared.append("".join(t.text or "" for t in si.iter(f"{NS}t")))

    def colnum(ref):
        letters = "".join(ch for ch in ref if ch.isalpha())
        n = 0
        for ch in letters:
            n = n * 26 + ord(ch) - 64
        return n - 1

    names = ET.fromstring(z.read("xl/workbook.xml"))
    order = [s.get("name") for s in names.iter(f"{NS}sheet")]
    out = {}
    for i, name in enumerate(order, start=1):
        root = ET.fromstring(z.read(f"xl/worksheets/sheet{i}.xml"))
        rows = []
        for row in root.iter(f"{NS}row"):
            cells = {}
            for c in row.findall(f"{NS}c"):
                v = c.find(f"{NS}v")
                if v is None:
                    continue
                cells[colnum(c.get("r"))] = (
                    shared[int(v.text)] if c.get("t") == "s" else v.text)
            rows.append([cells.get(k, "") for k in range(max(cells) + 1)] if cells else [])
        out[name] = rows
    return out


def parse(path):
    sheets = _sheets(path)
    grid = sheets["5.3d"]
    head = next(i for i, r in enumerate(grid) if "Item Code" in [c.strip() for c in r])
    ix = {c.strip(): i for i, c in enumerate(grid[head])}
    rows = []
    for r in grid[head + 1:]:
        if len(r) <= ix["Share in All India**"] or not r[ix["Item Code"]].strip():
            continue
        sector = SECTORS.get(r[ix["Sector*"]].strip())
        if not sector:
            raise SystemExit(f"unrecognised sector {r[ix['Sector*']]!r}")
        g = lambda k: r[ix[k]].strip() if len(r) > ix[k] else None
        rows.append((
            g("State"), g("State Name"), sector, g("Item Code"), g("Item Name"),
            g("Subclass Code"), g("Subclass Name"), g("Class Code"), g("Class Name"),
            g("Group Code"), g("Group Name"), g("Division Code"), g("Division Name"),
            float(r[ix["Share in All India**"]]), float(r[ix["Share within State***"]]),
        ))
    return rows, sheets


def verify(rows, sheets):
    """Sum 5.3d up to divisions and groups; compare with 5.3a and 5.3b."""
    # 5.3d is state-level throughout: there is no All-India row. The national
    # weight of anything is the sum of its share_all_india across all 37
    # states, which is exactly what the published aggregate tables should
    # reproduce.
    ai = rows

    def published(grid, codecol, namecol, first_num):
        out = {}
        for r in grid:
            if len(r) <= first_num + 2:
                continue
            key = (r[codecol] or r[namecol]).strip()
            try:
                out[key] = tuple(float(r[first_num + k]) for k in range(3))
            except (ValueError, IndexError):
                continue
        return out

    ok = True
    for label, keyidx, grid, codecol, namecol, first in (
            ("division", 12, sheets["5.3a"], 0, 0, 1),
            ("group", 9, sheets["5.3b"], 0, 1, 2)):
        got = defaultdict(lambda: defaultdict(float))
        for r in ai:
            got[r[keyidx]][r[2]] += r[13]
        pub = published(grid, codecol, namecol, first)
        worst, n = 0.0, 0
        for key, secs in got.items():
            p = pub.get(key)
            if p is None:
                print(f"  {label} {key!r}: no published row to check against",
                      file=sys.stderr)
                ok = False
                continue
            for val, want in ((secs["Rural"], p[0]), (secs["Urban"], p[1]),
                              (secs["Rural"] + secs["Urban"], p[2])):
                worst = max(worst, abs(val - want))
                n += 1
        print(f"  {label:<9} {len(got):>3} derived, {n:>3} comparisons, "
              f"worst disagreement {worst:.2e}")
        if worst > TOLERANCE:
            ok = False

    total = sum(r[13] for r in ai)
    print(f"  all-India total {total:.10f}")
    if abs(total - 100) > TOLERANCE:
        ok = False

    for field, idx in (("item", 3), ("sub_class", 5), ("class", 7),
                       ("group", 9), ("division", 11)):
        n = len({r[idx] for r in ai})
        if n != EXPECTED[field]:
            print(f"  NOTE: {field} has {n} distinct codes, expected "
                  f"{EXPECTED[field]}", file=sys.stderr)
            ok = False
    return ok


def _load(conn, rows):
    from psycopg2 import sql
    from psycopg2.extras import execute_values

    key = ["state_code", "sector", "item_code"]
    updates = sql.SQL(", ").join(
        sql.SQL("{c} = EXCLUDED.{c}").format(c=sql.Identifier(c))
        for c in COLS if c not in key)
    query = sql.SQL(
        "INSERT INTO {} ({}) VALUES %s ON CONFLICT ({}) DO UPDATE SET {}"
    ).format(
        sql.Identifier(SCHEMA_NAME, TABLE),
        sql.SQL(", ").join(sql.Identifier(c) for c in COLS),
        sql.SQL(", ").join(sql.Identifier(c) for c in key),
        updates)
    with conn:
        with conn.cursor() as cur:
            cur.execute(DDL.format(schema=SCHEMA_NAME))
            execute_values(cur, query.as_string(conn), rows, page_size=5000)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--xlsx", required=True, help="path to Annex_5.3.xlsx")
    ap.add_argument("--check", action="store_true", help="verify only, no DB write")
    args = ap.parse_args()

    rows, sheets = parse(args.xlsx)
    print(f"parsed {len(rows)} item-weight rows")
    print("verifying against the published aggregate tables:")
    if not verify(rows, sheets):
        raise SystemExit("verification FAILED -- refusing to load")
    print("  ok")
    if args.check:
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
