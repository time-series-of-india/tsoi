# Contributing to Time Series of India

TSOI is a public-good project charting India's public data — currently India's
payment systems, from official RBI and NPCI releases. It is maintained by a
single person in limited hours, so please read this before opening a PR.

## What you can contribute

Outside contributions are welcome on the **open, Apache-licensed machinery** and on
factual accuracy:

- **New data** — a dataset + ETL loader (see *Adding a dataset* below).
- **Bug fixes & build tooling** — anything in `etl/`, `site/scripts/`, the site
  code, or infra.
- **Data-error reports** — the highest-value, lowest-friction contribution: open a
  **"Report a data error"** issue with a source link. No code needed.

**Not open to contribution:** the **editorial content** — the prose in reads and
beats, the chart/dashboard *designs*, and the game/puzzle *text and design*.
These are maintainer-authored, licensed **CC BY-NC-ND 4.0** (share verbatim with
credit, non-commercially; no derivatives — this keeps the copyright clean, see
[`LICENSE-CONTENT.md`](LICENSE-CONTENT.md)). If you spot a factual error in the
words or a chart, that's a **data-error report**, which *is* welcome.

> A note on dashboards: the runtime and specs are Apache code, but a dashboard's
> *visual design* is editorial content. So contribute dashboard **code/bug fixes**
> freely; new dashboard *designs* are maintainer-authored (propose them in an issue).

> A note on games: same split as dashboards. The game *runtime* (the Astro
> component, the scoring worker) is Apache code — contribute fixes freely. A
> puzzle's *questions, hints and context copy* are editorial content,
> maintainer-authored, same as prose. The underlying *mechanic* (guess, reveal,
> score) isn't ownable by anyone — that's an idea, not an expression — so this
> restriction is only ever about the specific authored puzzle, never about the
> game format itself.

> **Maintenance stance:** single maintainer, no SLA. Issues are triaged and PRs
> reviewed when time allows. No CLA for code — Apache-2.0 is inbound=outbound.
> **Deploys are manual** (build-and-push, see below): no PR auto-publishes, so a
> merged change never pushes numbers live on its own.

## Architecture in one screen

```
Excel / CSV (RBI, NPCI)
   → etl/ (Python)                    parse → tidy schema
   → PostgreSQL / TimescaleDB         build-time store (not in the serving path)
   → site/scripts/build-*.mjs         generate static JSON into site/public/data/
   → Astro build                      → dist/ (100% static)
```

The **public site is fully static** — every runtime `fetch` hits same-origin JSON
(`/data/economy/*.json`, `/maps/*.json`). There is **no database in the serving
path** — the runtime fetches static JSON only. Charts are spec-driven and rendered
natively with Apache ECharts (no iframes). See [`CLAUDE.md`](CLAUDE.md) for the
full architecture and commands.

### The generators (`site/scripts/build-*.mjs`)

Data JSON under `site/public/data/` is **gitignored** and regenerated at build:

| Script | Produces | Source |
|---|---|---|
| `build-dashboard-data.mjs` | dashboard datasets | **TimescaleDB** (needs DB reachable) |
| `build-reads-data.mjs` | short-read datasets | raw NPCI JSON in `etl/npci/` |
| `build-read-upi-architecture.mjs` | flagship read dataset | raw NPCI JSON |
| `build-series.mjs` | time-series slices | TimescaleDB |
| `build-india-map.mjs` | statewise map data | — |
| `build-og-cards.mjs` / `build-og-default.mjs` | social cards | reads/dashboards registries |
| `build-read-thumbs.mjs` / `build-dashboard-thumbs.mjs` | landing thumbnails | rendered charts |

> ⚠️ **Known parity caveat:** `build-reads-data.mjs` reads raw NPCI JSON while
> `build-dashboard-data.mjs` reads TimescaleDB — two freshness paths that can
> diverge. Ensure `etl/npci/*.json` is current when you regenerate reads data.

Shared helpers live in `site/scripts/lib/` — notably `canon-bank.mjs`, which
canonicalises entity names (parsed from `etl/npci/normalize.py`'s `BANK_NAME_MAP`,
single source of truth) so raw-JSON generators don't split e.g. "SBI" from
"State Bank Of India". **Reuse it — don't hand-roll case-sensitive `.replace()`
shorteners.**

## Adding a dataset

A new dataset submission needs:

1. **Source** — RBI or NPCI government open data (source *URL*, not the file).
   Other agencies considered case-by-case in an issue first.
2. **Format** — Excel `.xlsx` or CSV with a consistent, parseable structure
   across releases.
3. **ETL loader** — a new `etl/<source>/load_<dataset>.py` following the
   psycopg2 + `SCHEMA_NAME` env var + upsert pattern (reference: `etl/rbi/loader.py`):
   - Read target schema from `SCHEMA_NAME = os.environ.get("SCHEMA_NAME", "economy_dev")`
   - Use `INSERT ... ON CONFLICT (pk_columns) DO UPDATE SET ...` — never plain
     INSERT or TRUNCATE
   - Close connections and cursors in `finally` blocks
4. **Schema DDL** — add `CREATE TABLE IF NOT EXISTS` DDL to
   `infra/db/init-economy-dev.sql`.
5. **Entity-name canonicalisation** — if the dataset carries bank/app/PSP names
   that also appear elsewhere, canonicalise via the existing map so it aggregates
   cleanly (see `canon-bank.mjs` / `normalize.py`).
6. **Wire the generator** — if the data feeds a chart, add/extend the relevant
   `build-*.mjs` so `site/public/data/**` gets the JSON, and reference it from
   the dashboard spec (`site/src/lib/dashboards/specs.ts`) or a read.
7. **Verification** — run the loader against `economy_dev` and confirm rows land:
   `SCHEMA_NAME=economy_dev python load_<dataset>.py`.

## PR submission

### Branch naming

```
feat/<slug>          # new dashboard, read, or dataset
fix/<description>    # data error correction or bug fix
data/<dataset-name>  # new data file + ETL update
docs/<description>   # documentation only
```

### Before opening a PR

```bash
# 1. No secrets in your history
trufflehog git file://. --only-verified          # zero findings
# (no local install? use docker:)
# docker run --rm -v "$PWD:/repo" trufflesecurity/trufflehog:latest \
#   git file:///repo --only-verified

# 2. ETL loads cleanly (if you touched ETL)
cd etl/<source>
SCHEMA_NAME=economy_dev python load_<dataset>.py   # 0 errors, rows > 0

# 3. Data generates + site builds (if you touched a generator or a chart)
cd site
node scripts/build-<relevant>.mjs                  # writes public/data/**
npm run build                                       # astro build, no errors
```

### PR description template

```markdown
## What
<!-- One sentence describing the change -->

## Data source (if data/ETL)
- Agency: <!-- RBI, NPCI -->
- Dataset: <!-- e.g. "IMPS Bank Performance Statistics" -->
- Update cadence: <!-- monthly, quarterly -->
- Source URL: <!-- the agency statistics page, not the file -->

## Verification
- [ ] `trufflehog ... --only-verified` passes (zero findings)
- [ ] ETL: `SCHEMA_NAME=economy_dev python load_<x>.py` → 0 errors, rows verified
- [ ] Generator + `npm run build` succeed and the chart renders
- [ ] No raw color/spacing values outside `global.css` (if touching site styles)
```

## Review checklist

A PR is ready to merge when:

- [ ] ETL loader follows the `SCHEMA_NAME` + upsert pattern (no hardcoded schema,
      no TRUNCATE)
- [ ] DDL added to `infra/db/init-economy-dev.sql` (if new table)
- [ ] Entity names canonicalised where they overlap existing data
- [ ] No secrets or credentials in any file (`.env*`, keys, tokens stay gitignored)
- [ ] Generated `site/public/data/**` and `etl/**/*.json` intermediates are **not**
      committed (they're gitignored)
- [ ] Any change to **displayed numbers or claims** carries a source
- [ ] Commit messages are clear and reference the dataset or fix

## Reporting a data error

The highest-value, lowest-friction contribution: open a **"Report a data error"**
issue with the source link. You don't need to write code — a citation is enough
for the maintainer to correct it.

## Attribution & licensing

- **Data** belongs to the source agency (RBI, NPCI), published as government open
  data. TSOI claims no ownership.
- **Code contributions** are Apache-2.0 (inbound=outbound), credited in git history.
  No CLA.
- **Editorial content** (prose, chart/dashboard designs, game/puzzle text and
  design, generated cards) is © TSOI, licensed
  [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/) —
  see [`LICENSE-CONTENT.md`](LICENSE-CONTENT.md).
  Prose stays maintainer-authored; none of this restricts the open code.

## Questions

Open a GitHub issue for dataset requests, data corrections, or anything unclear.
Agents: start at [`AGENTS.md`](AGENTS.md).
