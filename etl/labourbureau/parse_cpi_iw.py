#!/usr/bin/env python3
"""Parse the CPI-IW general index out of a Labour Bureau page snapshot.

Emits raw observations only — (date, base_year, index_value) — with no
base linking and no year-on-year. Splicing the four bases into one
continuous index is an editorial act with published linking factors behind
it, and it belongs in the generator where it can be validated and
disclosed, not in the loader where it would silently become "the data".

The page holds four index bases as four tables:

    1960=100   Aug 1968 – Sep 1988
    1982=100   Oct 1988 – Dec 2005
    2001=100   Jan 2006 – Aug 2020
    2016=100   Sep 2020 – Apr 2023

Each is year-by-row, Jan–Dec across. Two of them carry a 13th annual
average column, which is dropped: it is not a month. Missing cells appear
as '-' or empty and are skipped rather than zeroed.

Also on the page, and deliberately not parsed, is the Consumer Price Index
for Agricultural and Rural Labourers (base 1986-87=100), a different
population with a different basket. Mixing it into this series would be a
category error, so tables are matched on an explicit base marker and any
table sitting under an "Agricultural" heading is rejected.

Usage:
    python parse_cpi_iw.py                       # newest snapshot → cpi_iw_index.json
    python parse_cpi_iw.py --file <path.html>    # a specific snapshot
"""
import argparse
import json
import re
import sys
from pathlib import Path

SOURCES_DIR = Path(__file__).resolve().parents[2] / "data" / "sources"
OUT_JSON = Path(__file__).parent / "cpi_iw_index.json"

# The bases we expect, and the span each one should cover. Checked after
# parsing: a table that no longer starts or ends where it did has been
# revised upstream, and a silent shift would move the whole spine.
EXPECTED = {
    "1960": ("1968-08", "1988-09"),
    "1982": ("1988-10", "2005-12"),
    "2001": ("2006-01", "2020-08"),
    # 2016=100 keeps growing if the Labour Bureau resumes publishing; only
    # its start is fixed.
    "2016": ("2020-09", None),
}

BASE_RE = re.compile(r"BASE\s*:?\s*((?:19|20)\d\d)\s*=\s*100", re.I)
YEAR_RE = re.compile(r"(?:19|20)\d\d")
MISSING = {"", "-", "--", "n.a.", "na"}


def _text(html: str) -> str:
    return re.sub(r"<[^>]+>", " ", html).replace("\xa0", " ")


def _cells(row_html: str) -> list[str]:
    return [
        re.sub(r"<[^>]+>", "", c).replace("\xa0", " ").strip()
        for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row_html, re.S)
    ]


def _rows(table_html: str) -> list[list[str]]:
    return [_cells(r) for r in re.findall(r"<tr.*?</tr>", table_html, re.S | re.I)]


def find_base_tables(html: str) -> dict[str, str]:
    """{base_year: table html} for the industrial-worker index tables.

    The base marker sits in one of two places depending on the table: inside
    the table's own first rows (1960=100, 2016=100) or in the prose just
    above it (1982=100, 2001=100). Both are searched, nearest first.
    """
    out: dict[str, str] = {}
    for m in re.finditer(r"<table.*?</table>", html, re.S | re.I):
        table = m.group(0)
        head = _text(" ".join(_rows(table)[0] if _rows(table) else []))
        # Look back far enough to catch a heading, not so far as to pick up
        # the previous table's caption.
        before = _text(html[max(0, m.start() - 400) : m.start()])
        context = f"{before} {head}"
        if re.search(r"agricultur|rural labour", context, re.I):
            continue
        found = BASE_RE.search(head) or BASE_RE.search(before)
        if not found:
            continue
        base = found.group(1)
        if base in out:
            print(f"  warning: second table for base {base}=100, keeping the first", file=sys.stderr)
            continue
        out[base] = table
    return out


def parse_table(table_html: str, base: str) -> list[tuple[str, float]]:
    """[(ym, index_value)] from one base table, annual average dropped."""
    obs: list[tuple[str, float]] = []
    for cells in _rows(table_html):
        if not cells:
            continue
        year = cells[0].strip()
        # The 2016 table folds its caption into the first header cell, so the
        # year can be trailing text rather than the whole cell.
        if not re.fullmatch(r"(?:19|20)\d\d", year):
            continue
        # Columns 1..12 are Jan..Dec. Anything past that is the annual
        # average and is not a month.
        for i, raw in enumerate(cells[1:13]):
            v = raw.strip()
            if v.lower() in MISSING:
                continue
            try:
                obs.append((f"{year}-{i + 1:02d}", float(v.replace(",", ""))))
            except ValueError:
                print(f"  warning: base {base} {year}-{i + 1:02d}: unreadable {v!r}", file=sys.stderr)
    return obs


def parse(html: str) -> list[dict]:
    tables = find_base_tables(html)
    missing = set(EXPECTED) - set(tables)
    if missing:
        raise SystemExit(f"missing base table(s) on the page: {sorted(missing)}")

    rows: list[dict] = []
    for base in sorted(tables):
        obs = parse_table(tables[base], base)
        if not obs:
            raise SystemExit(f"base {base}=100: parsed zero observations")
        obs.sort()
        first, last = obs[0][0], obs[-1][0]
        want_first, want_last = EXPECTED.get(base, (None, None))
        if want_first and first != want_first:
            raise SystemExit(f"base {base}=100 starts {first}, expected {want_first}")
        if want_last and last != want_last:
            raise SystemExit(f"base {base}=100 ends {last}, expected {want_last}")

        # Within a base the months must be unbroken. A hole here would become
        # a hole in the spine twelve months later, via year-on-year.
        for (a, _), (b, _) in zip(obs, obs[1:]):
            if _next_ym(a) != b:
                raise SystemExit(f"base {base}=100: gap between {a} and {b}")

        print(f"  base {base}=100: {first} .. {last} ({len(obs)} months)")
        rows.extend({"date": f"{ym}-01", "base_year": base, "index_value": v} for ym, v in obs)
    return rows


def _next_ym(ym: str) -> str:
    y, m = int(ym[:4]), int(ym[5:])
    return f"{y + 1}-01" if m == 12 else f"{y}-{m + 1:02d}"


def newest_snapshot() -> Path:
    snaps = sorted(SOURCES_DIR.glob("cpi-iw-general-index-*.html"))
    if not snaps:
        raise SystemExit(f"no snapshot in {SOURCES_DIR} — run download_cpi_iw.py first")
    return snaps[-1]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--file", type=Path, help="snapshot to parse (default: newest)")
    ap.add_argument("--out", type=Path, default=OUT_JSON)
    args = ap.parse_args()

    src = args.file or newest_snapshot()
    print(f"  parsing {src}")
    rows = parse(src.read_text(errors="replace"))
    args.out.write_text(json.dumps(rows, indent=None))
    print(f"  wrote {len(rows)} rows → {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
