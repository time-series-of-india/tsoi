# The Walk through Midnight — source data

Retrieved **2026-08-11**.

This CSV is committed deliberately (see the `!/data/independence/` exception in
`.gitignore`). It is small, static, externally sourced, openly licensed, and
will never be refreshed by a cron, so it bypasses the usual
ETL → TimescaleDB → generator pipeline. `site/scripts/build-independence.mjs`
reads it directly and emits the one JSON file `/independence` fetches.

**Consequence, accepted knowingly: `tsoi trace` lineage does not cover these
series.**

The file is stored **exactly as downloaded** — unfiltered, all countries. That
is why the comparator lines (World, United Kingdom, China) cost nothing. Do not
hand-edit it; if it looks wrong, re-download and diff.

## Retrieval

```
https://ourworldindata.org/grapher/gdp-per-capita-maddison.csv
```

No API key. The `?country=IND` parameter does **not** filter the file — the CSV
contains all countries.

| File | Slug | India span | Check values |
|---|---|---|---|
| `gdp-per-capita-maddison.csv` | `gdp-per-capita-maddison` | 1600–2022 | 1900 = 955 · 1947 = 985 · 2022 = 7765.6 |

The check values are enforced at build time by the generator's validation
gates, which fail the build rather than warn.

## The 2023–2026 tail

Maddison stops at 2022. India and the World are chained forward off their own
2022 level by authored per-capita real growth rates (IMF WEO real GDP growth
minus UN WPP population growth, audited 2026-08-14); every extended series
carries `estimated_from: 2023`. The full derivation, the exact WEO/WPP vintages
and the flagged fiscal-vs-calendar-year mismatch are documented at length in
the generator, next to the constants they justify.

## Attribution to ship on the page

- **GDP per capita** — Maddison Project Database 2023, via Our World in Data.
- **2023–2026 estimates** — chained from IMF World Economic Outlook (April and
  July 2026 vintages) and UN World Population Prospects 2024 growth rates, as
  labelled on the page.

## History

Nine CSVs originally came down together for a five-panel build (git:
`ca6fdd0` — demographics, environment, infrastructure, governance panels
alongside this one). The piece became a single walked line, and the eight
CSVs the walk never reads were removed from the repository at release; their
snapshots, provenance notes, and licence reasoning (including which climate
sources are deliberately excluded and why) are retained internally for the
future piece that will use them.
