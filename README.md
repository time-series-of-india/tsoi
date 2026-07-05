# Time Series of India

An open-source project charting India's public data — explained, and citable.

The first section, **Economy**, tracks India's payment systems (UPI, IMPS, NEFT,
RTGS, cards and more) from official RBI and NPCI releases. Three ways to read it:

- **Beats** — a swipe deck of single-chart insights: one idea, one chart, one swipe.
- **Stories** — short editorial pieces, each anchored to a focused live chart.
- **Dashboards** — interactive explorers for slicing the numbers yourself.

Live at **[timeseriesofindia.com](https://timeseriesofindia.com)**.

## How it works

```
Excel / CSV (RBI, NPCI)  →  ETL (Python)  →  PostgreSQL / TimescaleDB  →  Astro + Apache ECharts
```

- **`etl/`** — Python pipelines that parse official RBI/NPCI releases into a tidy schema.
- **`site/`** — a static [Astro](https://astro.build) site; charts are spec-driven
  and rendered natively with [Apache ECharts](https://echarts.apache.org) (no iframes).
- **`infra/`** — Docker Compose: TimescaleDB (build-time data store).

See [`CLAUDE.md`](CLAUDE.md) for architecture and common commands.

## For contributors & AI agents

Point your coding agent at [`AGENTS.md`](AGENTS.md) — it covers the architecture,
the static-JSON data pipeline, and the integrity rules your PR must pass. Humans:

- [`CONTRIBUTING.md`](CONTRIBUTING.md) — data & code: ETL conventions, the
  `build-*.mjs` pipeline, the PR checklist, and how to report a data error (a
  source link is enough).

Single maintainer, no SLA — issues are triaged and PRs reviewed when time allows.

## Data & attribution

The underlying data is sourced from public releases by the **Reserve Bank of
India (RBI)** and the **National Payments Corporation of India (NPCI)**.

- That data remains the property of the respective publishing agencies. It is
  **not** covered by this repository's code license, and it is governed by the
  source agencies' own terms of use.
- Raw source files are **not redistributed** in this repository; the code
  transforms publicly available releases.
- Charts and figures cite their source. If you reuse them, please preserve the
  attribution to RBI / NPCI and to Time Series of India.

This project is **independent** and is **not affiliated with, endorsed by, or
sponsored by RBI or NPCI**. Figures are derived from official data but may differ
from headline figures depending on the tables and definitions used; see the
site's *About* page for methodology and caveats.

## License

This repository draws **three lines** — see [`LICENSE-CONTENT.md`](LICENSE-CONTENT.md)
for the full statement:

- **Code, ETL, infra → Apache-2.0.** See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).
  Use, modify and redistribute under those terms.
- **Editorial & visual content → [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/).**
  The prose, chart and dashboard designs, and generated cards may be shared
  verbatim with attribution, non-commercially — no commercial use, no derivatives.
  (Commercial and derivative rights stay with the copyright holder.)
- **Underlying data → RBI / NPCI government open data.** Facts aren't copyrightable;
  TSOI claims no ownership (see *Data & attribution* above).

Note for contributors and AI agents: the content license is **BY-NC-ND**, not
plain CC BY — sharing is fine, remixing and commercial reuse are not. Code PRs
are Apache inbound=outbound; external *editorial prose* is not accepted (to keep
the copyright unfragmented) — factual corrections with a source link are.

Copyright 2026 Prateek Gulati.

## Map & data attribution

- **State boundary map** (`site/public/maps/india_states.json`): the Jammu & Kashmir,
  Ladakh and Arunachal Pradesh geometry comes from
  [india-official-geojson](https://github.com/AbhinavSwami28/india-official-geojson)
  (MIT, © Abhinav Swami), which sources J&K/Ladakh from
  [india-in-data/kashmir](https://github.com/india-in-data/kashmir). Boundaries are
  intended to depict India per the Government of India position (PoK, Gilgit-Baltistan,
  Siachen, Aksai Chin, full Arunachal Pradesh). Regenerate with
  `site/scripts/build-india-map.mjs` (swaps those three states into the base map).
  Note: this is a community dataset, not an official Survey of India product; verify
  against the latest Survey of India publications before any official use.
- **Payments data**: Reserve Bank of India and NPCI, processed by Time Series of
  India. Source links appear on each read and dashboard.
