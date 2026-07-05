# NPCI Statistics — UPI Data Pipeline

Fetches UPI ecosystem statistics from the NPCI public API and loads them into
`economy.upi_app_statistics` and `economy.upi_bank_statistics` in TimescaleDB
(or `economy_dev.*` for dev runs via `SCHEMA_NAME` env var).

## File layout

```
npci-statistics/
├── fetcher.py          # Shared HTTP + pagination utilities (imported by download scripts)
├── download_bank.py    # Fetch UPI top-50 bank data (remitter + beneficiary)
├── download_app.py     # Fetch UPI per-app statistics
├── download_p2m.py     # Fetch UPI P2P and P2M transaction statistics
├── download_psp.py     # Fetch UPI top-15 payer and payee PSP statistics
├── download_mcc.py     # Fetch UPI merchant category (MCC) statistics
├── download_statewise.py   # Fetch UPI state-wise statistics
├── download_top50_vol_val.py # Fetch UPI top-50 member banks by volume and value
├── download_imps_bank.py   # Fetch IMPS bank performance statistics
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

All scripts hit the same NPCI endpoint:
`https://www.npci.org.in/api/ecosystem-statistics/get-statistics`

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

### 1. Download new data

Run these whenever you want to pull the latest months from NPCI:

```bash
# Bank stats (remitter + beneficiary) → raw/
python download_bank.py

# App stats → raw_apps/
python download_app.py

# P2P/P2M stats → raw_p2m/
python download_p2m.py

# PSP stats (payer + payee) → raw_psp/
python download_psp.py

# MCC stats → raw_mcc/
python download_mcc.py

# State-wise stats → raw_statewise/
python download_statewise.py

# Top-50 banks by vol/val → raw_top50_vol_val/
python download_top50_vol_val.py

# IMPS bank performance → raw_imps_bank/
python download_imps_bank.py
```

All scripts skip files that already exist on disk, so re-running is safe and fast.
The `YEARS` list at the top of each file controls how far back to fetch — extend it
if you need older data.

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

### 3. Full refresh (download + load)

```bash
python download_bank.py && python load_bank.py
python download_app.py  && python load_app.py
python download_p2m.py  && python load_p2m.py
python download_psp.py  && python load_psp.py
python download_mcc.py       && python load_mcc.py
python download_statewise.py    && python load_statewise.py
python download_top50_vol_val.py && python load_top50_vol_val.py
python download_imps_bank.py     && python load_imps_bank.py
```

## Current data coverage (as of 2026-05)

| Table | From | To | Rows |
|---|---|---|---|
| `upi_bank_statistics` | 2022-01 | 2026-02 | ~5,000 |
| `upi_app_statistics` | 2022-01 | 2026-03 | ~3,790 |
| `upi_p2p_p2m_statistics` | 2021-01 | 2026-03 | 63 |
| `upi_psp_statistics` | 2022-01 | 2026-03 | 1,530 |
| `upi_mcc_statistics` | 2017-01 | 2026-03 | 3,325 |
| `upi_statewise_statistics` | 2024-01 | 2026-03 | 998 |
| `upi_top50_vol_val_statistics` | 2021-01 | 2026-02 | 3,124 |
| `imps_bank_performance` | 2020-01 | 2026-04 | 3,425 |
| `payment_statistics` (UPI) | 2021-01 | 2026-05 | ~1,949 |

> `payment_statistics` is populated by the main RBI ETL pipeline
> (`etl/rbi/`), not by scripts in this directory.
