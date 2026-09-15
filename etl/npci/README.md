# NPCI Statistics — UPI Data Pipeline

Fetches UPI and IMPS ecosystem statistics from NPCI's public API and loads the
eight datasets below into TimescaleDB (`economy_dev.*` for development runs via
`SCHEMA_NAME`).

## File layout

```
npci/
├── fetch_browser.mjs   # Active fetcher: API requests from an NPCI Chromium page
├── probe_month.mjs     # Read-only publication check by month and dataset
├── rebuild_combined_from_raw.py # Rebuild all_*.json after a browser fetch
├── fetcher.py          # Legacy plain-HTTP transport; Akamai currently blocks it
├── download_*.py       # Legacy wrappers around fetcher.py; do not use for refreshes
├── load_bank.py        # Parse raw bank JSON → CSV → load into DB
├── load_app.py         # Parse raw app JSON → CSV → load into DB
├── load_p2m.py         # Parse raw P2P/P2M JSON → CSV → load into DB
├── load_psp.py         # Parse raw PSP JSON → CSV → load into DB
├── load_mcc.py         # Parse raw MCC JSON → CSV → load into DB
├── load_statewise.py   # Parse raw statewise JSON → CSV → load into DB
├── load_top50_vol_val.py # Parse raw top-50 vol/val JSON → CSV → load into DB
└── load_imps_bank.py   # Parse raw IMPS bank JSON → CSV → load into DB
```

The following are generated at runtime and gitignored:

```
raw/                    # Downloaded bank JSON: {year}_{month}_{remitter|beneficiary}.json
raw_apps/               # Downloaded app JSON: {year}_{month}.json
raw_p2m/                # Downloaded P2P/P2M JSON: {year}_{month}.json
raw_psp/                # Downloaded PSP JSON: {year}_{month}_{payer|payee}.json
raw_mcc/                # Downloaded MCC JSON: {year}_{month}.json
raw_statewise/          # Downloaded statewise JSON: {year}_{month}.json
raw_top50_vol_val/      # Downloaded top-50 vol/val JSON: {year}_{month}.json
raw_imps_bank/          # Downloaded IMPS bank JSON: {year}_{month}.json
all_data.json           # Combined bank records (written by download_bank.py)
all_apps.json           # Combined app records (written by download_app.py)
all_p2m.json            # Combined P2P/P2M records (written by download_p2m.py)
all_psp.json            # Combined PSP records (written by download_psp.py)
all_mcc.json            # Combined MCC records (written by download_mcc.py)
all_statewise.json      # Combined statewise records (written by download_statewise.py)
all_top50_vol_val.json  # Combined top-50 vol/val records (written by download_top50_vol_val.py)
all_imps_bank.json      # Combined IMPS bank records (written by download_imps_bank.py)
upi_bank_stats.csv      # Intermediate CSV written by load_bank.py
upi_app_stats.csv       # Intermediate CSV written by load_app.py
upi_p2m_stats.csv       # Intermediate CSV written by load_p2m.py
upi_psp_stats.csv       # Intermediate CSV written by load_psp.py
upi_mcc_stats.csv       # Intermediate CSV written by load_mcc.py
upi_statewise_stats.csv      # Intermediate CSV written by load_statewise.py
upi_top50_vol_val_stats.csv  # Intermediate CSV written by load_top50_vol_val.py
imps_bank_stats.csv          # Intermediate CSV written by load_imps_bank.py
```

## Data sources

The active browser fetcher and legacy downloaders target the same NPCI endpoint:
`https://www.npci.org.in/api/ecosystem-statistics/get-statistics`

NPCI's Akamai configuration rejects plain HTTP clients with `403 Access
Denied`. `fetch_browser.mjs` first opens NPCI's public statistics page and then
calls the API from that page context. This is the supported fetch path.

| Script | `tab_name` param | Coverage |
|---|---|---|
| `download_bank.py` | `top50-member` | Top-50 remitter & beneficiary banks, monthly |
| `download_app.py` | `upi-apps` | All UPI apps (PSP + bank apps), monthly |
| `download_p2m.py` | `p2p-and-p2m-transactions` | UPI P2P vs P2M volume & value split, monthly (2021–) |
| `download_psp.py` | `top-15-psps` | Top-15 payer & payee PSPs: volume, approval/BD/TD %, monthly (2022–) |
| `download_mcc.py` | `mcc` | Merchant category (MCC) volume & value by category type, monthly (2017–) |
| `download_statewise.py` | `statewise-statistic` | Volume & value per state/UT, monthly (2024–); district rows skipped (names unavailable) |
| `download_top50_vol_val.py` | `top-50-mem-vol-val` | Top-50 member banks by volume & value, monthly (2021–) |
| `download_imps_bank.py` | `bank-performance` (IMPS) | Top-50 IMPS beneficiary banks: volume, approval/BD/TD/deemed-approved %, monthly (2020–) |

## Database tables

| Table | Primary key | Description |
|---|---|---|
| `economy.upi_bank_statistics` | `(bank_name, type_name, date)` | Volume, approval %, debit-reversal % per bank per month |
| `economy.upi_app_statistics` | `(app_name, date, rank)` | CIT, B2C, B2B, OnUs, total volume & value per app per month |
| `economy.upi_p2p_p2m_statistics` | `date` | Total, P2P, and P2M volume (Mn) & value (Cr) per month |
| `economy.upi_psp_statistics` | `(psp_name, type_name, date)` | Volume, approval/BD/TD % per payer or payee PSP per month |
| `economy.upi_mcc_statistics` | `(date, mcc)` | Volume (Mn) & value (Cr) per merchant category per month |
| `economy.upi_statewise_statistics` | `(date, state)` | Volume & value per state/UT per month (2024–); district-level months collapsed to state totals |
| `economy.upi_top50_vol_val_statistics` | `(date, rank)` | Top-50 member banks by volume & value per month; same bank may appear at multiple ranks |
| `economy.imps_bank_performance` | `(date, bank_name)` | Top-50 IMPS beneficiary banks: volume, approval/BD/TD/deemed-approved % per month |

All tables are created automatically by the load scripts if they don't exist.
All load scripts use INSERT...ON CONFLICT DO UPDATE (upsert) — reprocessing updates, never duplicates.

## Usage

### 1. Pull, validate and load new data

For maintainer refreshes, use the internal CLI. It stages the browser fetch,
validates it, archives and promotes only new files, rebuilds the combined JSON,
loads with natural-key upserts, and runs the invariant suite:

```bash
tsoi data status --remote --year 2026 --month Aug
tsoi data pull --dry-run --year 2026
tsoi data pull --year 2026
```

The dry run fetches and validates but does not change raw directories, archives,
or database tables.

Without the internal CLI, run the browser fetcher, rebuild the combined inputs,
then use the loaders in the next section:

```bash
node fetch_browser.mjs 2026 2026
python3 rebuild_combined_from_raw.py
```

The fetcher skips existing monthly files. Never substitute the `download_*.py`
commands while plain HTTP remains blocked.

### 2. Load into TimescaleDB

Requires the Docker stack to be running (`docker compose up -d` from `infra/`).

```bash
# Load bank data (raw/ → economy_dev.upi_bank_statistics)
SCHEMA_NAME=economy_dev python load_bank.py

# Load app data (raw_apps/ → economy_dev.upi_app_statistics)
SCHEMA_NAME=economy_dev python load_app.py

# Load P2P/P2M data (raw_p2m/ → economy_dev.upi_p2p_p2m_statistics)
SCHEMA_NAME=economy_dev python load_p2m.py

# Load PSP data (raw_psp/ → economy_dev.upi_psp_statistics)
SCHEMA_NAME=economy_dev python load_psp.py

# Load MCC data (raw_mcc/ → economy_dev.upi_mcc_statistics)
SCHEMA_NAME=economy_dev python load_mcc.py

# Load state-wise data (raw_statewise/ → economy_dev.upi_statewise_statistics)
SCHEMA_NAME=economy_dev python load_statewise.py

# Load top-50 vol/val data (raw_top50_vol_val/ → economy_dev.upi_top50_vol_val_statistics)
SCHEMA_NAME=economy_dev python load_top50_vol_val.py

# Load IMPS bank performance (raw_imps_bank/ → economy_dev.imps_bank_performance)
SCHEMA_NAME=economy_dev python load_imps_bank.py
```

Use `SCHEMA_NAME=economy` for production runs. Each load script uses psycopg2 with upsert (INSERT...ON CONFLICT DO UPDATE).

### 3. Verify a load

```bash
tsoi data verify --schema economy_dev
```

## Current development coverage (verified 2026-09-15)

| Table | From | To | Rows |
|---|---|---|---|
| `upi_bank_statistics` | 2022-01 | 2026-08 | 5,598 |
| `upi_app_statistics` | 2022-01 | 2026-08 | 4,243 |
| `upi_p2p_p2m_statistics` | 2021-01 | 2026-08 | 68 |
| `upi_psp_statistics` | 2022-01 | 2026-08 | 1,680 |
| `upi_mcc_statistics` | 2017-01 | 2026-08 | 3,470 |
| `upi_statewise_statistics` | 2024-01 | 2026-07 | 1,142 |
| `upi_top50_vol_val_statistics` | 2021-01 | 2026-08 | 3,394 |
| `imps_bank_performance` | 2020-01 | 2026-08 | 3,631 |
| `payment_statistics` | 2020-06-01 | 2026-09-14 (partial) | 39,513 |

> `payment_statistics` is populated by the main RBI ETL pipeline
> (`etl/rbi/`), not by scripts in this directory. Monthly public consumers
> exclude the incomplete September tail and currently end in August 2026.
