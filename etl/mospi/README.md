# etl/mospi — MoSPI Consumer Price Index

Official CPI index and inflation from the MoSPI API platform
(`api.mospi.gov.in/api/cpi/`). No authentication, no scraping: these are open
government endpoints. Contract and failure modes are in
[`docs/mospi-cpi-api.md`](../../docs/mospi-cpi-api.md) — **read that before the
published PDF manual, which is out of date and will not work.**

**There are two CPI series and they are handled by two separate pipelines.** CPI
was rebased from 2012=100 to 2024=100 with effect from January 2026. The old
series is closed and final; the new one is live and much richer. They share no
table and must never be joined implicitly.

| | 2012 base | 2024 base |
|---|---|---|
| Endpoints | `getCPIIndex`, `getItemIndex` | `getCPIData` |
| Scripts | `fetch_cpi.py` / `load_cpi.py` | `fetch_cpi2024.py` / `load_cpi2024.py` |
| Span | Jan 2011 – **Dec 2025** (closed) | Jan 2025 – present (live) |
| Hierarchy | group → subgroup | division → group → class → sub_class → item |
| Item detail | All-India only | **per state and sector** |
| Backfill cost | ~25 requests | ~12,000 requests, ~1 hour |

## Run it

```bash
# 2012 base — closed historical series
python fetch_cpi.py --backfill                       # ~25 requests, a few minutes
SCHEMA_NAME=economy_dev python load_cpi.py

# 2024 base — live series
python fetch_cpi2024.py --backfill                   # ~1 hour, see below
SCHEMA_NAME=economy_dev python load_cpi2024.py
```

Apply [`init-economy-dev-mospi-cpi.sql`](../../infra/db/init-economy-dev-mospi-cpi.sql)
and [`init-economy-dev-mospi-cpi-2024.sql`](../../infra/db/init-economy-dev-mospi-cpi-2024.sql)
first. The loaders need `DB_PASSWORD` from the repo-root `.env` and the project
venv (they import `psycopg2`).

Other modes:

```bash
python fetch_cpi.py --year 2025              # one year of the old series
python fetch_cpi.py --backfill --force       # ignore the raw/ cache
python fetch_cpi2024.py --month 2026 6       # one month, all states
python fetch_cpi2024.py --latest             # newest published month — the cron entry point
SCHEMA_NAME=economy_dev python load_cpi.py --parse       # CSV only, no DB
SCHEMA_NAME=economy_dev python load_cpi2024.py --parse   # parse only, no DB
```

All four steps are idempotent. The fetchers cache to `raw/` and `raw2024/` and
skip what they already have; the loaders upsert on the natural key, so
re-running is safe and a refetch overwrites.

## Files

| File | Role |
|---|---|
| `fetch_cpi.py` | 2012 base: one request per year per series → `raw/` |
| `load_cpi.py` | 2012 base: parse, resolve codes, upsert into two tables |
| `codes.py` | 2012-base state/group/subgroup/item codes from the published metadata workbook |
| `fetch_cpi2024.py` | 2024 base: one file per (year, month, state), paged → `raw2024/` |
| `load_cpi2024.py` | 2024 base: parse, resolve codes, upsert into `mospi_cpi_coicop` |
| `codes2024.py` | 2024-base state/sector/month codes — **different numbering**, see below |

Both `codes*.py` are committed config, not generated artifacts. `raw/`,
`raw2024/` and the intermediate CSVs are gitignored, like every other ETL
artifact.

## What lands in the DB

`economy_dev.mospi_cpi_index` — 379,305 rows, state × sector × group ×
subgroup, monthly, Jan 2011 – Dec 2025.
`economy_dev.mospi_cpi_item_index` — 42,159 rows, 299 items, all-India, monthly.
`economy_dev.mospi_cpi_coicop` — 1,238,472 rows, state × sector × five-level
COICOP hierarchy, monthly, Jan 2025 – Jun 2026 (18 months × 68,804). 37 states,
668 hierarchy nodes, 358 items. `raw2024/` is 462 MB on disk.

`inflation` is **null for all of calendar 2025**, and that is correct rather than
missing: 2025 is the back-cast and has no year-ago base on this series. Year-on-
year begins in January 2026.

## Fetching the 2024 series

`limit` caps at **100** on `getCPIData`, against 40,000 on the old endpoints, so
the same volume costs roughly 500x the requests. Measured 2026-07-26: three
concurrent workers sustain ~120 req/min cleanly; six get rate-limited on every
request. `WORKERS = 3` is a measured ceiling, not a guess — raising it does not
make the job faster, it makes it fail.

The fetcher slices by (year, month, state) rather than paging through a whole
month. A month is 68,804 rows, which is 688 pages; a state-month is ~1,900,
which is 19. Deep pagination against a backend with no guaranteed `ORDER BY` is
how rows go missing silently, and short slices also mean each file carries its
own `totalRecords` to check against. A slice whose row count disagrees with the
API's own total is refused rather than cached.

## Three things to know before using the data

**The 2012 series ends at December 2025.** CPI was rebased to 2024=100 from
January 2026. This is the old series terminating by design, not a stale feed;
every row is final (`status: F`) and none of it will be revised again. The
backfill is therefore a one-time load — no cron is needed to maintain it.

**The 2024 base is served by a different endpoint.**
`getCPIIndex?base_year=2024` returns `No Data Found`, which looks like "not
published yet" and is not: the new series lives on `/api/cpi/getCPIData` and is
loaded by `fetch_cpi2024.py` / `load_cpi2024.py`. Details and access notes:
[`docs/mospi-cpi-api.md`](../../docs/mospi-cpi-api.md). `fetch_cpi.py --poll` is
now redundant — it polls the endpoint that will never fill.

The two series are not comparable (6 groups → 12 divisions, 299 → 358 items,
food weight 45.86% → 36.75%), so they live in separate tables and `base_year` is
inside both primary keys. Calendar 2025 exists on both bases, so linking factors
for a splice can be computed from real overlap rather than assumed.

**2020 is thin.** March–July 2020 carry a fraction of a normal month; April and
May have All-India only, with no state detail. Charts spanning 2020 need to show
the hole rather than interpolate across it.

## Verification

### 2012 base

Recomputing year-on-year inflation from the stored index reproduces the API's
own `inflation` column exactly across all 142 comparable months of the national
headline series (worst gap 0.000), which validates the month-name-to-date
mapping and the string-to-numeric parsing end to end. Externally, February 2025
headline inflation loads as 3.61%, matching the MoSPI press release. January
2025 loads as 4.26% against the 4.31% reported at release — that is the normal
provisional-to-final revision, and confirms these are the revised figures.

### 2024 base

Externally, **all 18 months** of the national headline series match Annexure IV
of the June 2026 press release exactly, index and inflation, zero mismatches.
All twelve divisions for June 2026 match Annexure I.

Internally, recomputing year-on-year from the stored index across **412,824**
state × sector × node comparisons reproduces the API's `inflation` column to
within 0.02 in all but 6 cases, worst gap 0.04 — consistent with the release's
own note that published indices are rounded to two decimals while inflation is
computed from unrounded values.

Completeness: every month carries exactly 68,804 rows; 37 states, 668 hierarchy
nodes, 358 items, matching the published basket size. No null indices, no null
inflation after Dec 2025, no non-null inflation before Jan 2026. Reloading
produces an identical row count.
