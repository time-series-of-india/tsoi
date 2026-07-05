# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Time Series of India (TSOI)** is a data-visualization site tracking Indian
payment-system statistics (UPI, IMPS, NEFT, RTGS, cards, etc.) sourced from
official RBI and NPCI releases.

The **published site is 100% static** (Cloudflare Workers Static Assets). The
database and ETL below run only at **build time** to turn source spreadsheets
into the static JSON the site ships — there is no database in the serving path.
See [`AGENTS.md`](AGENTS.md) for the mental model.

## Common Commands

### Start the build-time database (TimescaleDB)
```bash
cd infra
docker compose up -d          # brings up TimescaleDB on 127.0.0.1:5432
```
Apply the schema DDL on first run (see `infra/db/*.sql`).

### Run the RBI ETL pipeline
Raw RBI Excel files are downloaded manually into `data/sources/` (not committed).
```bash
cd etl/rbi
# Parse and load in one step
SCHEMA_NAME=economy_dev python main.py --parse --load --file ../../data/sources/<filename>.xlsx

# Parse only (outputs JSON to etl/rbi/<basename>.json)
python main.py --parse --file ../../data/sources/<filename>.xlsx

# Load from a previously parsed JSON
python main.py --load --json-file <basename>.json
```

### Run the NPCI ETL pipeline
NPCI stats are fetched first (the fetched CSV/JSON are not committed — regenerate
with the `download_*.py` scripts / `fetch_browser.mjs`), then loaded:
```bash
cd etl/npci
# Fetch (example) then load. Run the loaders you need:
SCHEMA_NAME=economy_dev python load_imps_bank.py
SCHEMA_NAME=economy_dev python load_bank.py
SCHEMA_NAME=economy_dev python load_app.py
SCHEMA_NAME=economy_dev python load_mcc.py
SCHEMA_NAME=economy_dev python load_p2m.py
SCHEMA_NAME=economy_dev python load_psp.py
SCHEMA_NAME=economy_dev python load_statewise.py
SCHEMA_NAME=economy_dev python load_top50_vol_val.py
```

### Build & deploy the site
```bash
./scripts/deploy.sh    # generators (read DB) → hash data → astro build → wrangler deploy
```
The generators query TimescaleDB, so the DB must be up and loaded first. See the
script for the exact pipeline. `site/` also supports `npm run dev` / `npm run build`
against already-generated data.

## Architecture

### Components

- **`infra/`** — Docker Compose for **TimescaleDB** (build-time data store) plus
  the schema DDL in `infra/db/`. Not used by the published site at runtime.
- **`etl/rbi/`** — Python ETL that parses RBI Excel files and loads TimescaleDB
- **`etl/npci/`** — Python ETL that fetches and loads NPCI statistics data
- **`site/`** — the Astro site: native, spec-driven ECharts dashboards and
  longform reads (`site/src/lib/dashboards/`), plus `site/scripts/build-*.mjs`
  generators that emit the static JSON the browser fetches
- **`scripts/`** — `deploy.sh`: build-and-push deploy to Cloudflare Workers

### Data Flow

```
Excel (data/sources/) → etl/rbi ┐
                                ├→ TimescaleDB → site/scripts/build-*.mjs → static JSON
CSV/JSON (etl/npci/)  → etl/npci ┘                                            (site/public/data/)
                                                    → astro build → Cloudflare Workers (static)
```

1. `settlement_data_parser.py` reads Excel sheets, maps products using `product-dict.json`, and combines variants (e.g., Credit Card PoS + e-Commerce)
2. `loader.py` writes parsed rows to `{SCHEMA_NAME}.payment_statistics` (default `economy_dev`; set `SCHEMA_NAME=economy` for prod runs)
3. NPCI loaders (`load_*.py`) read fetched CSV/JSON from `etl/npci/` and write to `{SCHEMA_NAME}.<table>` using the same `SCHEMA_NAME` env var pattern
4. `site/scripts/build-*.mjs` query TimescaleDB and emit content-hashed JSON into `site/public/data/`
5. The Astro site renders native ECharts from those JSON files; `deploy.sh` runs `wrangler deploy` to push the static output to the edge

### Database Schema

Table: `{SCHEMA_NAME}.payment_statistics` — default schema is `economy_dev` for dev runs

| Column | Type | Description |
|---|---|---|
| `product` | text | Payment instrument name (e.g., "UPI", "IMPS") |
| `category` | text | "PAYMENT TRANSACTIONS", "CASH WITHDRAWAL", "Settlement Systems" |
| `sub_category` | text | Operator: RBI, NPCI, Card Network, CCIL |
| `volume` | numeric | Transaction count |
| `value` | numeric | Transaction value |
| `date` | date | Transaction date |

DDL for the `economy_dev` schema: `infra/db/init-economy-dev.sql` (and
`init-economy-dev-npci.sql` for the NPCI tables).

### Infrastructure

- **TimescaleDB** (PostgreSQL 15 + timescaledb extension) — build-time time-series storage; loopback-only, never exposed publicly
- **Cloudflare Workers Static Assets** — serves the built `site/dist/` at the edge; per-path cache policy in `site/public/_headers` (content-hashed `/data/*` and `/_astro/*` are immutable; HTML revalidates)

### Configuration

- `.env` at repo root — `DB_PASSWORD`, `SCHEMA_NAME`, and Cloudflare deploy creds (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`)
- `.env.example` — copy to `.env` and fill in real values
- `SCHEMA_NAME` env var — controls which PostgreSQL schema the ETL writes to; default `economy_dev`, prod uses `economy`
