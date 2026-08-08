# Labour Bureau — CPI-IW pipeline

Fetches the all-India **Consumer Price Index for Industrial Workers** (monthly
general index) from the Labour Bureau and loads it into
`economy_dev.cpi_iw_index` (or `economy.*` for prod runs, via `SCHEMA_NAME`).

This is the long half of India's monthly inflation record. MOSPI's CPI
Combined only begins in 2011; CPI-IW carries the series back to August 1968,
which is what makes an honest monthly terrain possible before that. It feeds
the shared spine builder (`site/scripts/lib/inflation-spine.mjs`) and through
it three surfaces: the Inflation Peaks game, the rupee time machine and the
inflation board's long line.

## File layout

```
labourbureau/
├── download_cpi_iw.py  # Snapshot the general-index page into data/sources/
├── parse_cpi_iw.py     # Four base tables → cpi_iw_index.json
└── load_cpi_iw.py      # cpi_iw_index.json → {SCHEMA_NAME}.cpi_iw_index
```

`cpi_iw_index.json` is generated at runtime and gitignored, as are the HTML
snapshots under `data/sources/`.

## Run it

```bash
cd etl/labourbureau
python download_cpi_iw.py                        # → data/sources/cpi-iw-general-index-<date>.html
python parse_cpi_iw.py                           # → cpi_iw_index.json
SCHEMA_NAME=economy_dev python load_cpi_iw.py    # → economy_dev.cpi_iw_index
```

DDL: `infra/db/init-economy-dev-cpi-iw.sql`.

## What the source looks like

<https://www.labourbureau.gov.in/allindiageneralindex-1> is a single HTML page
with four tables, one per index base:

| Base | Coverage |
|---|---|
| 1960=100 | Aug 1968 – Sep 1988 |
| 1982=100 | Oct 1988 – Dec 2005 |
| 2001=100 | Jan 2006 – Aug 2020 |
| 2016=100 | Sep 2020 – Apr 2023 |

Rows are year × Jan–Dec. Two tables carry a 13th annual-average column, which
the parser drops. Missing months are `-` or blank.

Three things about this source are worth knowing before touching the code.

**The bases are separate scales.** Sep 1988 reads 806 on 1960=100 and Oct 1988
reads 167 on 1982=100 — the same price level, counted twice. The table stores
them as published and links nothing. Splicing needs the Labour Bureau's
official linking factors and happens in the generator, where the seams are
validated against neighbouring year-on-year and disclosed on the page.

**The page carries a second series.** Below the CPI-IW tables sit several for
the Consumer Price Index for Agricultural and Rural Labourers (base
1986-87=100). Different population, different basket. The parser matches
tables on an explicit base marker and rejects anything under an
"Agricultural" heading, rather than indexing tables by position.

**The TLS chain does not verify.** `download_cpi_iw.py` disables certificate
verification, the equivalent of `curl -k`, and says so at the call site. The
page is public and unauthenticated and we send nothing to it. What the data is
trusted on is the parser's structural checks (each base must start and end
where it always has, with no interior gaps) and the generator's seam and
landmark gates, not the transport.

## Publication status

The Labour Bureau's own page has not been updated past **April 2023**. That is
a property of the source, not a bug here. It does not affect the game: the
spine hands over to MOSPI CPI Combined at January 2014, so CPI-IW's recent
years are never used. If the Labour Bureau resumes publishing, re-running the
three scripts picks it up, and `parse_cpi_iw.py` deliberately does not pin an
end date for the 2016=100 table.
